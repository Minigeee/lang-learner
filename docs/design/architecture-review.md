# Architecture review (adversarial)

Review of [architecture.html](architecture.html) (Proposed, 2026-11-02), judged against AGENTS.md "Code health", the research README's constraints, doc 08, and the unreviewed TDD. Section references (§n) point at the architecture doc unless marked "TDD §n". Platform claims I checked are listed under [Sources](#sources).

## TL;DR

- **The biggest hole is version skew between three things that ship separately:** the PWA shell (cached by a service worker), the language-pack runtime (bundled into the shell), and the content release (published to R2 on its own schedule). Nothing promises they match. Decision 10 (no widget migrations) makes a mismatch crash lessons. The simplest fix also removes a lot of machinery: serve content as Worker static assets and ship app plus content in one deploy.
- **The sync contract is under-specified in ways that corrupt data quietly.** Card scheduling is last-writer-wins on a phone-and-desktop setup. The watermark is undefined (event time misses late offline facts). A natural-key collision (one note per item) can wedge the outbox forever. Card state should be derived from the append-only review logs, which also makes the "facts only" invariant true.
- **The media gate as written can't serve `<audio>`.** Media elements can't send an `Authorization` header, a problem doc 05 already raised and this doc dropped. Offline media is also unspecified, which makes Phase 2's "offline included" untrue for anything built on YouTube.
- **`LanguagePack` is Mandarin-shaped.** A context-free `reading(token)`, a `wordKey(form, reading)` pair, and a character-class `isTarget()` break on Japanese (context readings, per-kanji furigana, pitch, orthographic variants) and Spanish (no readings, lemmas and inflection, Latin script that `isTarget` can't tell apart from English). The pack also has no way to receive its dictionary data, and it can't ship views.
- **"New language: no core change, no web-app change" is false as specified.** Pack widgets and item kinds need Vue views, packs may import only `@core/*`, the registry is described as both Vue-free and mapping to Vue views, and registering a pack is an app rebuild.
- **The contracts in §5 dropped load-bearing parts of the TDD:** `activityType` (category derive has no input), `estimateSec` (the session builder has no input), `refs`, `slots`, exposures, notes and cards, lesson runs, and fact voids. The definition also collapsed a discriminated union into optional fields, so invalid states can be expressed.
- **The design is over-built for one person:** 8 workspace packages plus dependency-cruiser, per-language R2 releases with a manifest swap, incremental derive with a Worker fallback, and a `tracks` table and language switcher before a second language exists.
- **The phase plan contradicts the risk table.** The ingester (the top risk, "build early") is in Phase 4, and the toy pack (the leak mitigation) is in Phase 5, after the core is written.

**Counts:** 2 Blocker, 7 Major, 10 Minor, 5 Nit.

## Findings

### Blocker

**B1. No compatibility contract between shell, pack runtime and content release.**
*Where:* §7 "Publishing content", §8, §6 change table, decision 10, §12 (widget migrations).
*What's wrong:* Content releases go to R2 and are picked up "on next open". The app shell and the `languages/zh` runtime are built into `apps/web` and deployed separately (Phase 0's "CI deploy" is never described as a flow). A service-worker PWA keeps running its old shell until the new worker activates, which on iOS standalone can take several cold starts. So three skews are possible:
1. A release that uses `timeline-picker@2` while the cached shell only has the v1 view and schema.
2. A release compiled by a newer pack build side (`wordKey`, segmentation) than the runtime that computes ids for mined words, so the two disagree on ids.
3. A release that adds a fact field the old outbox can't write.

CI also builds only "each language whose files changed", so a compiler, check-rule or pack-code change never reaches any release.
*Why it matters:* This is a missing contract at the most-crossed boundary, an unknown unknown that will show up as a lesson crashing at bedtime. It also makes decision 10 unsafe, because with no migrations an old client has no way to read new configs.
*Fix:* Make app and content one deployable. Put compiled content in the Worker's static assets and gate `/content/*` with `assets.run_worker_first: ["/content/*", "/media/*"]` (verified: route patterns are supported). One `wrangler deploy` then ships the shell, pack runtime and content atomically. The manifest carries `appBuild`, and the shell refuses (and forces an update) when it doesn't match. Rebuild all content on every deploy, since it's cheap at ~200 lessons. If R2 releases are kept anyway, the manifest needs `minShell` and `widgetVersions`, and the client must hold the old release until the shell updates.

