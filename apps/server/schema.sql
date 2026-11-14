-- The whole user state is one append-only table (architecture §5). No user_id: one owner on one
-- tailnet, so every row is the owner's. apps/server is the file's only writer, in WAL mode.
create table if not exists events (
  seq         integer primary key autoincrement,   -- commit order, because pushes are serialized; the pull cursor. Never reused
  id          text not null unique,                -- client-generated uuid v7, or deterministic for shared facts
  kind        text not null,
  v           integer not null,                    -- payload schema version for this kind
  lang        text,                                -- language of the item involved; null for global events
  occurred_at integer not null,                    -- device stamp in integer ms; ordering for derive, never seq
  device_id   text not null,
  device_seq  integer not null,                    -- per-device counter, so a gap is detectable
  build       text not null,                       -- app+content build id that wrote it
  payload     text not null check (json_valid(payload))
) strict;
