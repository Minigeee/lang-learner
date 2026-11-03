# 05: Infra & licensing

Free-tier hosting, auth, database and media storage for a single-user app, and which content we can legally store and serve behind a login.

> **Checked on 2026-11-02** against the vendors' pricing and docs pages listed in [Sources](#sources). Free tiers change often, so re-check anything marked (verified) before relying on it a year from now. Nothing here is legal advice. The licensing section is a set of risk tiers, not a legal opinion.
>
> **Usage assumption (from the user):** bedtime use is screen-on, about 15 minutes of flashcards or a 5–10 minute video lesson on the phone. Playing audio with the screen locked is **not** a requirement.

## TL;DR

- **Recommended $0 stack:** Supabase Free (Postgres + Auth) for progress, Cloudflare R2 for media (10 GB free, zero egress), and Cloudflare Workers / Pages for the frontend, plus a small Worker that checks the login before serving media. Total: $0/month.
- **Biggest operational risk is Supabase pausing.** A Free project pauses after about 7 days of low database activity [1][3] and has no automatic backups [1]. Daily use plus a daily cron ping prevents the pause. A weekly `pg_dump` covers backups. A paused project can be resumed within 1 year [3].
- **R2 needs a payment method on file** even for the free tier (reported [48]). Set a billing alert and stay on the Standard storage class, the only one the free tier covers [14]. If the user won't add a card, Backblaze B2 (10 GB) [17] or Supabase Storage (1 GB) [1] are the fallbacks.
- **Phone login UX:** sign in with the Supabase email **OTP code**, not the magic link, so login works inside the installed home-screen app. Sessions refresh automatically, so the user should rarely see the login screen.
- **Lock auth to the owner:** create the owner account, then turn off "Allow new users to sign up" [4]. Every table also gets RLS on `auth.uid()`.
- **YouTube embeds on mobile:** use the IFrame API with `playsinline=1` (otherwise iOS plays fullscreen), `cc_load_policy=1` plus `cc_lang_pref`, and `enablejsapi=1&origin=…` [32]. The API has no time-update event, so subtitle sync means polling `getCurrentTime()` [33]. Draw our own subtitles **below** the player, never over it [35].
- **Frontend host:** Cloudflare serves static assets free and unlimited [26]. Vercel Hobby is fine but restricted to non-commercial personal use [22]. Netlify Free pauses every site once its credits run out [28].
- **Licensing rule of thumb:** embedding YouTube and linking are fine. CC0, CC-BY and CC-BY-SA material can be stored and served with attribution. Downloading YouTube, or rehosting copyrighted media for anyone else, is out [35][36]. Always show credits; it's cheap.

## Findings

### 1. Database + auth

#### Supabase Free (verified [1][2][3])

