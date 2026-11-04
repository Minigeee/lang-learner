// The architecture's dependency rules (§4). `pnpm lint` fails on a violation.
module.exports = {
  forbidden: [
    {
      name: 'core-stays-core',
      comment: 'packages/core imports nothing from the app, the languages or Vue.',
      severity: 'error',
      from: { path: '^packages/core/', pathNot: '^packages/core/test/' },
      to: { path: '^(apps|languages)/|(^|/)@?vue(/|$)' },
    },
    {
      name: 'logic-imports-only-core',
      comment: 'A language logic package imports only packages/core.',
      severity: 'error',
      from: { path: '^languages/[^/]+/logic/' },
      to: { path: '^apps/|(^|/)@?vue(/|$)' },
    },
    {
      name: 'packs-stay-apart',
      severity: 'error',
      from: { path: '^languages/([^/]+)/' },
      to: { path: '^languages/', pathNot: '^languages/$1/' },
    },
    {
      name: 'one-pack-registration',
      comment: 'Only apps/web/src/languages.ts imports language packs.',
      severity: 'error',
      from: { path: '^apps/', pathNot: '^apps/web/src/languages\\.ts$' },
      to: { path: '^languages/' },
    },
    {
      name: 'nothing-depends-on-sandbox',
      severity: 'error',
      from: { path: '^(apps|packages|languages|scripts)/' },
      to: { path: '^sandbox/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: 'node_modules|dist' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.vue', '.js', '.mjs'] },
  },
}
