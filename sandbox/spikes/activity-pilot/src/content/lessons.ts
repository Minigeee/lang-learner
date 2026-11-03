// Three pilot lessons, one per lesson shape (doc 07): Sound, Pattern, Clip. Each uses a different
// opener and practice format, so the rotation in brainstorm §4 can be felt across them.
import type { ChoiceOption, ItemSpec } from '../core/types'
import type { Lesson } from '../core/lesson'
import { estimateLessonMinutes } from '../core/lesson'
import { sentence, syllable } from './clips'

// ---------- Sound: four tones on one syllable ----------
const TONE_SETS: Record<string, [string, string, string][]> = {
  ma: [['妈', 'mā', 'mom'], ['麻', 'má', 'hemp'], ['马', 'mǎ', 'horse'], ['骂', 'mà', 'scold']],
  tang: [['汤', 'tāng', 'soup'], ['糖', 'táng', 'sugar'], ['躺', 'tǎng', 'lie down'], ['烫', 'tàng', 'scalding']],
  shi: [['师', 'shī', 'teacher'], ['十', 'shí', 'ten'], ['使', 'shǐ', 'to use'], ['是', 'shì', 'to be']],
  fei: [['飞', 'fēi', 'to fly'], ['肥', 'féi', 'fat'], ['匪', 'fěi', 'bandit'], ['费', 'fèi', 'fee']],
  yi: [['衣', 'yī', 'clothes'], ['姨', 'yí', 'aunt'], ['椅', 'yǐ', 'chair'], ['意', 'yì', 'meaning']],
}
const toneClips: Record<string, string[][]> = Object.fromEntries(
  Object.entries(TONE_SETS).map(([syl, forms]) => [syl, forms.map(([hz, py, gl], i) => syllable(`${syl}${i + 1}`, hz, py, gl))]),
)
const TONE_OPTIONS: ChoiceOption[] = [1, 2, 3, 4].map((t) => ({
  key: `tone${t}`, label: `Tone ${t}`, sub: ['high, flat', 'rising', 'low dip', 'falling'][t - 1], glyph: `tone${t}` as ChoiceOption['glyph'],
}))
function toneItem(syl: string, tone: number): ItemSpec {
  const sets = toneClips[syl]
  return {
    key: `${syl}${tone}`,
    target: `zh:sc:tone-${tone}`,
    answer: `tone${tone}`,
    stimuli: sets[tone - 1],
    optionStimuli: Object.fromEntries(sets.map((ids, i) => [`tone${i + 1}`, ids])),
  }
}

const soundLesson: Lesson = {
  id: 'zh:les:four-tones', unit: '0.1', skill: 'zh:sc:tones', title: 'Four tones on one syllable', kindLabel: 'Sound practice',
  idea: 'The same syllable with a different pitch shape is a different word.', minutes: 0,
  steps: [
    { kind: 'opener', opener: { type: 'mystery', clips: toneClips.ma.map((v) => v[0]), hook: {
      prompt: 'All four are "ma". Same word, or different words?', options: ['Same word', 'Different words', 'Not sure'],
    } } },
    {
      kind: 'explain', title: 'Four tones, four pitch shapes',
      figure: 'tone-contours',
      body: ['Each tone is a shape your voice draws: flat and high, rising, a low dip, or falling.', 'Listen for the shape, not the starting pitch. Every speaker starts at a different height.'],
    },
    { kind: 'examples', clips: [...toneClips.ma.map((v) => v[1]), ...toneClips.tang.map((v) => v[2])] },
    { kind: 'practice', format: 'pick', use: { widget: 'choice-pad', config: {
      prompt: 'Which tone?', layout: 'grid', options: TONE_OPTIONS, rungs: ['One syllable', 'New syllables'],
      items: [
        ...[1, 2, 3, 4].map((tone) => ({ ...toneItem('ma', tone), rung: 1 })),
        ...([['tang', 1], ['tang', 4], ['shi', 2], ['shi', 3], ['fei', 4], ['fei', 1], ['yi', 3], ['yi', 2]] as const).map(([s, tone]) => ({ ...toneItem(s, tone), rung: 2 })),
      ],
    } } },
  ],
}

