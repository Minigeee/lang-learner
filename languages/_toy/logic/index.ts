// Test-only pack, so core can't quietly assume Mandarin. It has no dependency on core, because
// core's tests depend on it. Its shape is checked against LanguagePack in those tests.
export const toy = {
  code: 'xx',
  name: 'Toy',
  normalize: (s: string) => s.toLowerCase(),
  itemKinds: ['glyph'],
}
