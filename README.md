# Lang Learner

A private Mandarin learning app on the Refold method. Start with [AGENTS.md](AGENTS.md), [the research index](docs/research/README.md) and [the build phases](docs/design/build-phases.md).

## Run it locally

Needs Node 24 and pnpm. The audio comes from the media ingester's cache in `tools/media-ingest/.cache/out` (see `tools/media-ingest/README.md`).

```bash
pnpm install
pnpm dev
```

`pnpm dev` builds the content, then runs the server (`apps/server`, on 127.0.0.1:8787, events in `.data/events.sqlite`) and Vite, which proxies `/sync` and `/content` to it. Open http://localhost:5173. To try two devices on one laptop, open http://127.0.0.1:5173 as well: a different origin has its own local log.

`pnpm dev -- --web-port 5175 --server-port 8788 --db .data/fresh.sqlite` runs a second pair with its own history, which is how to try first-run setup as a new device (the `web-fresh` entry in `.claude/launch.json`).

**Offline.** The service worker exists only in a built app. Build it (`pnpm --filter @lang-learner/web build`), serve it from the server alone (`pnpm start`, or `node apps/server/main.ts --web apps/web/dist --port 8790 --db .data/built.sqlite`, the `app-built` entry), open it once, then stop the server: the app reloads and sessions run from the device's caches, and the events sync when the server is back.

**Silent testing.** `?mute=1` on the app's URL silences every clip and YouTube embed (the embed gets `mute=1` and is muted once ready), in development and in built apps, and the choice is remembered in this browser's localStorage until `?mute=0`.

## Check it

```bash
pnpm check
```

Content lives in `content/`, and `content/AUTHORING.md` has the format. `pnpm content:check` checks it, and `pnpm content:build` compiles it into `dist/content/`, with the audio it uses copied from the media cache. `pnpm content:suggest <lesson-slug>` lists corpus lines a lesson can use.