**B2. The sync contract will corrupt or wedge state.**
*Where:* §9 "Offline and sync", Containers table (Facts DB), §4 Facts client, context diagram ("phone and desktop").
*What's wrong:*
- **Cards.** "Scheduling state for cards is last-writer-wins, keyed by review time." If the phone reviews a card offline while the desktop reviews it online, both review logs land, but the card row keeps one device's state. That state was computed from a stale prior state and no longer matches the log. Client clocks also decide "last".
- **Watermark.** "Pulls from a watermark" doesn't say which column. An offline fact written yesterday and synced today has an old event time, so an event-time watermark skips it forever on the other device.
- **Natural-key collisions.** Idempotency is per client uuid, but the TDD's `notes unique(user_id, item_id)` and `cards unique(note_id, card_type, variant)` are natural keys. Two devices that both create the note for 了 make two different uuids. The second insert fails, and the outbox has no stated failure behavior, so it retries forever (a poison message).
- **Contradiction.** The Facts DB "never holds any derived value", yet FSRS stability and due dates are derived from review logs.

*Why it matters:* This is a data-consistency hole in the one dataset that can't be regenerated, and an invariant that the doc states but the design breaks.
*Fix:*
- Make `review_logs` the truth. Each log records the rating and the chosen `due_at`, because load balancing depends on global due counts and isn't replayable.
- Derive the card's memory state by folding its logs with the pinned ts-fsrs. Doc 02 puts this at ~40k logs a year, which is cheap.
- `cards` keeps only immutable identity (note, type, variant, origin). Suspend and bury become facts.
- Give notes and cards deterministic ids: uuid v5 of `(item_id, card_type, variant)`. Insert facts with `ON CONFLICT DO NOTHING`.
- Add a server-assigned `inserted_at` (or identity `seq`) and pull on it with an overlap window, deduping by id.
- Specify outbox failure: a 4xx that isn't a conflict goes to a dead-letter list surfaced in Settings, and is never retried silently.
- Resume cursors and track settings become append-only "set" events (latest wins by server sequence). The DB then needs no UPDATE policies at all.

### Major

**M1. The media gate and offline media don't work as specified.**
*Where:* §4 Edge Worker (auth gate), §7 sequence, Phase 2 "offline included".
*What's wrong:*
- "Verifies the Supabase JWT" assumes a header, but `<audio src>` and `<img>` can't send one (doc 05 §2 said so, and offered a query token).
- JWKS verification only works if the project uses asymmetric signing keys. Only those keys are published at `/.well-known/jwks.json`, and a legacy HS256 project publishes nothing there (verified, Supabase signing-keys docs). The doc doesn't say which mode the project uses.
- Offline: the service worker caches "shell, bundle". Media isn't mentioned, and YouTube can never be offline (doc 05). A lesson starts with a native clip, so most lessons can't run offline.
- Serving cached audio from a service worker needs hand-written 206 slicing, which is fragile on iOS (reported).

*Fix:*
- Add a `POST /session` route that turns a valid Supabase JWT into a short-lived HttpOnly, `SameSite=Strict` HMAC cookie scoped to `/content` and `/media`. Media elements send it automatically.
- Pin `sub` to an `OWNER_ID` secret and check `aud=authenticated`, so an anonymous-sign-in JWT can't pass if that setting is ever turned on.
- Define offline scope precisely: reviews and R2-audio-only lessons. Fetch short clips (under 1 MB) as blobs and play them from object URLs, which avoids Range in the service worker. Mark YouTube-dependent blocks "needs connection" in the session builder.
- Card audio must come from R2 media, never YouTube spans.
- Change Phase 2's "done when" to match.

**M2. `LanguagePack` leaks Mandarin assumptions.**
*Where:* §5 "The language pack", ids.

