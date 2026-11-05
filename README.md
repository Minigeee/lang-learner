# Lang Learner

A private Mandarin learning app on the Refold method. Start with [AGENTS.md](AGENTS.md), [the research index](docs/research/README.md) and [the build phases](docs/design/build-phases.md).

## Run it locally

Needs Node 24, pnpm and a running Docker Desktop. `OWNER_EMAIL` goes in `.env.development.local`.

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm db:owner
pnpm dev:env
pnpm dev
```

Open http://localhost:5173. Sign-in codes appear in Mailpit at http://127.0.0.1:54324.

## Check it

```bash
pnpm check
pnpm test:db
```

`pnpm test:db` needs the local stack running.

Content lives in `content/`, and `content/AUTHORING.md` has the format. `pnpm content:check` checks it, `pnpm content:build` compiles it into `dist/content/`, and `pnpm content:upload` sends the build and the ingester's cached media to the local bucket, so it needs the stack running. `pnpm content:suggest <lesson-slug>` lists corpus lines a lesson can use.