// ---------- Pattern: 不 vs 没 ----------
const PAIRS: Record<string, { mei: [string, string, string]; bu: [string, string, string] }> = {
  qu: { mei: ['他没去。', 'tā méi qù', "He didn't go."], bu: ['他不去。', 'tā bú qù', "He isn't going."] },
  lai: { mei: ['她没来。', 'tā méi lái', "She didn't come."], bu: ['她不来。', 'tā bù lái', "She isn't coming."] },
  chi: { mei: ['我没吃。', 'wǒ méi chī', "I didn't eat."], bu: ['我不吃。', 'wǒ bù chī', "I don't eat it."] },
  mai: { mei: ['他没买。', 'tā méi mǎi', "He didn't buy it."], bu: ['他不买。', 'tā bù mǎi', "He won't buy it."] },
  kan: { mei: ['我们没看。', 'wǒmen méi kàn', "We didn't watch."], bu: ['我们不看。', 'wǒmen bú kàn', "We won't watch."] },
  shuo: { mei: ['你没说。', 'nǐ méi shuō', "You didn't say."], bu: ['你不说。', 'nǐ bù shuō', "You won't say."] },
}
const pairClips = Object.fromEntries(
  Object.entries(PAIRS).map(([k, p]) => [k, { mei: sentence(`${k}-mei`, ...p.mei), bu: sentence(`${k}-bu`, ...p.bu) }]),
)
const longClip = (key: string, text: string, py: string, gloss: string) => sentence(key, text, py, gloss)
/** Mismatch lines: only 不 or 没 decides the meaning, and no time word gives the English away. */
const mm = (key: string, text: string, py: string, gloss: string) => sentence(`mm-${key}`, text, py, gloss)
const MM = {
  he: mm('he', '他没喝。', 'tā méi hē', "He didn't drink it."),
  bhe: mm('bhe', '我不喝。', 'wǒ bù hē', "I don't drink it."),
  shui: mm('shui', '她没睡。', 'tā méi shuì', "She didn't sleep."),
  ting: mm('ting', '她不听。', 'tā bù tīng', "She won't listen."),
  zhao: mm('zhao', '我没找。', 'wǒ méi zhǎo', "I didn't look for it."),
  zou: mm('zou', '他们不走。', 'tāmen bù zǒu', "They aren't leaving."),
  wen: mm('wen', '你没问。', 'nǐ méi wèn', "You didn't ask."),
  xie: mm('xie', '他不写。', 'tā bù xiě', "He won't write it."),
  wan: mm('wan', '我们没玩。', 'wǒmen méi wán', "We didn't play."),
  zhidao: mm('zhidao', '我不知道。', 'wǒ bù zhīdào', "I don't know."),
  shuo: mm('shuo', '他没说。', 'tā méi shuō', "He didn't say."),
  mai: mm('mai', '她不买。', 'tā bù mǎi', "She won't buy it."),
}
/** Lines alternate voices 3 and 4, which the examples step barely uses. */
function mmSet(key: string, lines: string[][], wrong: number, shown: string) {
  return { key, target: 'zh:g:mei-vs-bu', lines: lines.map((ids, i) => ids[2 + (i % 2)]), wrong, shown }
}
const rightBuMei = sentence('right-bumei', '我昨天没去。', 'wǒ zuótiān méi qù', "I didn't go yesterday.")
const quBu = pairClips.qu.bu[0]
const quMei = pairClips.qu.mei[0]

const patternLesson: Lesson = {
  id: 'zh:les:bu-vs-mei', unit: '1.13', skill: 'zh:g:mei-vs-bu', title: '不 vs 没', kindLabel: 'Lesson',
  idea: "没 says it didn't happen. 不 says you don't, or won't.", minutes: 0,
  steps: [
    { kind: 'opener', opener: { type: 'showdown', a: quBu, b: quMei, hook: {
      prompt: 'One of these is about the past. Which?', options: ['The first', 'The second', 'Not sure'],
    } } },
    {
      kind: 'explain', title: '没 looks back. 不 looks at habits and ahead.',
      figure: 'timeline-bu-mei',
      body: ['Both mean "not". What decides it is when: a past action takes 没, a habit or a plan takes 不.'],
      wrong: '我昨天不去。', right: rightBuMei[1],
      deeper: { q: 'Why 没有, never 不有?', a: `有 is the one verb 不 can't negate. "Don't have" is always 没有.` },
    },
    { kind: 'examples', highlight: ['不', '没'], clips: [
      pairClips.lai.mei[1], pairClips.lai.bu[1], pairClips.chi.mei[2], pairClips.chi.bu[2],
      longClip('l-chifan', '我还没吃饭。', 'wǒ hái méi chīfàn', "I haven't eaten yet.")[3],
      longClip('l-gongzuo', '他周末不工作。', 'tā zhōumò bù gōngzuò', "He doesn't work on weekends.")[3],
    ] },
    { kind: 'practice', format: 'mismatch', use: { widget: 'mismatch', config: {
      prompt: 'Which English line is wrong?',
      sets: [
        mmSet('mm-1', [MM.he, MM.bhe, MM.shui], 1, "I didn't drink it."),
        mmSet('mm-2', [MM.ting, MM.zhao, MM.zou], 0, "She didn't listen."),
        mmSet('mm-3', [MM.wen, MM.xie, MM.wan], 2, "We won't play."),
        mmSet('mm-4', [MM.zhidao, MM.shuo, MM.mai], 1, "He won't say."),
        mmSet('mm-5', [pairClips.mai.bu, pairClips.kan.mei, pairClips.shuo.bu], 2, "You didn't say."),
      ],
    } } },
  ],
}