| Contract | Japanese | Spanish |
|---|---|---|
| `reading(token): Reading` with no context | Readings depend on context (今日 kyō/konnichi, rendaku). Furigana goes over kanji runs inside a word (食べる → ruby over 食 only), so the result is a list of segments, not a string. Pitch accent changes with conjugation and phrase. | There is no reading, yet the interface makes one mandatory. |
| `wordKey(form, reading)` | One word has several spellings (分かる/わかる/解る, 行く/ゆく). JMdict identifies words by entry, not by (form, reading). | Identity is lemma plus part of speech (*vino* "wine" vs *vino* "came"). Surface forms (*habló*, *fui* → ir/ser) need lemma lookup with ambiguity. |
| `isTarget(s)` | Works (kana/kanji). | Impossible. Target text and English copy share a script, so the Language check rule family can't run. |
| `segment(s)` | Needs a large dictionary (kuromoji-class) at runtime. | Clitics and contractions (*dámelo*, *del*). |

It's no better for zh itself: `reading(token)` can't apply 不/一 sandhi or third-tone sandhi, or settle polyphones (了, 行), without the neighboring tokens. That's why the TDD has `Line.words` overrides.
- The runtime pack has no way to load data. Segmentation and `wordKey` for mined words need CC-CEDICT, which lives in the content bundle, but the interface has no `init(data)`.
- The core kind `sc` inherits the TDD's `axis: 'tone' | 'initial' | 'final'`, which is pinyin syllable structure.
- `ItemKind` is a core TS type extended by packs, so it is either a plain `string` (no checking) or a union that core must edit for each language.
- Ids don't mandate Unicode normalization: NFC vs NFD *está*, or が vs か+゛, make duplicate ids.
- SRS card types (doc 02 §3: word recognition is 汉字 → pinyin) aren't in the pack contract at all.

*Fix:*
- Move annotation to build time: `annotate(line, overrides) → Token[]`, with segments `{surface, lemmaId?, ruby?: {base, text}[], pron?: unknown}` compiled into clip lines. The runtime then only renders.
- The runtime pack becomes `createRuntime(data: PackData)`, with `PackData` shipped in the bundle. It exposes `lookup(surface, context) → WordCandidate[]` for mining, so it handles lemmas and ambiguity.
- Replace `wordKey(form, reading)` with a pack-defined `wordId(entry)`. `isTarget` becomes optional: when it's absent, the rule falls back to "target text only inside `:ex`/`:w` markup", which is checked structurally.
- `sc.axis` becomes a pack-registered string. `parseId` NFC-normalizes and rejects anything not in NFC.
- Add `cardTypes` to the pack.
- `ItemKind = string` at the type level, validated against the registered kinds at the boundary.

**M3. The package rules contradict each other and the extension claims.**
*Where:* §4 layer diagram and caption, component table, §10, §6 table.
*What's wrong:*
- Only `apps/web` may import Vue, and packs may import only `@core/*`. But packs contribute `widgets` (the tone-contour figure) and `itemKinds` with "how they render in item detail", which are Vue views. Those views must then live in `apps/web`, so Chinese code goes into the app.
- `InteractableDefinition` lives in `packages/interactables`, not core, so packs can't legally import it. The same goes for `CheckRule` and `DatasetImporter` from `content-tools`.
- The registry "maps a widget name … to its Vue view", but it sits in a Vue-free package.
- The layer diagram puts the pack between Domain and Adapters, so Domain imports packs (wrong for a plugin). Meanwhile the Content client (an Adapter) "loads the active language pack's runtime", which points upward.
- "Register the pack in `languages/index.ts`" is an app rebuild, yet the table says "Web app: no".
- `@core/*` is ambiguous: one package, or the whole scope?
- Edge kinds (`composes`, `appears_in`) and their implicit-credit weights live in core derive, and the Progress screen lists "characters … against HSK targets". Both are zh knowledge in core and in the screens.

*Fix:* Each pack gets three entry points: `build` (Node), `runtime` (pure TS), and `web` (Vue allowed, imported only by `apps/web`). Core owns every type a pack implements. The view registry lives in `apps/web` and merges pack views (the TDD §7.4 `Record<WidgetName, …>` pattern). Kinds declare their edge kinds, implicit weights and Progress grouping as data. Rewrite the §6 table to say "web app: rebuild, no code change".