| Limit | Free | Pro ($25/mo) |
|---|---|---|
| Database size | 500 MB per project | 8 GB, then $0.125/GB |
| Egress | 5 GB uncached + 5 GB cached | 250 GB + 250 GB |
| Auth MAU | 50,000 | 100,000 |
| File storage | 1 GB, max 50 MB per file | 100 GB |
| Active projects | 2 (paused ones don't count) | n/a |
| Backups | **none** | 7 days of daily backups |
| Pausing | after ~1 week of low activity | never |

- **Pausing [3]:**
  - A project counts as inactive when it doesn't get "enough user database activity" over the past week. A few requests a day is usually enough.
  - The owner gets an email warning about a week before the pause.
  - Resume from the dashboard within **1 year**. Older copies of the page said 90 days, so the window has changed before.
  - Pro never pauses [2].
- **How to avoid pausing:**
  - Daily flashcard reviews write rows, which should be enough on their own.
  - As a safety net, run a Cloudflare Worker Cron Trigger daily that calls a trivial RPC. Workers Free includes cron triggers [25].
  - A GitHub Actions cron also works, but GitHub disables scheduled workflows in inactive repos after 60 days (reported), so the Worker is more reliable.
- **Size check (our estimate):** CC-CEDICT (~120k entries) plus the Mandarin–English subset of Tatoeba plus SRS history should fit well under 500 MB. Media must not go in Postgres.

#### Alternatives

| Option | Free tier highlights | Sleep / pause | Auth | Card | Fit |
|---|---|---|---|---|---|
| **Supabase** [1] | 500 MB Postgres, 1 GB files, 5 GB egress | Pauses after 7 days idle | Email OTP/link, OAuth, passkeys (beta) | No (reported) | **Best:** DB, auth and RLS in one place |
| **Neon** [8] | 1 GB per project, 100 CU-hours, 5 GB egress, 5 GB object storage, Neon Auth 60k MAU | Scales to zero after 5 min, then a cold start; no long-term pause | Yes | No | Runner-up |
| **Turso** [9] | 5 GB, 500M rows read, 10M rows written | Not stated | No | No | Needs a separate auth service |
| **Firebase Spark** [10] | Firestore 1 GiB, 50k reads / 20k writes per day, Auth 50k MAU | No | Yes | No | Cloud Storage needs the paid Blaze plan; NoSQL fits SRS queries poorly |
| **Convex** [11] | 0.5 GB DB, 1 GB files, **1 GB file egress/month**, hard caps | Not stated | Yes | No (reported) | Too little egress for media |
| **Appwrite Cloud** [12] | 2 projects; ~5 GB bandwidth, 2 GB storage (reported) | Paused after 1 week idle (reported) | Yes | Unclear | Smaller Supabase; goes read-only at its limit |
| **PocketBase** [13] | MIT; PocketHost's free tier is unclear; otherwise a ~$5/mo VPS (reported) | Depends on host | Yes | Depends | "Free host" is the weak link |

**Verdict:** Supabase Free is the simplest and safest for one user. Neon plus a separate auth service is the fallback.

#### Auth: phone-friendly and locked to the owner

- **Login method:**
  - Use the email **OTP code**: the user types a 6-digit code into the app.
  - A magic link tapped in Mail opens Safari. On iOS a home-screen web app has storage separate from Safari, so the link logs in the wrong context (reported, widely observed).
  - Optionally add Google or GitHub OAuth.
  - Passkeys arrived in Supabase as a **beta** in May 2026 and are documented as experimental [6]. They would be the nicest phone UX (Face ID), but add them only as an extra option.
- **Session lifetime:** supabase-js keeps the session in local storage and refreshes the access token automatically (reported, the default behavior). The user should only log in once per device.
  - Safari *tab* storage is wiped after 7 days without a visit; home-screen apps are exempt [38]. Daily use or installing the app avoids surprise logouts.
- **Email limits:** Supabase's built-in SMTP is heavily rate-limited (reported). That's fine for one user. Add custom SMTP if codes stop arriving.
- **Lock-down steps:**
  1. Create the owner account in the dashboard ("Add user") or by signing up once.
  2. Turn off **Allow new users to sign up**, after which "only existing users can sign in" [4] (verified).
  3. Call `signInWithOtp({ email, options: { shouldCreateUser: false } })` (reported, standard option).
  4. Optional: a **before-user-created** hook can reject emails not on an allowlist [5]. The docs example checks domains; change it to exact emails.
  5. **RLS on every table**, `using (user_id = auth.uid())`. Never ship the `service_role` key to the browser.
- **Optional outer gate:** Cloudflare Zero Trust Access is free for under 50 users and can put an email-PIN gate in front of the whole site [31] (reported). It's probably overkill.

### 2. Media storage / CDN

| Service | Free storage | Free egress | Ops | Card | Notes |
|---|---|---|---|---|---|
| **Cloudflare R2** [14] | 10 GB-month (Standard only) | **Free, unlimited** | 1M Class A, 10M Class B per month | **Payment method required** (reported [48]) | Best fit |
| **Supabase Storage** [1] | 1 GB, max 50 MB per file | Shares the 5 GB uncached egress | n/a | No | Same auth as the DB; small |
| **Backblaze B2** [17] | 10 GB | 3× stored data per month; free via Cloudflare/Bunny | Class D: 2,500 per day free | Not stated | No-card fallback / overflow |
| **Bunny** [18] | none (14-day trial) | from $0.002/GB | no API fees | No for the trial | $1/month minimum |
| **Cloudinary** [19] | 25 credits/month in total (1 credit = 1 GB storage **or** 1 GB bandwidth **or** 1k transforms) | in those credits | n/a | No | Image/video transform tool; not generous for audio |
| **ImageKit** [20] | 3 GB | 20 GB/month | 500 video units | Not stated | Image-focused |
| **Git LFS** [21] | 10 GiB | 10 GiB/month | n/a | No | **Avoid:** disabled for the month once over quota; not a CDN; Pages sites are public [29] |

**Size math (our estimate):** speech audio at 64 kbps is about 29 MB per hour, so R2's 10 GB holds roughly 350 hours of clips and podcasts. Video lessons stay on YouTube embeds, so they cost no storage at all.

**Serving media privately:**
- **Supabase:** private buckets with `createSignedUrl(path, expiresIn)` or the `/object/authenticated/` endpoint [7]. You can't revoke a single signed URL, and CDN copies may linger [7]. Range support isn't documented, so test it.
- **R2 presigned URLs:** 1 s to 7 days, **S3 endpoint only, not custom domains**, and they need bucket CORS [15].
- **Recommended:** a private R2 bucket behind a `/media/*` Worker on our domain. The Worker:
  1. checks the Supabase JWT, or a short-lived HMAC token in the query string, since `<audio src>` can't send headers;
  2. calls `env.BUCKET.get(key, { range: request.headers })` [16];
  3. returns `206` with `Content-Range` and `Accept-Ranges`.

  Range support matters because browsers use it to seek and to find the duration of `<audio>`/`<video>`. A plain `200` breaks scrubbing, especially on iOS (reported).

### 3. Hosting the frontend

| Host | Free limits relevant to us | Terms gotcha |
|---|---|---|
| **Cloudflare Workers / Pages** [24][25][26] | Static asset requests free and unlimited; 100k Worker requests/day, 10 ms CPU each; 20k files, 25 MiB per file; Pages: 500 builds/month | None for personal use. Keep media out of static assets (public, 25 MiB cap) |
| **Vercel Hobby** [22][23] | 100 GB transfer, 1M function invocations, 4 h active CPU per month; 100 deploys/day | **Non-commercial personal use only** [22]: no ads, payments or paid work. Can't connect to Git repos owned by organizations [23] |
| **Netlify Free** [27][28] | 300 credits/month, hard cap: a deploy costs 15, 1 GB of bandwidth costs 20 | When credits run out, **all sites pause** until the reset [28] |
| **GitHub Pages** [29][30] | 1 GB site, 100 GB/month soft bandwidth | Needs a public repo on Free; no server code |

**Verdict:** Cloudflare, because the frontend, the media Worker, the cron ping and R2 all live in one account. Vercel Hobby is an equally good frontend host if we use Next.js.

### 4. Mobile: YouTube embeds and the phone experience

#### Making YouTube lessons work well on a phone (verified [32][33])

- **Player parameters [32]:**
  - `playsinline=1`: without it, iOS plays the video fullscreen, and fullscreen is still the iOS default.
  - `enablejsapi=1&origin=https://our.domain`: needed for API control.
  - `cc_load_policy=1` with `cc_lang_pref=zh-Hans` (or `zh-CN`/`zh-TW`): show Chinese captions by default. Without `cc_load_policy=1`, the preferred language applies only when the user turns captions on.
  - `hl=`: sets the interface language.
  - `start` / `end`: bound a lesson segment. `start` snaps to a keyframe, so it can begin up to ~2 s early.
  - `rel=0`: related videos only from the same channel (they can't be disabled entirely).
  - `iv_load_policy=3`: hide annotations.
- **Autoplay:** browsers block unmuted autoplay. Start playback from a tap, and handle the `onAutoplayBlocked` event [33].
- **Size:** the player must be at least 200×200 px, and ≥480×270 is recommended for 16:9 [33]. Use a responsive 16:9 container at full phone width.
- **Timing hooks for subtitle sync [33]:**
  - There is **no time-update event**. Poll `getCurrentTime()` every ~200–250 ms (or on `requestAnimationFrame`) while `onStateChange` reports `PLAYING` (1). Stop polling on `PAUSED` (2), `ENDED` (0) or `BUFFERING` (3).
  - `seekTo(t, true)` gives "replay this line" and tap-to-seek on a transcript line.
  - `setPlaybackRate()` gives 0.75× for hard lessons. Check `getAvailablePlaybackRates()` first and confirm the change through `onPlaybackRateChange`. Loading a new video resets the rate to 1.
- **Caption options [33]:** the documented options are `captions.fontSize` (-1 to 3) and `captions.reload`, read after `onApiChange`. Switching the caption track from JavaScript is a common community trick but isn't documented (reported). Prefer the `cc_lang_pref` parameter.
- **Where subtitle text comes from:**
  - We **cannot** pull other people's caption files through the official API. `captions.download` needs OAuth and edit permission on the video, and costs 200 quota units per call [34].
  - Options: YouTube's own in-player captions (zero effort), or our own timed transcript, either written by us or from CC-licensed sources. Store it as cues `{start, end, hanzi, pinyin, gloss}` and highlight the current cue from the poll loop.
- **Layout rule:** render our interactive subtitles **below or beside** the player, not overlaid on it. The policies forbid modifying or obscuring the player or its attribution (I.6, III.F.2.c) [35].
- **Login gating is OK:** the policies allow login when it's part of the app's normal function (III.F.3.b) [35].

#### Installability and offline (COULD)

- Add a web manifest and service worker for home-screen install. On iOS this also exempts storage from Safari's 7-day wipe [38].
- WebKit allows up to ~60% of disk per origin, with best-effort eviction unless `navigator.storage.persist()` is granted [37].
- Flashcard data and short audio clips are tiny, so offline flashcards are cheap to add later. Video can't be cached offline: YouTube policy forbids it [35].

#### Not needed now: screen-locked playback

Not needed now that bedtime use is screen-on, but for reference:
- `<audio>` plus the Media Session API gives lock-screen controls and keeps playing with the screen off on Android [39].
- On iOS this is fragile in home-screen apps (reported). A sleep timer would need to run off the media timeline.
- YouTube can never do it: background play, downloading and audio extraction are prohibited [35][36].

Revisit only if passive-listening sessions come back as a requirement.

### 5. Content licensing for a private-but-public-URL app

**Is a login-gated personal app "public distribution"?**
- **CC 4.0 licenses:** the conditions (attribution, ShareAlike) apply "if You Share", and Share means providing material "to the public" [43] (verified). An app used only by its owner arguably shares nothing, and adding users weakens that argument.
- **Non-CC copyrighted works:** making a copy is the regulated act whether or not it's public. A login reduces exposure, but it is **not a license**, and private-copy exceptions vary by country (reported).
- **Practical stance:** meet CC obligations as if the app were public, since that's cheap. Keep any personal convenience copies strictly single-user.

| Content | License / terms | What we may do | Obligations |
|---|---|---|---|
| **YouTube** | ToS + API policies [35][36] | Embed via the IFrame player; store video IDs, timestamps, our own transcripts, notes, cards | No download, no audio extraction, no offline, no background player, don't obscure the player |
| **Tatoeba sentences** | CC BY 2.0 FR default; some CC0 [40] | Store and display | Credit the author and link the sentence; keep the license with the content |
| **Tatoeba audio** | **Per recording**; BY baseline, some with no-marketing, no-modification or share-alike conditions [40] | Store and serve the recordings whose license allows it | Store the license per clip; don't trim or normalize no-modification clips; credit the speaker |
| **Common Voice** | CC0; download terms forbid identifying speakers, and some datasheets forbid re-hosting the dataset [41] | Use clips privately | Don't publish a mirror; credit it anyway |
| **CC-CEDICT** | CC BY-SA 4.0 [42] | Store, query, display | Attribution [42]. ShareAlike applies only if we *share* modified entries [42][43]. App code and SRS data are unaffected. Keep edits in an overlay table |
| **Make Me a Hanzi** | `dictionary.txt`: LGPL; `graphics.txt`/SVGs: Arphic PL [44] | Use stroke and decomposition data | Keep the license files; changes stay under the same license |
| **Hanzi Writer data** | Arphic PL [45]; the library is MIT (reported) | Use as is | Keep `ARPHICPL.TXT` unaltered; mark modified files [45] |
| **Podcasts (RSS)** | Copyright stays with the podcaster; a public feed is not a blanket license [46][47] | Stream from the publisher's enclosure URL; download on-device | Don't rehost publicly; mirroring a catalog has drawn takedowns [47] |

**Risk tiers (not legal advice):**

- **Tier 0, green:**
  - YouTube via the official embed.
  - Links.
  - CC0, CC-BY and CC-BY-SA material with attribution.
  - Our own recordings, transcripts and notes.
  - Metadata: video IDs, timestamps.
- **Tier 1, low:**
  - Streaming podcasts from the publisher's URL.
  - On-device caching of episodes.
  - Storing Tatoeba audio whose license permits it.
- **Tier 2, moderate (single user, private bucket only):** copying podcast episodes into R2 to cut clips for flashcards. This is commonly tolerated, but no source confirms it's legal everywhere [46]. Re-evaluate before adding a second user.
- **Tier 3, don't:**
  - Rip YouTube audio or video, for any reason [35][36].
  - Make the media bucket public.
  - Rehost copyrighted media to others.
  - Redistribute Common Voice.

### 6. Recommended stack ($0/month)

| Layer | Choice | Free allowance | Upgrade path |
|---|---|---|---|
| Frontend | Cloudflare Workers static assets (or Pages) | Unlimited static requests [26] | Workers Paid ~$5/mo (reported) if dynamic requests pass 100k/day |
| DB + Auth | Supabase Free: Postgres, email OTP, RLS | 500 MB, 50k MAU, 5 GB egress [1] | Supabase Pro $25/mo: no pausing, backups [1]; or Neon Free [8] |
| Keep-alive and backups | Worker cron: daily ping; weekly `pg_dump` to R2 (GitHub Action or local script) | free | n/a |
| Media (audio clips, podcasts, images) | Private R2 behind a `/media/*` Worker (JWT check + Range) | 10 GB, free egress [14] | $0.015/GB-month (50 GB ≈ $0.60/mo) [14]; or B2 [17] |
| Video lessons | YouTube IFrame embeds | n/a | n/a |

**Gotchas, ranked for the actual use case:**

1. **Supabase pausing and no backups.** The project pauses after ~7 idle days [3] (resumable for 1 year) and Free has no backups [1]. A week of travel without using the app would pause it. Use the cron ping and our own weekly dump, and watch for the warning email. Uploads are also capped at 50 MB per file [1], so long files go to R2.
2. **R2 needs a card on file** (reported [48]). The free tier covers only Standard storage [14], so never pick Infrequent Access. Set a billing alert at $1. Without a card, fall back to B2 or Supabase Storage.
3. **Phone login UX.** Use the OTP code, not the magic link. Install the app to the home screen, or Safari's 7-day storage wipe [38] can log the user out. Keep sessions refreshing automatically. Supabase's default SMTP rate limit can delay codes.
4. **YouTube on mobile.**
   - Forgetting `playsinline=1` means fullscreen-only on iOS [32].
   - Unmuted autoplay is blocked, so start from a tap [33].
   - Subtitle sync needs a `getCurrentTime()` poll loop [33].
   - Others' caption files can't be fetched through the API [34].
   - Our subtitles must sit outside the player, not over it [35].
5. **Host terms.** Vercel Hobby is non-commercial only [22]. Netlify Free pauses sites at the credit cap [28]. R2 presigned URLs don't work on custom domains [15].

## Implications for the app

- **MUST** use Supabase Auth with signups disabled after the owner account exists [4], `shouldCreateUser: false`, and RLS (`user_id = auth.uid()`) on every table. The `service_role` key never reaches the client.
- **MUST** use the email OTP code as the primary login, so it works inside the installed iOS web app.
- **MUST** run a daily keep-alive ping and a weekly database dump, because Supabase Free pauses and has no backups [1][3].
- **MUST** keep media in a **private** bucket and serve it through an authenticated endpoint that supports HTTP Range (`206`, `Content-Range`).
- **MUST** embed YouTube with `playsinline=1`, `enablejsapi=1`, `origin`, and start playback from a user tap [32][33].
- **MUST NOT** download, cache, extract audio from, or overlay the YouTube player [35][36].
- **MUST** store license, author and source URL per content item, and render a credit line plus a Credits page linking CC BY 2.0 FR, CC BY-SA 4.0, LGPL, Arphic PL and CC0 [40][42][43][44][45]. Keep the Arphic and LGPL license files with the bundled data.
- **SHOULD** build subtitle sync as a ~250 ms `getCurrentTime()` poll driven by `onStateChange`, with cues stored as `{start, end, hanzi, pinyin, gloss}`, and tap-to-seek via `seekTo` [33].
- **SHOULD** default to Chinese captions with `cc_load_policy=1&cc_lang_pref=zh-Hans`, and offer a 0.75× speed button when `getAvailablePlaybackRates()` allows it [32][33].
- **SHOULD** use a responsive 16:9 player at full phone width (≥200×200 px minimum) with our subtitle panel below it [33][35].
- **SHOULD** ship a web manifest so the app installs to the home screen. That gives a full-screen phone UX and persistent login storage on iOS [38].
- **SHOULD** keep our CC-CEDICT edits in a separate overlay table [42][43], and store each Tatoeba audio clip's license, excluding no-modification clips from processing [40].
- **COULD** cache flashcard data and short audio clips offline via the service worker [37].
- **COULD** add passkeys (beta) as a second sign-in option [6], or Cloudflare Zero Trust Access as an outer gate [31].

## Open questions

1. **Card on file:** is the user OK adding a card to Cloudflare for R2 [48]? If not, use B2 [17] or Supabase Storage [1].
2. **Caption source:** are YouTube's in-player Chinese captions enough, or do we want our own timed transcripts with pinyin and glosses? The second is more work, and the text must be ours or CC-licensed [34].
3. **Second user:** adding one would move Tier 2 podcast copies toward "sharing", and we'd need to re-check Common Voice's no-re-hosting term [41].
4. **Jurisdiction:** private-copy rules differ by country. This only matters for Tier 2.
5. **Supabase Storage Range support** isn't documented [7]. Verify it if we keep any audio there.
6. **Appwrite and PocketHost limits** couldn't be confirmed on official pricing pages (both reported). They only matter if we leave Supabase.

## Sources

All checked 2026-11-02 unless marked otherwise.

1. Supabase Pricing: https://supabase.com/pricing (Free/Pro quotas, pausing, no backups on Free, 50 MB upload limit) (verified)
2. Supabase "About billing on the Free plan": https://supabase.com/docs/guides/platform/free-plan (2 free projects, paused projects don't count, Pro doesn't pause) (verified)
3. Supabase "Project Pausing": https://supabase.com/docs/guides/platform/project-pausing (inactivity definition, warning email, 1-year restore window) (verified)
4. Supabase Auth general configuration: https://supabase.com/docs/guides/auth/general-configuration ("Allow new users to sign up" toggle) (verified)
5. Supabase before-user-created hook: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook (reject signups, allowlist example) (verified)
6. Supabase passkeys: https://supabase.com/docs/guides/auth/passkeys and https://supabase.com/changelog/46458-passkeys-for-supabase-auth-beta (beta May 2026, experimental) (verified via search snippets)
7. Supabase Storage downloads: https://supabase.com/docs/guides/storage/serving/downloads (private buckets, signed URLs, revocation) (verified)
8. Neon Pricing: https://neon.com/pricing (Free limits, scale-to-zero, Neon Auth) (verified)
9. Turso Pricing: https://turso.tech/pricing (Free limits, no card) (verified)
10. Firebase Pricing: https://firebase.google.com/pricing (Spark quotas; Cloud Storage needs Blaze) (verified)
11. Convex limits: https://docs.convex.dev/production/state/limits (Free hard caps) (verified)
12. Appwrite Free plan docs: https://appwrite.io/docs/advanced/platform/free and https://appwrite.io/changelog/entry/2026-01-08 (2 projects, behavior at the limit). Numeric quotas and pausing are from third parties (reported)
13. PocketHost FAQ: https://pockethost.io/docs/faq and https://www.hostadvice.com/vps/pocketbase-hosting/free/ (reported)
14. Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/ (10 GB, ops, free egress, Standard only) (verified)
15. R2 presigned URLs: https://developers.cloudflare.com/r2/api/s3/presigned-urls/ (7-day max, S3 endpoint only, CORS) (verified)
16. R2 Workers API: https://developers.cloudflare.com/r2/api/workers/workers-api-reference/ (`get()` range option) (verified)
17. Backblaze B2 pricing: https://www.backblaze.com/cloud-storage/pricing (10 GB free, 3× egress, CDN partners) (verified)
18. Bunny Storage pricing: https://bunny.net/pricing/storage/ ($1 minimum, trial) (verified)
19. Cloudinary pricing: https://cloudinary.com/pricing (25 credits, no card) (verified)
20. ImageKit plans: https://imagekit.io/plans/ (20 GB bandwidth, 3 GB storage) (verified)
21. GitHub LFS storage and bandwidth: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-storage-and-bandwidth-usage (10 GiB / 10 GiB, behavior past the quota) (verified)
22. Vercel Fair Use Guidelines: https://vercel.com/docs/limits/fair-use-guidelines (Hobby allotments, non-commercial definition) (verified, page updated 2026-09-14)
23. Vercel Limits: https://vercel.com/docs/limits (Hobby general limits, Git org restriction) (verified)
24. Cloudflare Pages limits: https://developers.cloudflare.com/pages/platform/limits/ (verified)
25. Cloudflare Workers limits: https://developers.cloudflare.com/workers/platform/limits/ (100k requests/day, CPU, asset limits) (verified)
26. Workers static assets billing: https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/ ("Requests to static assets are free and unlimited") (verified)
27. Netlify credit-based plans: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ (300 credits, per-unit costs) (verified)
28. Netlify "How credits work": https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ (Free projects paused when credits run out) (verified)
29. GitHub Pages limits: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits (verified)
30. GitHub's plans: https://docs.github.com/get-started/learning-about-github/githubs-products (Pages in public repos only on Free) (verified via search snippets)
31. Cloudflare Zero Trust pricing: https://www.cloudflare.com/plans/sase-zero-trust/ (free under 50 users) (reported via search)
32. YouTube embedded player parameters: https://developers.google.com/youtube/player_parameters (playsinline, cc_load_policy, cc_lang_pref, hl, start/end, rel, origin) (verified)
33. YouTube IFrame Player API reference: https://developers.google.com/youtube/iframe_api_reference (getCurrentTime, seekTo, playback rates, states, no time-update event, onAutoplayBlocked, 200×200 minimum, caption options) (verified)
34. YouTube Data API `captions.download`: https://developers.google.com/youtube/v3/docs/captions/download (OAuth plus edit permission; 200 units) (verified)
35. YouTube API Services Developer Policies: https://developers.google.com/youtube/terms/developer-policies (I.6, I.7, I.9, I.E.1, III.F.2, III.F.3.b) (verified)
36. YouTube Terms of Service: https://www.youtube.com/static?template=terms (no download unless authorized; embeddable player allowed) (verified)
37. WebKit, "Updates to Storage Policy": https://webkit.org/blog/14403/updates-to-storage-policy/ (quotas, eviction, persist()) (verified)
38. WebKit, "Full Third-Party Cookie Blocking and More": https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ (7-day storage cap; home-screen apps exempt) (verified)
39. web.dev, Media Session: https://web.dev/articles/media-session and https://developer.chrome.com/blog/media-notifications (background playback and notifications on Android; reference only) (verified via search snippets)
40. Tatoeba Terms of Use: https://tatoeba.org/en/terms_of_use (CC BY 2.0 FR, CC0, per-recording audio licenses) (verified)
41. Mozilla Data Collective, Common Voice datasheet: https://datacollective.mozillafoundation.org/datasets/cmfzu8u8wa555eq8onrk334h4 (CC0; no speaker identification; no re-hosting) (verified via search snippets)
42. MDBG, CC-CEDICT: https://www.mdbg.net/chinese/dictionary?page=cc-cedict (CC BY-SA 4.0, attribution, share improvements) (verified)
43. CC BY-SA 4.0 legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en (definition of "Share", Section 3 attribution, 3(b) ShareAlike) (verified)
44. Make Me a Hanzi COPYING: https://raw.githubusercontent.com/skishore/makemeahanzi/master/COPYING (LGPL / Arphic PL split) (verified)
45. hanzi-writer-data: https://github.com/chanind/hanzi-writer-data and its ARPHICPL.TXT (Arphic PL obligations) (verified)
46. Techdirt on CBC vs podcast apps (2016): https://archive.techdirt.com/articles/20161108/09455835992/cbc-threatens-podcast-apps-letting-people-listen-to-cbc-podcasts.shtml (an RSS feed is not a blanket license; disputed) (reported)
47. Podnews, copies of a podcast: https://podnews.net/article/copies-of-podcast (rehosting a catalog led to takedowns) (reported)
48. R2 setup guides: https://tech-insider.org/how-to-set-up-cloudflare-r2-2026/ and https://dev.to/leonwong282/the-complete-beginners-guide-to-cloudflare-r2-image-hosting-2025-2g4k (a payment method is needed to enable R2) (reported)