// ---------- Clip: where's the cat? ----------
const LINES: [string, string, string, string[]][] = [
  ['猫在哪儿？', 'māo zài nǎr', "Where's the cat?", ['猫', '在', '哪儿', '？']],
  ['猫不在椅子上。', 'māo bú zài yǐzi shang', "The cat isn't on the chair.", ['猫', '不', '在', '椅子', '上', '。']],
  ['猫在桌子上。', 'māo zài zhuōzi shang', 'The cat is on the table.', ['猫', '在', '桌子', '上', '。']],
  ['桌子上有一本书。', 'zhuōzi shang yǒu yì běn shū', "There's a book on the table.", ['桌子', '上', '有', '一', '本', '书', '。']],
  ['猫在书上！', 'māo zài shū shang', 'The cat is on the book!', ['猫', '在', '书', '上', '！']],
]
const lineClips = LINES.map(([t, py, gl, tok], i) => sentence(`cat-${i + 1}`, t, py, gl, tok))
const GLOSSARY = {
  猫: { pinyin: 'māo', gloss: 'cat', itemId: 'zh:w:猫:mao1', inCards: true },
  在: { pinyin: 'zài', gloss: 'at, in, on (where something is)', itemId: 'zh:w:在:zai4', inCards: true },
  哪儿: { pinyin: 'nǎr', gloss: 'where', itemId: 'zh:w:哪儿:nar3' },
  不: { pinyin: 'bù', gloss: 'not', itemId: 'zh:w:不:bu4', inCards: true },
  椅子: { pinyin: 'yǐzi', gloss: 'chair', itemId: 'zh:w:椅子:yi3zi5' },
  桌子: { pinyin: 'zhuōzi', gloss: 'table, desk', itemId: 'zh:w:桌子:zhuo1zi5' },
  上: { pinyin: 'shang', gloss: 'on (after a place)', itemId: 'zh:w:上:shang5' },
  有: { pinyin: 'yǒu', gloss: 'there is, to have', itemId: 'zh:w:有:you3', inCards: true },
  一: { pinyin: 'yī', gloss: 'one', itemId: 'zh:w:一:yi1', inCards: true },
  本: { pinyin: 'běn', gloss: 'measure word for books', itemId: 'zh:w:本:ben3' },
  书: { pinyin: 'shū', gloss: 'book', itemId: 'zh:w:书:shu1' },
}

const clipLesson: Lesson = {
  id: 'zh:les:where-is-the-cat', unit: '1.7', skill: 'zh:g:zai-location', title: "Where's the cat?", kindLabel: 'Video lesson',
  idea: 'Thing + 在 + place + 上 says where something is.', minutes: 0,
  steps: [
    { kind: 'opener', opener: { type: 'story', scene: 'cat-table', clips: lineClips.map((v) => v[0]), hook: {
      prompt: 'What is the story about?', options: ['A cat', 'A book', 'Not sure yet'],
    } } },
    {
      kind: 'explain', title: '在 + a place + 上 says where something is',
      figure: 'cat-words',
      body: ['上 goes after the place: 桌子上 is "on the table". The thing comes first, then 在, then the place.'],
    },
    { kind: 'read-along', config: { scene: 'cat-table', mode: 'stepper', lines: lineClips.map((v) => v[2]), glossary: GLOSSARY } },
    {
      kind: 'practice', format: 'new-clip', use: { widget: 'clip-study', config: {
        scene: 'cat-table', mode: 'listen-check', lines: lineClips.map((v) => v[3]), glossary: GLOSSARY,
        gist: { prompt: 'Where is the cat at the end?', target: 'zh:g:zai-location', answer: 'book', options: [
          { key: 'chair', label: 'On the chair' }, { key: 'table', label: 'On the table' }, { key: 'book', label: 'On the book' },
        ] },
      } },
    },
  ],
}

export const LESSONS: Lesson[] = [soundLesson, patternLesson, clipLesson].map((l) => ({ ...l, minutes: estimateLessonMinutes(l) }))
