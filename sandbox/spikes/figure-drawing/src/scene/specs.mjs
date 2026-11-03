// The four test figures as the authoring agent would write them: objects + relations, no coordinates.
export const specs = {
  'a-cat-book': {
    aria: 'fig.catBook.aria',
    panels: [{ objects: [
      { id: 'chair', kind: 'chair' },
      { id: 'table', kind: 'table', beside: 'chair', side: 'right' },
      { id: 'book', kind: 'book', on: 'table', at: 0.45 },
      { id: 'cat', kind: 'cat', on: 'book' },
    ] }],
  },
  'b-box': {
    aria: 'fig.box.aria',
    panels: [
      { caption: { zh: '上', gloss: 'gloss.on' }, objects: [{ id: 'box', kind: 'box' }, { id: 'ball', kind: 'ball', on: 'box' }] },
      { caption: { zh: '下', gloss: 'gloss.under' }, objects: [{ id: 'box', kind: 'box' }, { id: 'ball', kind: 'ball', under: 'box' }] },
      { caption: { zh: '里', gloss: 'gloss.in' }, objects: [{ id: 'box', kind: 'box', open: true }, { id: 'ball', kind: 'ball', in: 'box' }] },
      { caption: { zh: '旁边', gloss: 'gloss.beside' }, objects: [{ id: 'box', kind: 'box' }, { id: 'ball', kind: 'ball', beside: 'box', side: 'right' }] },
    ],
  },
  'c-tea': {
    aria: 'fig.tea.aria',
    panels: [
      { caption: { zh: '在喝茶', gloss: 'gloss.drinking' }, objects: [
        { id: 'man', kind: 'person', pose: 'drink' },
        { id: 'cup', kind: 'teacup', hot: true, heldBy: 'man' },
        { id: 'table', kind: 'sideTable', beside: 'man', side: 'right' },
      ] },
      { caption: { zh: '没喝茶', gloss: 'gloss.notDrinking' }, objects: [
        { id: 'man', kind: 'person', pose: 'rest' },
        { id: 'table', kind: 'sideTable', beside: 'man', side: 'right' },
        { id: 'cup', kind: 'teacup', hot: true, on: 'table' },
      ] },
    ],
  },
  'd-nouns': {
    aria: 'fig.nouns.aria',
    columns: 3,
    panels: [['苹果', 'apple', 'apple'], ['杯子', 'cup', 'cup'], ['书', 'book.icon', 'book'], ['猫', 'cat.icon', 'cat'], ['狗', 'dog', 'dog'], ['车', 'car', 'car']]
      .map(([zh, kind, g]) => ({ fit: 64, caption: { zh, gloss: `gloss.${g}` }, objects: [{ id: g, kind }] })),
  },
  // Bonus: a new composition written only as a spec (no new drawing). The dog is too tall for the table,
  // which the checker flags; the second panel is the agent's fix (cat instead of dog).
  'e-bonus': {
    aria: 'fig.bonus.aria',
    panels: [
      { caption: { zh: '狗在桌子下面', gloss: 'gloss.dogUnder' }, objects: [
        { id: 'table', kind: 'table' }, { id: 'dog', kind: 'dog', under: 'table' },
        { id: 'cup', kind: 'teacup', hot: true, on: 'table', at: 0.2 }, { id: 'book', kind: 'book', on: 'table', at: 0.7 } ] },
      { caption: { zh: '猫在桌子下面', gloss: 'gloss.catUnder' }, objects: [
        { id: 'table', kind: 'table' }, { id: 'cat', kind: 'cat', under: 'table' },
        { id: 'cup', kind: 'teacup', hot: true, on: 'table', at: 0.2 }, { id: 'book', kind: 'book', on: 'table', at: 0.7 } ] },
    ],
  },
}
