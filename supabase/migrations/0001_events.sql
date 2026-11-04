-- The whole user state is one append-only table (architecture §5).
create table public.events (
  id          uuid primary key,                 -- client-generated: uuid v7, or deterministic for shared facts
  seq         bigint generated always as identity unique,   -- arrival order; the pull cursor
  user_id     uuid not null,
  kind        text not null,
  v           smallint not null,                -- payload schema version for this kind
  lang        text,                             -- language of the item involved; null for global events
  occurred_at timestamptz not null,             -- device clock; ordering for derive, never seq
  device_id   text not null,
  device_seq  integer not null,                 -- per-device counter, so gaps are detectable
  build       text not null,                    -- app+content build id that wrote it
  payload     jsonb not null
);

create index events_user_seq on public.events (user_id, seq);

alter table public.events enable row level security;

create policy "owners read their own events"
  on public.events for select to authenticated
  using (user_id = (select auth.uid()));

-- Clients can only read. Every write goes through push_events, so nothing bypasses its lock.
revoke all on public.events from anon, authenticated;
grant select on public.events to authenticated;

-- The only write path. The advisory lock is held until commit, so a user's seq order equals commit
-- order and a `seq > cursor` pull can't skip a row. Retries are harmless: a known id is skipped.
-- Returns the events it refused; an event that doesn't fit the table never aborts the batch.
create function public.push_events(batch jsonb)
returns table (id text, error text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  caller uuid := auth.uid();
  e jsonb;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  for e in select value from jsonb_array_elements(batch) loop
    begin
      insert into public.events (id, user_id, kind, v, lang, occurred_at, device_id, device_seq, build, payload)
      values (
        (e->>'id')::uuid, caller, e->>'kind', (e->>'v')::smallint, e->>'lang',
        (e->>'occurred_at')::timestamptz, e->>'device_id', (e->>'device_seq')::integer, e->>'build', e->'payload'
      )
      on conflict on constraint events_pkey do nothing;
    exception when data_exception or integrity_constraint_violation then
      id := e->>'id';
      error := sqlerrm;
      return next;
    end;
  end loop;
end;
$$;

revoke all on function public.push_events(jsonb) from public, anon;
grant execute on function public.push_events(jsonb) to authenticated;