**M4. The §5 contracts dropped load-bearing parts of the TDD and allow invalid states.**
*Where:* §5 "Interactables, derive rules and facts", §12.
*What's wrong:*
- `InteractableDefinition` drops `activityType(config)` and `serves`. `RULES.category` maps activity type to a Refold category, so it now has no input.
- It drops `estimateSec`, which the session builder needs to turn "15 min" into blocks. It also drops `refs` (without which the check needs widget knowledge), `slots`, `expand` (so voice and clip counts can't be checked statically), `requiresMedia` and `example`.
- It collapses the TDD's `ActivityDefinition | FigureDefinition` union into optional fields. `role: 'figure', scoring: 'items'` type-checks, and an activity with no `outputLevel` gets an undefined default.
- `scoring` loses `'none'`, so a watch-only clip stage has no scoring value.
- The writer list is "the only writers" but omits exposures (doc 08 F4 MUST; the "unseen" rules depend on them), notes and cards, lesson runs and cursors, comprehension ratings, content flags (decision 1 relies on them), mined sentences and `fact_voids`. Append-only facts with no correction path leave a mistyped watch log permanent.
- `RULES` omits `strand`, `bucket`, `activityDims` and `support`. Progress shows a bucket split.

*Why it matters:* §5 claims "everything else follows from these". An incomplete contract presented as complete is an unknown unknown.
*Fix:* Restore the TDD §7.2 union verbatim (it was the better design), restore the full writer list including `voidFact(table, id, reason)`, and restore the RULES keys. Keep §5 short by pointing to the TDD for full shapes instead of re-sketching them.

**M5. Over-built structure for one owner.**
*Where:* decision 4, §10, §12 rows 4 and 6, §7, §9 performance.
*What's wrong:*
- Eight workspace packages (core, session, interactables, srs, derive, facts, media, content-tools) plus dependency-cruiser. Each one costs a package.json, a tsconfig, build wiring and an export surface. Several are shallow: `srs` is an adapter over ts-fsrs plus one queue function, and `media` is a resolver plus two players.
- The stated benefit ("reusable by the toolchain and a Worker") works just as well with folders and a bundler. The TDD already concluded "one package with lint-enforced folders is enough".
- R2 content releases add CI credentials, upload ordering, a manifest swap, per-language release ids, and an unstated retention and GC policy (what happens to release N while an offline phone still holds it?). All of that buys independent per-language publishing, which one author doesn't need.

*Fix:*
- Structure: `apps/web`, `apps/edge`, `packages/core` (domain, everything framework-neutral, in folders), `packages/content-tools` (Node), and `languages/<lang>/{build,runtime,web}`. Enforce it with dependency-cruiser on folders.
- Content goes in Worker static assets (B1). The free plan allows 20,000 files per version and 25 MiB per file (verified), which is ample.
- R2 keeps only `media/` and `backups/`.

**M6. The phases contradict the risks, and some "done when" claims are false.**
*Where:* §14 vs §13 and §6.
*What's wrong:* §13's top risk says "build the ingester early", but the ingester is Phase 4. The toy pack is "how a Chinese assumption can't creep in", but it lands in Phase 5, after Phases 0–4 have written the core. Phase 1's "3 reference lessons" need lesson-eligible clips with automatic transcripts, which means ingestion has to exist by then. Phase 2's "offline included" conflicts with M1.
*Fix:* Phase 0 adds a Latin-script, reading-less toy pack, which is the cheapest test that catches M2. Phase 1 adds a minimal ingester for Common Voice and audio-cmn (sentence- and word-level clips need no ASR alignment), enough to feed the reference lessons. The alignment and ASR validator stay in Phase 4.

**M7. GitHub Actions is assumed free, but the repo must be private.**
*Where:* §8 deployment table, open question 2, decision 5.
*What's wrong:* Decision 5 keeps content private because of transcripts and NC excerpts, but those live in git. A public repo makes the R2 gate pointless. A private repo gets $12 a month of compute, about 2,000 Linux 2-core minutes (verified).
- CI per push (pnpm install, check, build, deploy) costs about 2–4 minutes, and authoring sprints push often.
- CPU ASR on a 2-core runner is about real time or slower for useful whisper models (reported), so ingesting tens of hours of audio would use up the month. "Free either way" is wrong for Actions.
- The 60-day disabling of scheduled workflows applies to public repos only (verified), so the claim in doc 05 doesn't apply here.

*Fix:* State that the repo is private. Run ASR on the dev machine and commit its outputs (the ingest manifest). Use path filters and caching in CI. Run the weekly `pg_dump` in Actions through the Supabase **session pooler**, because direct connections are IPv6-only without the paid add-on and GitHub runners are IPv4-only (verified). Match `pg_dump` to the server's major version.

### Minor

**m1. Derive caching is keyed in a way that defeats itself.** "Derived caches are keyed by rule version and content release" means every publish throws away every cache, so "incremental from a watermark" almost never applies during authoring. Mastery and streaks also depend on order, so a late offline fact invalidates incremental state anyway. *Fix:* drop incremental derive and the Worker fallback (§9, §13). Do a full recompute. Doc 02 and the TDD estimate ~110k facts a year, which takes milliseconds in JS. Cache by `(fact high-water seq, rule versions, release)`, and measure before optimizing anything.

**m2. The Pedagogy rule conflates Refold phase and stage.** "Output level ≤ 1 in Phases 0–2" is a build-time check keyed on learner state. Doc 08 F3 says "never derive one from another in code", and the TDD's STR004 keys it on stage. `tracks` also stores "phase", which is derived from doc 01's gates. *Fix:* key the check on stage or template, store only a user override for phase, and derive the rest. The `outputLevel` comment "until Phase 4" is ambiguous between Refold Phase 4 and build Phase 4.

**m3. Redirect semantics were dropped.** §6 relies on redirects but loses the TDD §8.5 rules: a split caps inherited evidence at Familiar, and chains are forbidden. Old facts persist forever, so redirects must too. The TDD cleanup (`rewrite-ids.ts` updating user tables) breaks append-only and the insert-only RLS. *Fix:* keep redirects permanent and cumulative, and cut the rewrite step.

**m4. The `lang` denormalization is inconsistent.** A `lang` column appears on sessions, cards and logs, but not on trials, claims or exposures. *Fix:* `lang text generated always as (split_part(item_id, ':', 1)) stored` on every id-bearing table, and update the TDD's `knowledge_id` domain regex, which hard-codes `w|c|cmp|g|sc|sr`.

**m5. The Worker has no caching rules.** Gated responses need `Cache-Control: private, immutable` (or `no-store` for the manifest), and the auth check has to run before any Cache API lookup. As written, "long cache headers" covers the manifest too, so a cached manifest would hide new releases.

**m6. YouTube Error 153.** Since 2025, embeds fail with error 153 when the page suppresses the Referer, for example through a hardened `Referrer-Policy: no-referrer` (reported, multiple sources). *Fix:* the Worker sends `strict-origin-when-cross-origin`, and the media adapter treats 153 like 100/101/150.

**m7. There is no Background Sync on iOS** (verified, caniuse). The outbox flushes only while the app is open. *Fix:* flush on `visibilitychange`, on `online` and on launch. Call `navigator.storage.persist()`. Show the pending count in Settings.

**m8. The sequence diagram is network-first.** Steps 3–6 (token refresh, manifest, fact pull) run before the session is built, so a cold Supabase or a bad connection blocks bedtime. *Fix:* build the session from local state first and sync in the background.

**m9. "Every fact records the release" is noise for reviews and watch logs.** The TDD's `lesson_hash` on spans, runs and claims is more precise. *Fix:* record `lesson_hash` and `widget@version` where a lesson is involved, and nothing elsewhere.

**m10. Templates are split across `content/<lang>/templates` and `content/shared/templates`** with no precedence rule. Pick one, either "lang overrides shared by name" or "no overlap allowed (check error)".

### Nit

- **n1.** `Lang = 'zh'` with "simplified by default" mixes language with script. Decide now whether Taiwan Mandarin would be a display variant of `zh` or a separate track (README open decision 1), because ids depend on it.
- **n2.** The Worker "Shell route" is unnecessary: static assets serve the shell without Worker code. Use `not_found_handling: "single-page-application"`.
- **n3.** Zod schemas in a registry that `apps/web` imports ship Zod to the client. The TDD said build-time only, and the shell budget is 200 KB. Strip the schemas out of the runtime entry. Cytoscape also needs lazy loading.
- **n4.** CJK fonts from Google Fonts won't be available offline unless the service worker caches the unicode-range slices. Consider self-hosting the serif and using PingFang or the system font for body text.
- **n5.** §12 says the TDD bundle was "served with the app", but TDD §8.3 already put it behind the Worker gate. The real departure is "R2 vs Worker assets", and this review recommends reverting it.

## What to cut or defer

1. **Cut** the 8-package workspace. Use 2 packages plus folders and dependency-cruiser (M5).
2. **Cut** R2 content releases, the manifest swap and per-language release ids. Use Worker static assets and one atomic deploy (B1, M5).
3. **Cut** incremental derive, watermarks for derive, and the Worker-derive fallback. Do a full recompute (m1).
4. **Cut** mutable card scheduling columns and last-writer-wins. Fold them from review logs (B2).
5. **Cut** "release on every fact" (m9) and the "Shell route" (n2).
6. **Defer** pack `widgets`, `display.scripts`, the language switcher UI, `tracks` beyond a lang-keyed settings event, and per-pack `mediaSources` until language #2 exists. Keep the `lang:` id prefix and the pack seam now, because ids are expensive to change later.
7. **Defer** ASR alignment until a source needs sub-clip timing. Common Voice and audio-cmn don't (M6).
8. **Move earlier** (not cut): the toy pack to Phase 0, and a minimal ingester to Phase 1.

## What is good and should be kept

- Knowledge items as the spine, facts only in Postgres, and versioned pure derive rules (doc 08 F1/F2). The fixes above make this invariant true rather than weaken it.
- Language-prefixed ids and a single pack seam. The seam is the right boundary even though its contents need rework (M2).
- A thin Worker gate, private media, the Cloudflare plus Supabase stack and the keep-alive cron.
- Content in git with a strict, line-precise checker, plus a license record that fails the build when it's missing.
- Hash-named compiled lesson files, so clients fetch only what changed.
- The media ingester's quarantine-not-hand-fix stance, a direct answer to "no manual curation".
- The §6 change table. Turn it into a test checklist that a second-language stub has to pass.
- §12's explicit list of departures, which is what made this review possible.

## Open questions only the owner can answer

1. **Is the repo private?** This decides whether decision 5's privacy rationale holds and what the CI budget is (M7).
2. **Do you actually study on two devices on the same day?** If not, B2's multi-device cases are rarer, though the outbox and natural-key problems remain.
3. **How soon, and which, second language?** If it's years out, extract the pack interface when it arrives ("rule of three") and keep only the id prefix and the folder seam now. If it's soon, build a 2-lesson Spanish stub early, since Spanish breaks the most assumptions.
4. **Is retroactive recompute acceptable for streaks and XP?** A rule change could break a past streak or change last month's XP.
5. **Which sessions must work offline:** reviews only, or lessons too? This sets the media and caching scope (M1).
6. **Card on file for R2 (README decision 8)?** If not, B2 storage behind the same Worker gate is the fallback for media and backups.
7. **Traditional or Taiwan Mandarin:** a display variant of `zh` or a separate track (n1)?

## Sources

Checked 2026-11-02.

- Cloudflare Workers static assets binding, `run_worker_first` route patterns: https://developers.cloudflare.com/workers/static-assets/binding/ (verified)
- Cloudflare Workers limits (Free: 100k requests/day, 10 ms CPU, 5 cron triggers, 20,000 asset files, 25 MiB per file): https://developers.cloudflare.com/workers/platform/limits/ (verified)
- Supabase JWT signing keys and JWKS endpoint (only asymmetric keys are published): https://supabase.com/docs/guides/auth/signing-keys (verified); whether new projects default to asymmetric keys is not stated (unverified)
- Supabase IPv4/IPv6 compatibility; GitHub Actions needs the session pooler: https://supabase.com/docs/guides/troubleshooting/supabase--your-network-ipv4-and-ipv6-compatibility-cHe3BP (verified via search)
- Supabase project pausing ("sufficient user database activity"): https://supabase.com/docs/guides/platform/project-pausing (verified)
- GitHub Actions billing ($12 of included compute, about 2,000 Linux minutes; public repos free): https://docs.github.com/en/billing/concepts/product-billing/github-actions (verified)
- GitHub: scheduled workflows disabled after 60 days only in public repos: https://docs.github.com/en/actions/how-tos/manage-workflow-runs/disable-and-enable-workflows (verified)
- Background Sync not supported in Safari or iOS: https://caniuse.com/background-sync and WebKit bug 201866 (verified)
- YouTube embed error 153 and Referrer-Policy: https://simonwillison.net/2025/Dec/1/youtube-embed-153-error/ (reported)

## Dispositions (architecture revision 2, 2026-11-02)

The owner answered the open questions:
- the repo is private;
- the phone and laptop are both used daily;
- no second language soon, but the core stays language-agnostic;
- past streaks and XP must never change;
- internet is assumed, but local caching and sync should be planned for;
- a card on file is fine, with a ceiling of about $10 a month and as few services as possible;
- simplified Mandarin only;
- content pipelines run on the owner's laptop (RTX 2070).

The owner also asked for a Supabase-centered stack plus a plain static host. That choice resolves several findings by removing the Worker entirely.

| Finding | Disposition |
|---|---|
| B1 No compatibility contract | **Fixed.** Each app build embeds a build id that pins one content manifest in the private Supabase bucket. CI uploads hash-named content files and the manifest **before** deploying the app to Pages, and old manifests are kept. A live app always finds exactly its own content, and the content stays private (revision 2.1, owner's choice over a public bundle). |
| B2 Sync corrupts or wedges state | **Fixed.** One append-only `events` table with a server `seq` pull cursor and `insert … on conflict do nothing`. Card state is rebuilt by replaying reviews, with fuzz seeded from `(cardId, reviewedAt)`. Card and day-close ids are deterministic. Rejected events go to a dead-letter list. |
| M1 Media gate, offline media | **Fixed.** No gate. Clips are short (60 s or less) and downloaded whole from private Supabase Storage with the session token, then cached as blobs. Offline scope is explicit: reviews and hosted audio work, YouTube needs the network. |
| M2 LanguagePack is Mandarin-shaped | **Fixed.** Context-aware `analyze()`, `itemKey(entry)` per dictionary entry, explicit markup instead of `isTarget()`, a lexicon in the build half, `cardTemplates` and `soundAxes` on the pack, NFC in the id grammar. |
| M3 Package rules contradict the extension claims | **Fixed.** Packs split into logic, build and views, with corrected dependency rules. The claim is now honest: adding a language takes one registration line in the app. |
| M4 §5 dropped TDD contracts | **Fixed.** `ActivityDefinition` and `FigureDefinition` as a discriminated union with `activityType`, `slots`, `expand`, `refs`, `estimateSec`; one `Event` union covering every kind. |
| M5 Over-built | **Accepted.** Two packages and one app; no Worker; the language switcher, tracks table, widget migrations and incremental derive are deferred. |
| M6 Phases vs risks | **Fixed.** The ingester spike and the toy pack move to phase 0. "Offline included" is replaced by a two-device interleaving test. |
| M7 Actions not free for a private repo | **Fixed.** Speech-to-text runs on the laptop GPU; Actions handles only CI and the weekly ping and dump. |
| m1 Derive caching | **Accepted.** Full recompute with a cache; measure first. |
| m2 Phase vs stage | **Accepted.** The output-level check is keyed on stage or template. |
| m3 Redirects | **Accepted.** Permanent and chain-free; no rewriting of history. |
| m4 `lang` denormalization | **Resolved.** A single `lang` column on the one events table. |
| m5 Worker caching | **Moot.** There is no Worker. |
| m6 YouTube error 153 | **Accepted.** A `strict-origin-when-cross-origin` referrer policy; 153 is treated as an unavailable embed. |
| m7 No Background Sync on iOS | **Accepted.** The outbox flushes on launch, `visibilitychange` and `online`, and `storage.persist()` is requested. |
| m8 Network-first sequence | **Fixed.** The session is planned from local state; sync runs in the background. |
| m9 Release on every fact | **Accepted.** `build` on every event (cheap), plus `lessonHash` and `widget@version` where a lesson is involved. |
| m10 Template precedence | **Accepted.** A language's template overrides a shared one by name. |
| n1 Language vs script | **Accepted.** `zh` is a language, and script is a display setting; simplified only for now. |
| n2 Shell route | **Moot.** Plain static hosting. |
| n3 Zod and Cytoscape in the shell | **Accepted.** Zod is build-time only; Cytoscape is lazy-loaded. |
| n4 Offline CJK fonts | **Accepted.** Self-hosted subsets cached by the service worker. |
| n5 §12 wording | **Moot.** §13 is rewritten. |
