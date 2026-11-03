// Stand-in for the app's t(): figures carry message keys, never baked English text.
const en = {
  'fig.catBook.aria': 'A cat sits on a book, and the book lies on a table. A chair stands beside the table.',
  'fig.box.aria': 'Four pictures of a ball and a box: on the box, under the box, in the box, beside the box.',
  'fig.tea.aria': 'Two pictures: a man drinking tea, and the same man not drinking, his cup on the table.',
  'fig.nouns.aria': 'Six objects: an apple, a cup, a book, a cat, a dog, a car.',
  'fig.bonus.aria': 'Two pictures of a table with a cup and a book on it: a dog under the table, then a cat under the table.',
  'gloss.dogUnder': 'the dog is under the table', 'gloss.catUnder': 'the cat is under the table',
  'gloss.on': 'on', 'gloss.under': 'under', 'gloss.in': 'in', 'gloss.beside': 'beside',
  'gloss.drinking': 'is drinking tea', 'gloss.notDrinking': 'is not drinking tea',
  'gloss.apple': 'apple', 'gloss.cup': 'cup', 'gloss.book': 'book', 'gloss.cat': 'cat', 'gloss.dog': 'dog', 'gloss.car': 'car',
}
export const t = (k) => { if (!(k in en)) throw new Error('missing message ' + k); return en[k] }
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
// Replace {{t:key}} placeholders (used by hand-written SVGs) with escaped messages.
export const fillMessages = (svg) => svg.replace(/\{\{t:([\w.]+)\}\}/g, (m, k) => esc(t(k)))
