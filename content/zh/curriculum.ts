// The curriculum: stages, units and every lesson, in default path order. This file owns that order,
// and doc 03's Prereqs column is a planning view of it. A lesson's file name is its id's slug, and a
// lesson with no file is simply not authored yet. See packages/content-tools/curriculum.ts for the shape.
import type { CurriculumSource } from '../../packages/content-tools/curriculum.ts'

export const curriculum: CurriculumSource = [
  {
    id: 'S0',
    title: 'Sounds',
    maxOutput: 0,
    perception: true,
    units: [
      {
        id: '0.1',
        title: 'Tones on one syllable',
        prereqs: [],
        lessons: [
          { id: 'zh:les:tone-shapes', label: '0.1a', title: 'Each tone is a pitch shape', shape: 'sound', minutes: 5, skill: 'zh:sc:tone-1234' },
          { id: 'zh:les:tone1-vs-tone4', label: '0.1b', title: '1st stays high; 4th falls from the top', shape: 'sound', minutes: 5, skill: 'zh:sc:tone1-tone4' },
          { id: 'zh:les:tone2-vs-tone3', label: '0.1c', title: 'The 3rd tone is low; the dip is optional', shape: 'sound', minutes: 6, skill: 'zh:sc:tone2-tone3' },
        ],
      },
      {
        id: '0.2',
        title: 'Simple and compound finals',
        prereqs: [],
        lessons: [
          { id: 'zh:les:simple-finals', label: '0.2a', title: "Pinyin vowels aren't English vowels", shape: 'sound', minutes: 6, skill: 'zh:sc:simple-finals' },
          { id: 'zh:les:u-umlaut', label: '0.2b', title: 'ü is neither u nor i', shape: 'sound', minutes: 5, skill: 'zh:sc:u-umlaut-u-i' },
          { id: 'zh:les:compound-finals', label: '0.2c', title: 'In compound finals, the starting vowel decides', shape: 'sound', minutes: 12, skill: 'zh:sc:compound-finals' },
          { id: 'zh:les:er-final', label: '0.2d', title: 'er is one r-colored vowel', shape: 'sound', minutes: 5, skill: 'zh:sc:er-final' },
        ],
      },
      {
        id: '0.3',
        title: 'Initials and aspiration',
        prereqs: ['0.2'],
        lessons: [
          { id: 'zh:les:aspiration', label: '0.3a', title: 'The puff, not voicing, splits b from p', shape: 'sound', minutes: 6, skill: 'zh:sc:aspiration' },
        ],
      },
      {
        id: '0.4',
        title: 'Three "sh" families (+ r)',
        prereqs: ['0.2', '0.3'],
        lessons: [
          { id: 'zh:les:retroflex-vs-flat', label: '0.4a', title: 'zh ch sh r sound darker than z c s', shape: 'sound', minutes: 16, skill: 'zh:sc:retroflex-flat' },
          { id: 'zh:les:jqx-vs-buzz-i', label: '0.4b', title: 'j q x take a clear i; the rest buzz', shape: 'sound', minutes: 11, skill: 'zh:sc:jqx-vs-buzz-i' },
          { id: 'zh:les:sibilant-families', label: '0.4c', title: 'Three families, told apart by tongue place', shape: 'sound', minutes: 7, skill: 'zh:sc:sibilant-3way' },
        ],
      },
      {
        id: '0.5',
        title: 'Nasal finals',
        prereqs: ['0.2'],
        lessons: [
          { id: 'zh:les:n-vs-ng', label: '0.5a', title: '-n stops at the teeth; -ng rings at the back', shape: 'sound', minutes: 13, skill: 'zh:sc:n-ng' },
          { id: 'zh:les:n-vs-ng-glides', label: '0.5b', title: 'ian sounds like "yen"; iang keeps its open a', shape: 'sound', minutes: 5, skill: 'zh:sc:n-ng-glides' },
        ],
      },
      {
        id: '0.6',
        title: 'Pinyin spelling rules',
        prereqs: ['0.2', '0.4', '0.5'],
        lessons: [
          { id: 'zh:les:u-spelled-u-umlaut', label: '0.6a', title: 'Right after j q x and y, u spells ü', shape: 'sound', minutes: 6, skill: 'zh:sc:u-spelled-u-umlaut' },
          { id: 'zh:les:hidden-vowels', label: '0.6b', title: 'iu, ui and un are short for longer finals', shape: 'sound', minutes: 5, skill: 'zh:sc:hidden-vowels' },
          { id: 'zh:les:apostrophe', label: '0.6c', title: 'The apostrophe marks a break you can hear', shape: 'sound', minutes: 5, skill: 'zh:sc:syllable-break' },
        ],
      },
      {
        id: '0.7',
        title: 'Tone pairs I (1+x, 2+x)',
        prereqs: ['0.1'],
        lessons: [
          { id: 'zh:les:pairs-tone1-x', label: '0.7a', title: 'A 1st tone holds high before any tone', shape: 'sound', minutes: 6, skill: 'zh:sc:pairs-tone1-x' },
          { id: 'zh:les:pairs-tone2-x', label: '0.7b', title: 'A 2nd tone still rises before any tone', shape: 'sound', minutes: 6, skill: 'zh:sc:pairs-tone2-x' },
        ],
      },
      {
        id: '0.8',
        title: 'Tone pairs II (3+1/2/4, 4+x)',
        prereqs: ['0.7'],
        lessons: [
          { id: 'zh:les:half-third', label: '0.8a', title: 'A 3rd before 1st, 2nd or 4th stays low', shape: 'sound', minutes: 12, skill: 'zh:sr:half-third' },
          { id: 'zh:les:pairs-tone4-x', label: '0.8b', title: 'A 4th falls from the top before any tone', shape: 'sound', minutes: 6, skill: 'zh:sc:pairs-tone4-x' },
        ],
      },
      {
        id: '0.9',
        title: 'Third-tone sandhi',
        prereqs: ['0.8'],
        lessons: [
          { id: 'zh:les:third-tone-sandhi', label: '0.9a', title: 'Two 3rds in a row: the first rises', shape: 'sound', minutes: 5, skill: 'zh:sr:third-tone-sandhi' },
          { id: 'zh:les:third-tone-chains', label: '0.9b', title: 'In a chain of 3rds, the last one stays low', shape: 'sound', minutes: 5, skill: 'zh:sr:third-tone-chains' },
        ],
      },
      {
        id: '0.10',
        title: '一 and 不',
        prereqs: ['0.8', '0.9'],
        lessons: [
          { id: 'zh:les:bu-sandhi', label: '0.10a', title: '不 rises before a 4th tone', shape: 'sound', minutes: 6, skill: 'zh:sr:bu-sandhi' },
          { id: 'zh:les:yi-sandhi', label: '0.10b', title: "一 changes with the next tone, unless it's a digit or ordinal", shape: 'sound', minutes: 6, skill: 'zh:sr:yi-sandhi' },
        ],
      },
      {
        id: '0.11',
        title: 'Neutral tone and erhua',
        prereqs: ['0.5', '0.8', '0.10'],
        lessons: [
          { id: 'zh:les:neutral-tone-pitch', label: '0.11a', title: 'A neutral syllable takes its pitch from the one before', shape: 'sound', minutes: 10, skill: 'zh:sr:neutral-tone' },
          { id: 'zh:les:neutral-tone-pairs', label: '0.11b', title: 'Some words differ only by a neutral tone', shape: 'sound', minutes: 6, skill: 'zh:sc:neutral-full' },
          { id: 'zh:les:erhua', label: '0.11c', title: 'Erhua melts -r into the syllable', shape: 'sound', minutes: 6, skill: 'zh:sr:erhua' },
        ],
      },
      {
        id: '0.12',
        title: 'Tones in running speech',
        prereqs: ['0.9', '0.10', '0.11'],
        lessons: [
          { id: 'zh:les:tones-in-speech', label: '0.12a', title: 'At natural speed, tones shrink but keep direction', shape: 'sound', minutes: 18, skill: 'zh:sr:tone-reduction' },
          { id: 'zh:les:intonation-over-tones', label: '0.12b', title: "Questions don't bend the tones", shape: 'sound', minutes: 6, skill: 'zh:sr:intonation-over-tone' },
        ],
      },
      {
        id: '0.13',
        title: 'Sounds in first words',
        prereqs: ['0.4', '0.12'],
        lessons: [
          { id: 'zh:les:tone-minimal-pairs', label: '0.13a', title: 'Same syllable, different tone, different word', shape: 'sound', minutes: 6, skill: null },
          { id: 'zh:les:si-shi-shi', label: '0.13b', title: '四, 十 and 是 differ by initial and tone', shape: 'sound', minutes: 7, skill: 'zh:sc:si-shi-shi' },
        ],
      },
      {
        id: '0.14',
        title: 'Checkpoint',
        prereqs: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9', '0.10', '0.11', '0.12', '0.13'],
        lessons: [
          { id: 'zh:les:checkpoint-segments', label: '0.14a', title: 'Checkpoint: finals, initials and spelling', shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:checkpoint-tones', label: '0.14b', title: 'You can tell tones and tone pairs apart', shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:checkpoint-tone-changes', label: '0.14c', title: 'Checkpoint: tone changes and words', shape: 'checkpoint', minutes: 7, skill: null },
        ],
      },
    ],
  },
  {
    id: 'S1',
    title: 'Survival core',
    maxOutput: 1,
    units: [
      {
        id: '1.1',
        title: 'Greetings and names',
        prereqs: ['0.6', '0.9', '0.13'],
        lessons: [
          { id: 'zh:les:shi-links-nouns', label: '1.1a', title: '是 links a person to what they are', shape: 'pattern', minutes: 6, skill: 'zh:g:shi-links-nouns' },
          { id: 'zh:les:jiao-gives-name', label: '1.1b', title: '叫 gives your name', shape: 'pattern', minutes: 8, skill: 'zh:g:jiao-name' },
          { id: 'zh:les:meeting-someone', label: '1.1c', title: 'Greetings are set phrases, so learn them whole', shape: 'clip', minutes: 7, skill: 'zh:v:greetings' },
        ],
      },
      {
        id: '1.2',
        title: 'Asking questions',
        prereqs: ['1.1', '0.12'],
        lessons: [
          { id: 'zh:les:ma-yes-no', label: '1.2a', title: '吗 makes a yes-no question', shape: 'pattern', minutes: 16, skill: 'zh:g:ma-question' },
          { id: 'zh:les:qword-in-place', label: '1.2b', title: 'The question word sits where the answer goes', shape: 'pattern', minutes: 6, skill: 'zh:g:qword-in-place' },
          { id: 'zh:les:ni-ne-asks-back', label: '1.2c', title: '你呢? asks it back', shape: 'pattern', minutes: 6, skill: 'zh:g:ni-ne' },
        ],
      },
      {
        id: '1.3',
        title: 'Describing',
        prereqs: ['1.2', '0.10'],
        lessons: [
          { id: 'zh:les:hen-adjective', label: '1.3a', title: 'Adjectives take 很, not 是', shape: 'pattern', minutes: 7, skill: 'zh:g:hen-adj' },
          { id: 'zh:les:bu-negates', label: '1.3b', title: '不 negates the verb or adjective', shape: 'pattern', minutes: 6, skill: 'zh:g:bu-negates' },
          { id: 'zh:les:degree-words', label: '1.3c', title: '非常, 真 and 有点儿 set the strength', shape: 'pattern', minutes: 6, skill: 'zh:g:degree-adverbs' },
        ],
      },
      {
        id: '1.4',
        title: 'Counting 0–10',
        prereqs: ['0.6', '0.13'],
        closedSet: true,
        lessons: [
          { id: 'zh:les:digits-one-to-five', label: '1.4a', title: '一 to 五', shape: 'pattern', minutes: 6, skill: 'zh:v:digits-1-5' },
          { id: 'zh:les:digits-six-to-ten-zero', label: '1.4b', title: '六 to 十, and 零', shape: 'pattern', minutes: 6, skill: 'zh:v:digits-6-10-0' },
        ],
      },
      {
        id: '1.5',
        title: 'Numbers and age',
        prereqs: ['1.2', '1.4', '0.10', '0.13'],
        lessons: [
          { id: 'zh:les:number-structure', label: '1.5a', title: 'Numbers are built from 1–10', shape: 'pattern', minutes: 8, skill: 'zh:g:number-structure' },
          { id: 'zh:les:ge-measure', label: '1.5b', title: '个 goes between number and noun', shape: 'pattern', minutes: 6, skill: 'zh:g:ge-measure' },
          { id: 'zh:les:liang-not-er', label: '1.5c', title: '两, not 二, before a measure word', shape: 'pattern', minutes: 6, skill: 'zh:g:liang-vs-er' },
          { id: 'zh:les:age-sui', label: '1.5d', title: 'Age takes 岁', shape: 'pattern', minutes: 7, skill: 'zh:g:age-sui' },
        ],
      },
      {
        id: '1.6',
        title: 'This, that, which',
        prereqs: ['1.5'],
        lessons: [
          { id: 'zh:les:zhe-na-measure', label: '1.6a', title: '这, 那 and 哪 take a measure word before a noun', shape: 'pattern', minutes: 13, skill: 'zh:g:zhe-na-nei-mw' },
          { id: 'zh:les:zhexie-naxie', label: '1.6b', title: '这些 and 那些 take no measure word', shape: 'pattern', minutes: 6, skill: 'zh:g:zhexie-naxie' },
          { id: 'zh:les:everyday-measure-words', label: '1.6c', title: 'Each noun has its measure word', shape: 'pattern', minutes: 7, skill: 'zh:v:everyday-mw' },
        ],
      },
      {
        id: '1.7',
        title: 'Family',
        prereqs: ['1.1', '1.3'],
        lessons: [
          { id: 'zh:les:de-possession', label: '1.7a', title: '的 says whose', shape: 'pattern', minutes: 6, skill: 'zh:g:de-possession' },
          { id: 'zh:les:you-meiyou', label: '1.7b', title: '有 has; only 没有 negates it', shape: 'pattern', minutes: 6, skill: 'zh:g:you-meiyou' },
          { id: 'zh:les:family-intro', label: '1.7c', title: 'A family, introduced', shape: 'clip', minutes: 7, skill: 'zh:v:family' },
        ],
      },
      {
        id: '1.8',
        title: 'Asking how',
        prereqs: ['1.3', '1.6'],
        lessons: [
          { id: 'zh:les:zenme-verb', label: '1.8a', title: '怎么 + verb asks how to do it', shape: 'pattern', minutes: 6, skill: 'zh:g:zenme-verb' },
          { id: 'zh:les:zenmeyang', label: '1.8b', title: '怎么样 asks how it is', shape: 'pattern', minutes: 7, skill: 'zh:g:zenmeyang' },
        ],
      },
      {
        id: '1.9',
        title: 'Where things are',
        prereqs: ['1.6', '1.7'],
        lessons: [
          { id: 'zh:les:zai-location', label: '1.9a', title: '在 says where it is', shape: 'pattern', minutes: 9, skill: 'zh:g:zai-location' },
          { id: 'zh:les:place-words', label: '1.9b', title: 'Place words follow the noun', shape: 'pattern', minutes: 10, skill: 'zh:g:place-words' },
          { id: 'zh:les:you-vs-zai', label: '1.9c', title: "有 says what's there; 在 says where", shape: 'pattern', minutes: 6, skill: 'zh:g:you-vs-zai' },
        ],
      },
      {
        id: '1.10',
        title: 'Dates and times',
        prereqs: ['1.5'],
        lessons: [
          { id: 'zh:les:dates-big-to-small', label: '1.10a', title: 'Dates run big to small', shape: 'pattern', minutes: 7, skill: 'zh:g:dates' },
          { id: 'zh:les:weekdays', label: '1.10b', title: 'Weekdays are 星期 + a number', shape: 'pattern', minutes: 8, skill: 'zh:v:weekdays' },
          { id: 'zh:les:clock-time', label: '1.10c', title: 'Clock time: 点, 分, 半', shape: 'pattern', minutes: 7, skill: 'zh:g:clock-time' },
        ],
      },
      {
        id: '1.11',
        title: 'Daily verbs, word order',
        prereqs: ['1.8', '1.9', '1.10'],
        lessons: [
          { id: 'zh:les:daily-routine', label: '1.11a', title: 'A day, in order', shape: 'clip', minutes: 7, skill: 'zh:v:daily-verbs' },
          { id: 'zh:les:qu-place-purpose', label: '1.11b', title: '去 + place, then what for', shape: 'pattern', minutes: 6, skill: 'zh:g:qu-place-purpose' },
          { id: 'zh:les:time-before-verb', label: '1.11c', title: 'Time words come before the verb', shape: 'pattern', minutes: 6, skill: 'zh:g:time-before-verb' },
          { id: 'zh:les:zai-place-verb', label: '1.11d', title: '在 + place comes before the verb', shape: 'pattern', minutes: 9, skill: 'zh:g:zai-place-verb' },
        ],
      },
      {
        id: '1.12',
        title: 'Wanting',
        prereqs: ['1.11'],
        lessons: [
          { id: 'zh:les:xiang-verb', label: '1.12a', title: '想 + verb: would like to', shape: 'pattern', minutes: 6, skill: 'zh:g:xiang-verb' },
          { id: 'zh:les:yao-want', label: '1.12b', title: '要: want it, want to, going to', shape: 'pattern', minutes: 6, skill: 'zh:g:yao-want' },
        ],
      },
      {
        id: '1.13',
        title: 'Can',
        prereqs: ['1.12'],
        lessons: [
          { id: 'zh:les:hui-skill', label: '1.13a', title: '会 is a learned skill', shape: 'pattern', minutes: 6, skill: 'zh:g:hui-skill' },
          { id: 'zh:les:neng-able', label: '1.13b', title: '能 says able or possible', shape: 'pattern', minutes: 6, skill: 'zh:g:neng-able' },
          { id: 'zh:les:keyi-permission', label: '1.13c', title: '可以 asks permission; 行 answers', shape: 'pattern', minutes: 6, skill: 'zh:g:keyi-permission' },
          { id: 'zh:les:hui-neng-keyi', label: '1.13d', title: '会, 能 or 可以', shape: 'pattern', minutes: 7, skill: 'zh:g:hui-neng-keyi' },
        ],
      },
      {
        id: '1.14',
        title: 'Food and shopping',
        prereqs: ['1.3', '1.6', '1.12'],
        lessons: [
          { id: 'zh:les:prices', label: '1.14a', title: '多少钱? asks the price', shape: 'pattern', minutes: 6, skill: 'zh:g:prices' },
          { id: 'zh:les:tai-le', label: '1.14b', title: '太…了 says too much, or so good', shape: 'pattern', minutes: 5, skill: 'zh:g:tai-le' },
          { id: 'zh:les:haishi-choice', label: '1.14c', title: '还是 offers a choice', shape: 'pattern', minutes: 8, skill: 'zh:g:haishi-question' },
          { id: 'zh:les:stall-ordering', label: '1.14d', title: 'Buying at a stall', shape: 'clip', minutes: 7, skill: 'zh:v:stall-phrases' },
        ],
      },
      {
        id: '1.15',
        title: 'Also, all, and',
        prereqs: ['1.11', '1.13'],
        lessons: [
          { id: 'zh:les:ye-also', label: '1.15a', title: '也 says the same is true', shape: 'pattern', minutes: 5, skill: 'zh:g:ye' },
          { id: 'zh:les:dou-all', label: '1.15b', title: '都 sums up the subject', shape: 'pattern', minutes: 8, skill: 'zh:g:dou' },
          { id: 'zh:les:hai-also', label: '1.15c', title: '还 adds one more thing', shape: 'pattern', minutes: 6, skill: 'zh:g:hai-also' },
          { id: 'zh:les:he-and', label: '1.15d', title: '和 joins nouns', shape: 'pattern', minutes: 6, skill: 'zh:g:he-nouns' },
        ],
      },
      {
        id: '1.16',
        title: "Didn't, don't, let's",
        prereqs: ['1.3', '1.7', '1.12'],
        lessons: [
          { id: 'zh:les:mei-did-not-happen', label: '1.16a', title: "没 says it didn't happen", shape: 'pattern', minutes: 6, skill: 'zh:g:mei-verb' },
          { id: 'zh:les:mei-vs-bu', label: '1.16b', title: '没 looks back; 不 looks at habits and ahead', shape: 'pattern', minutes: 7, skill: 'zh:g:mei-vs-bu' },
          { id: 'zh:les:ba-suggestion', label: '1.16c', title: '吧 softens a suggestion', shape: 'pattern', minutes: 6, skill: 'zh:g:ba-suggestion' },
          { id: 'zh:les:buyao-dont', label: '1.16d', title: '不要 + verb tells someone not to', shape: 'pattern', minutes: 6, skill: 'zh:g:buyao-dont' },
        ],
      },
      {
        id: '1.17',
        title: 'Asking whether',
        prereqs: ['1.16', '0.10', '0.11'],
        lessons: [
          { id: 'zh:les:a-not-a', label: '1.17a', title: 'Verb-不-verb asks yes or no', shape: 'pattern', minutes: 10, skill: 'zh:g:a-not-a' },
          { id: 'zh:les:tag-questions', label: '1.17b', title: 'A tag checks or proposes', shape: 'pattern', minutes: 9, skill: 'zh:g:tag-questions' },
        ],
      },
      {
        id: '1.18',
        title: 'Now and changed (first pass)',
        prereqs: ['1.11', '1.14', '1.16'],
        lessons: [
          { id: 'zh:les:le-new-situation', label: '1.18a', title: 'Final 了 says something is new', shape: 'pattern', minutes: 6, skill: 'zh:g:le-new-situation' },
          { id: 'zh:les:verb-le-done', label: '1.18b', title: "Verb + 了 says it's done", shape: 'clip', minutes: 13, skill: 'zh:g:verb-le-done' },
          { id: 'zh:les:zai-ongoing', label: '1.18c', title: "在 + verb says it's happening now", shape: 'pattern', minutes: 7, skill: 'zh:g:zai-ongoing' },
        ],
      },
      {
        id: '1.19',
        title: 'Checkpoint',
        prereqs: ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8', '1.9', '1.10', '1.11', '1.12', '1.13', '1.14', '1.15', '1.16', '1.17', '1.18'],
        lessons: [
          { id: 'zh:les:s1-checkpoint-clips', label: '1.19a', title: 'Checkpoint: unseen clips', shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:s1-checkpoint-words', label: '1.19b', title: 'Checkpoint: words in new voices', shape: 'checkpoint', minutes: 6, skill: null },
          { id: 'zh:les:s1-checkpoint-confusables', label: '1.19c', title: 'Checkpoint: S1 confusables', shape: 'checkpoint', minutes: 7, skill: null },
        ],
      },
    ],
  },
  {
    id: 'S2',
    title: 'Base vocabulary',
    maxOutput: 1,
    assumes: ['S1'],
    units: [
      {
        id: '2.1',
        title: 'What happened (了 second pass)',
        prereqs: ['1.18', '1.16'],
        lessons: [
          { id: 'zh:les:le-done-amount', label: '2.1a', title: '了 plus an amount: the action is done', shape: 'pattern', minutes: 6, skill: 'zh:g:le-done-vs-plan' },
          { id: 'zh:les:mei-drops-le', label: '2.1b', title: '没 drops the 了', shape: 'pattern', minutes: 6, skill: 'zh:g:le-question-answer' },
        ],
      },
      {
        id: '2.2',
        title: 'Things changed',
        prereqs: ['2.1'],
        lessons: [
          { id: 'zh:les:le-time-age-reached', label: '2.2a', title: "了 after a time or age says it's reached", shape: 'pattern', minutes: 6, skill: 'zh:g:le-change-time-age' },
          { id: 'zh:les:bu-le-not-anymore', label: '2.2b', title: '不…了 means not any more', shape: 'pattern', minutes: 6, skill: 'zh:g:bu-le' },
          { id: 'zh:les:kuai-le-about-to', label: '2.2c', title: "快…了 says it's about to happen", shape: 'pattern', minutes: 6, skill: 'zh:g:kuai-yao-le' },
          { id: 'zh:les:le-verb-vs-sentence', label: '2.2d', title: '了 after the verb is done; at the end, new', shape: 'pattern', minutes: 6, skill: 'zh:g:le1-vs-le2' },
        ],
      },
      {
        id: '2.3',
        title: 'Experiences',
        prereqs: ['2.1'],
        lessons: [
          { id: 'zh:les:guo-ever', label: '2.3a', title: "过 says you've done it before", shape: 'pattern', minutes: 6, skill: 'zh:g:guo-experience' },
          { id: 'zh:les:le-vs-guo', label: '2.3b', title: '了 is this time; 过 is ever', shape: 'pattern', minutes: 6, skill: 'zh:g:le-vs-guo' },
          { id: 'zh:les:travel-with-guo', label: '2.3c', title: 'Travel stories run on 过', shape: 'clip', minutes: 7, skill: 'zh:l:travel-story-guo' },
        ],
      },
      {
        id: '2.4',
        title: 'Colors',
        prereqs: ['1.3'],
        lessons: [
          { id: 'zh:les:colors-basic', label: '2.4a', title: '红色, 白色, 黑色: what color is it?', shape: 'pattern', minutes: 5, skill: 'zh:v:colors-basic' },
          { id: 'zh:les:colors-more', label: '2.4b', title: '绿色, 蓝, 黄色, and 红 before a noun', shape: 'pattern', minutes: 5, skill: 'zh:v:colors-more' },
        ],
      },
      {
        id: '2.5',
        title: 'At once and ongoing',
        prereqs: ['1.18', '2.4'],
        lessons: [
          { id: 'zh:les:zhe-state', label: '2.5a', title: '着 says a state holds', shape: 'pattern', minutes: 9, skill: 'zh:g:zhe-state' },
          { id: 'zh:les:zai-vs-zhe', label: '2.5b', title: '在 is doing it; 着 is staying that way', shape: 'pattern', minutes: 6, skill: 'zh:g:zai-vs-zhe' },
          { id: 'zh:les:two-at-once', label: '2.5c', title: '一边 and 着 put two actions together', shape: 'pattern', minutes: 6, skill: 'zh:g:simultaneous' },
        ],
      },
      {
        id: '2.6',
        title: 'Results',
        prereqs: ['2.1'],
        lessons: [
          { id: 'zh:les:wan-finished', label: '2.6a', title: '完 says the job is finished', shape: 'pattern', minutes: 6, skill: 'zh:g:result-wan' },
          { id: 'zh:les:dao-jian-got-it', label: '2.6b', title: '到 and 见 say you got it', shape: 'pattern', minutes: 6, skill: 'zh:g:result-dao-jian' },
          { id: 'zh:les:mei-result', label: '2.6c', title: "没 + result: tried, but it didn't work", shape: 'pattern', minutes: 6, skill: 'zh:g:mei-result' },
          { id: 'zh:les:results-in-story', label: '2.6d', title: "Results carry a story's turns", shape: 'clip', minutes: 7, skill: 'zh:l:results-story' },
        ],
      },
      {
        id: '2.7',
        title: 'Should, must, want, will',
        prereqs: ['1.13', '2.2'],
        lessons: [
          { id: 'zh:les:yao-vs-xiang', label: '2.7a', title: '要 has decided; 想 would like', shape: 'pattern', minutes: 6, skill: 'zh:g:yao-vs-xiang' },
          { id: 'zh:les:yinggai-vs-dei', label: '2.7b', title: '应该 advises; 得 says you have to', shape: 'pattern', minutes: 6, skill: 'zh:g:yinggai-vs-dei' },
          { id: 'zh:les:hui-will', label: '2.7c', title: '会 also predicts: it will happen', shape: 'pattern', minutes: 6, skill: 'zh:g:hui-will-vs-can' },
        ],
      },
      {
        id: '2.8',
        title: 'Asking and telling',
        prereqs: ['1.16', '2.2'],
        lessons: [
          { id: 'zh:les:yixia-brief', label: '2.8a', title: '一下 and doubled verbs keep it brief', shape: 'pattern', minutes: 6, skill: 'zh:g:verb-yixia-vv' },
          { id: 'zh:les:bie-dont', label: '2.8b', title: '别 tells someone not to', shape: 'pattern', minutes: 6, skill: 'zh:g:bie' },
          { id: 'zh:les:qing-jiao-rang', label: '2.8c', title: 'After 请, 叫 and 让, the person acts', shape: 'pattern', minutes: 6, skill: 'zh:g:pivot-qing-jiao-rang' },
        ],
      },
      {
        id: '2.9',
        title: 'To, for, with someone',
        prereqs: ['1.15'],
        lessons: [
          { id: 'zh:les:gei-receiver', label: '2.9a', title: '给 + person marks who gets it', shape: 'pattern', minutes: 6, skill: 'zh:g:gei-person' },
          { id: 'zh:les:gen-together', label: '2.9b', title: '跟 + person: you do it together', shape: 'pattern', minutes: 6, skill: 'zh:g:gen-yiqi' },
          { id: 'zh:les:dui-gen-gei', label: '2.9c', title: '对 points at someone; 跟 is with them', shape: 'pattern', minutes: 6, skill: 'zh:g:dui-gen-gei' },
        ],
      },
      {
        id: '2.10',
        title: 'Counting things',
        prereqs: ['1.6'],
        lessons: [
          { id: 'zh:les:mw-by-shape', label: '2.10a', title: 'The measure word tells the shape', shape: 'pattern', minutes: 11, skill: 'zh:v:mw-shape' },
          { id: 'zh:les:youde-vs-yixie', label: '2.10b', title: '有的 picks some out; 一些 is an amount', shape: 'pattern', minutes: 10, skill: 'zh:g:youde-vs-yixie' },
          { id: 'zh:les:mei-dou-every', label: '2.10c', title: '每…都 says every single one', shape: 'pattern', minutes: 6, skill: 'zh:g:mei-dou' },
        ],
      },
      {
        id: '2.11',
        title: 'Describing with 的',
        prereqs: ['1.7', '2.4'],
        lessons: [
          { id: 'zh:les:de-describes', label: '2.11a', title: 'Everything before 的 describes the noun', shape: 'pattern', minutes: 6, skill: 'zh:g:de-modifier' },
          { id: 'zh:les:de-noun-dropped', label: '2.11b', title: '的 can stand in for the noun', shape: 'pattern', minutes: 6, skill: 'zh:g:de-nominal' },
          { id: 'zh:les:long-de-narration', label: '2.11c', title: 'Long descriptions end at 的', shape: 'clip', minutes: 7, skill: 'zh:l:de-in-narration' },
        ],
      },
      {
        id: '2.12',
        title: 'Time order',
        prereqs: ['2.11', '2.2'],
        lessons: [
          { id: 'zh:les:yiqian-yihou', label: '2.12a', title: '以前 and 以后 follow the event they mark', shape: 'pattern', minutes: 6, skill: 'zh:g:yiqian-yihou' },
          { id: 'zh:les:de-shihou', label: '2.12b', title: '的时候 turns a whole clause into "when"', shape: 'pattern', minutes: 6, skill: 'zh:g:de-shihou' },
          { id: 'zh:les:yijing-le', label: '2.12c', title: '已经…了 says it has already happened', shape: 'pattern', minutes: 6, skill: 'zh:g:yijing-le' },
          { id: 'zh:les:gang-just', label: '2.12d', title: '刚 says it only just happened', shape: 'pattern', minutes: 6, skill: 'zh:g:gang' },
        ],
      },
      {
        id: '2.13',
        title: 'Early, late',
        prereqs: ['2.12'],
        lessons: [
          { id: 'zh:les:yi-jiu', label: '2.13a', title: '一…就: the second thing follows at once', shape: 'pattern', minutes: 6, skill: 'zh:g:yi-jiu' },
          { id: 'zh:les:jiu-vs-cai', label: '2.13b', title: '就 is early or easy; 才 is late or hard', shape: 'pattern', minutes: 9, skill: 'zh:g:jiu-vs-cai' },
        ],
      },
      {
        id: '2.14',
        title: 'Where and which way',
        prereqs: ['1.9', '2.1', '2.5'],
        lessons: [
          { id: 'zh:les:verb-zai', label: '2.14a', title: '在 after the verb: where it ends up', shape: 'pattern', minutes: 6, skill: 'zh:g:verb-zai-place' },
          { id: 'zh:les:place-first', label: '2.14b', title: "Place first: what's there, who came or left", shape: 'pattern', minutes: 6, skill: 'zh:g:existential-appearance' },
          { id: 'zh:les:lai-vs-qu', label: '2.14c', title: '来 comes toward the speaker; 去 goes away', shape: 'pattern', minutes: 6, skill: 'zh:g:lai-vs-qu' },
        ],
      },
      {
        id: '2.15',
        title: 'Getting around',
        prereqs: ['2.14'],
        lessons: [
          { id: 'zh:les:cong-dao', label: '2.15a', title: '从 A 到 B: where it starts and ends', shape: 'pattern', minutes: 8, skill: 'zh:g:cong-dao' },
          { id: 'zh:les:li-distance', label: '2.15b', title: '离 measures how far, not where from', shape: 'pattern', minutes: 6, skill: 'zh:g:li-distance' },
          { id: 'zh:les:means-then-go', label: '2.15c', title: 'How you go comes before where you go', shape: 'pattern', minutes: 10, skill: 'zh:g:vehicle-serial' },
        ],
      },
      {
        id: '2.16',
        title: 'Midpoint checkpoint',
        prereqs: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13', '2.14', '2.15'],
        lessons: [
          { id: 'zh:les:s2-mid-clips', label: '2.16a', title: "You can follow clips you've never heard", shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:s2-mid-confusables', label: '2.16b', title: "You can tell S2's look-alikes apart", shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:s2-mid-decoding', label: '2.16c', title: 'You can catch the small words at speed', shape: 'checkpoint', minutes: 7, skill: null },
        ],
      },
      {
        id: '2.17',
        title: 'Comparing',
        prereqs: ['1.3', '1.7', '2.9'],
        lessons: [
          { id: 'zh:les:bi-comparison', label: '2.17a', title: '比 puts the yardstick in the middle', shape: 'pattern', minutes: 19, skill: 'zh:g:bi-comparison' },
          { id: 'zh:les:meiyou-not-as', label: '2.17b', title: '没有 says "not as … as"', shape: 'pattern', minutes: 6, skill: 'zh:g:meiyou-comparison' },
          { id: 'zh:les:bi-by-how-much', label: '2.17c', title: 'The gap comes after the adjective', shape: 'pattern', minutes: 6, skill: 'zh:g:bi-amount' },
          { id: 'zh:les:gen-yiyang-same', label: '2.17d', title: '跟…一样 says they match', shape: 'pattern', minutes: 12, skill: 'zh:g:gen-yiyang' },
        ],
      },
      {
        id: '2.18',
        title: 'More and more, a bit too',
        prereqs: ['2.17', '2.2', '2.5'],
        lessons: [
          { id: 'zh:les:youdianr-vs-yidianr', label: '2.18a', title: '有点儿 complains; 一点儿 compares', shape: 'pattern', minutes: 6, skill: 'zh:g:youdianr-vs-yidianr' },
          { id: 'zh:les:you-you-both', label: '2.18b', title: '又…又 stacks two qualities', shape: 'pattern', minutes: 6, skill: 'zh:g:you-you' },
          { id: 'zh:les:yue-yue', label: '2.18c', title: '越 ties one change to another', shape: 'pattern', minutes: 12, skill: 'zh:g:yue-yue' },
        ],
      },
      {
        id: '2.19',
        title: 'Big and rough numbers',
        prereqs: ['1.5', '1.10'],
        lessons: [
          { id: 'zh:les:wan-four-digit-groups', label: '2.19a', title: '万 groups digits in fours', shape: 'pattern', minutes: 14, skill: 'zh:g:wan-numbers' },
          { id: 'zh:les:rough-numbers', label: '2.19b', title: '几, 多 and 左右 make a number rough', shape: 'pattern', minutes: 6, skill: 'zh:g:approximate-numbers' },
          { id: 'zh:les:ban-position', label: '2.19c', title: '半 sits before or after the measure word', shape: 'pattern', minutes: 8, skill: 'zh:g:ban-position' },
        ],
      },
      {
        id: '2.20',
        title: 'Linking clauses',
        prereqs: ['1.14'],
        lessons: [
          { id: 'zh:les:yinwei-suoyi', label: '2.20a', title: '因为 gives the reason; 所以 the result', shape: 'pattern', minutes: 19, skill: 'zh:g:yinwei-suoyi' },
          { id: 'zh:les:suiran-danshi', label: '2.20b', title: 'After 虽然, expect a "but"', shape: 'pattern', minutes: 18, skill: 'zh:g:suiran-danshi' },
          { id: 'zh:les:budan-erqie', label: '2.20c', title: '不但…而且 adds a further point', shape: 'pattern', minutes: 16, skill: 'zh:g:budan-erqie' },
          { id: 'zh:les:haishi-vs-huozhe', label: '2.20d', title: '还是 asks you to choose; 或者 offers', shape: 'pattern', minutes: 6, skill: 'zh:g:haishi-vs-huozhe' },
        ],
      },
      {
        id: '2.21',
        title: 'How long',
        prereqs: ['2.3', '2.2', '2.12'],
        lessons: [
          { id: 'zh:les:duration-after-verb', label: '2.21a', title: 'How long goes after the verb', shape: 'pattern', minutes: 11, skill: 'zh:g:duration-complement' },
          { id: 'zh:les:double-le-ongoing', label: '2.21b', title: 'A second 了 says it runs up to now', shape: 'pattern', minutes: 6, skill: 'zh:g:double-le' },
          { id: 'zh:les:split-verbs', label: '2.21c', title: 'Split verbs take 了 and durations inside', shape: 'pattern', minutes: 18, skill: 'zh:g:separable-verbs' },
        ],
      },
      {
        id: '2.22',
        title: 'How often, again',
        prereqs: ['2.3', '2.2', '2.21', '2.18'],
        lessons: [
          { id: 'zh:les:ci-vs-bian', label: '2.22a', title: '次 counts times; 遍 counts run-throughs', shape: 'pattern', minutes: 6, skill: 'zh:g:ci-bian' },
          { id: 'zh:les:zai-again-later', label: '2.22b', title: '再 says again, later', shape: 'pattern', minutes: 13, skill: 'zh:g:zai-again' },
          { id: 'zh:les:you-again-vs-zai-again', label: '2.22c', title: '又 says it already happened again', shape: 'pattern', minutes: 6, skill: 'zh:g:you-again-vs-zai-again' },
        ],
      },
      {
        id: '2.23',
        title: 'Direction after the verb',
        prereqs: ['2.14', '2.6'],
        lessons: [
          { id: 'zh:les:verb-lai-qu', label: '2.23a', title: '来 points at the speaker; 去 points away', shape: 'pattern', minutes: 16, skill: 'zh:g:direction-lai-qu' },
          { id: 'zh:les:direction-path', label: '2.23b', title: 'The direction word draws the path', shape: 'pattern', minutes: 6, skill: 'zh:g:direction-path' },
          { id: 'zh:les:compound-direction', label: '2.23c', title: 'Path plus 来 or 去 stacks', shape: 'pattern', minutes: 9, skill: 'zh:g:direction-compound' },
          { id: 'zh:les:direction-figurative', label: '2.23d', title: '起来 and 下去 can leave space behind', shape: 'pattern', minutes: 6, skill: 'zh:g:direction-figurative' },
        ],
      },
      {
        id: '2.24',
        title: 'How well: 得',
        prereqs: ['2.17', '2.7'],
        lessons: [
          { id: 'zh:les:de-how-well', label: '2.24a', title: '得 after a verb says how it went', shape: 'pattern', minutes: 13, skill: 'zh:g:de-degree' },
          { id: 'zh:les:de-bi-compare', label: '2.24b', title: '得 plus 比 compares how well', shape: 'pattern', minutes: 6, skill: 'zh:g:de-bi' },
        ],
      },
      {
        id: '2.25',
        title: 'How: 地 and doubled adjectives',
        prereqs: ['2.11', '2.24', '2.18'],
        lessons: [
          { id: 'zh:les:doubled-adjectives', label: '2.25a', title: 'Doubled adjectives paint the picture', shape: 'pattern', minutes: 14, skill: 'zh:g:adjective-reduplication' },
          { id: 'zh:les:di-manner', label: '2.25b', title: '地 hands a manner to the verb', shape: 'pattern', minutes: 16, skill: 'zh:g:di-adverbial' },
          { id: 'zh:les:de-de-de-position', label: '2.25c', title: 'Position tells 的, 地 and 得 apart', shape: 'pattern', minutes: 23, skill: 'zh:g:de-de-de' },
        ],
      },
      {
        id: '2.26',
        title: "Can or can't",
        prereqs: ['2.6', '2.23', '2.24'],
        lessons: [
          { id: 'zh:les:potential-bu', label: '2.26a', title: "不 inside the verb says it can't happen", shape: 'pattern', minutes: 13, skill: 'zh:g:potential-bu' },
          { id: 'zh:les:potential-de', label: '2.26b', title: '得 inside the verb says it can', shape: 'pattern', minutes: 6, skill: 'zh:g:potential-de' },
          { id: 'zh:les:mei-result-vs-potential', label: '2.26c', title: "没听懂 didn't happen; 听不懂 can't", shape: 'pattern', minutes: 14, skill: 'zh:g:result-vs-potential' },
        ],
      },
      {
        id: '2.27',
        title: 'When, where, how it happened',
        prereqs: ['2.1', '2.12', '2.15'],
        lessons: [
          { id: 'zh:les:shi-de-focus', label: '2.27a', title: '是…的 spotlights when, where or how', shape: 'pattern', minutes: 12, skill: 'zh:g:shi-de' },
          { id: 'zh:les:shi-de-vs-le', label: '2.27b', title: '了 brings news; 是…的 explains known events', shape: 'pattern', minutes: 16, skill: 'zh:g:shi-de-vs-le' },
        ],
      },
      {
        id: '2.28',
        title: 'If and only if',
        prereqs: ['2.20', '2.13'],
        lessons: [
          { id: 'zh:les:ruguo-dehua', label: '2.28a', title: '如果 and 的话 set a condition', shape: 'pattern', minutes: 11, skill: 'zh:g:ruguo-dehua' },
          { id: 'zh:les:zhiyao-jiu', label: '2.28b', title: '只要 says one thing is enough', shape: 'pattern', minutes: 14, skill: 'zh:g:zhiyao-jiu' },
          { id: 'zh:les:zhiyou-cai', label: '2.28c', title: '只有…才 names the only way', shape: 'pattern', minutes: 6, skill: 'zh:g:zhiyou-vs-zhiyao' },
        ],
      },
      {
        id: '2.29',
        title: 'Everything and nothing',
        prereqs: ['1.2', '1.6', '1.15', '2.18'],
        lessons: [
          { id: 'zh:les:qw-dou-every', label: '2.29a', title: 'A question word plus 都 means every', shape: 'pattern', minutes: 13, skill: 'zh:g:qw-dou' },
          { id: 'zh:les:qw-indefinite', label: '2.29b', title: 'Question words can mean "some-"', shape: 'pattern', minutes: 6, skill: 'zh:g:qw-indefinite' },
          { id: 'zh:les:yi-ye-bu', label: '2.29c', title: '一…也不 says not a single one', shape: 'pattern', minutes: 6, skill: 'zh:g:yi-ye-bu' },
          { id: 'zh:les:chule-besides-except', label: '2.29d', title: '除了 with 也 adds; with 都 excludes', shape: 'pattern', minutes: 30, skill: 'zh:g:chule' },
        ],
      },
      {
        id: '2.30',
        title: 'Doing it to something: 把',
        prereqs: ['2.14', '2.6', '2.23'],
        lessons: [
          { id: 'zh:les:ba-placement', label: '2.30a', title: '把 names the thing, then where it goes', shape: 'pattern', minutes: 16, skill: 'zh:g:ba-placement' },
          { id: 'zh:les:ba-result', label: '2.30b', title: '把 plus a result says what became of it', shape: 'pattern', minutes: 6, skill: 'zh:g:ba-result' },
        ],
      },
      {
        id: '2.31',
        title: 'Happening to you: 被',
        prereqs: ['2.30'],
        lessons: [
          { id: 'zh:les:bei-passive', label: '2.31a', title: '被 says it happened to someone', shape: 'pattern', minutes: 28, skill: 'zh:g:bei' },
          { id: 'zh:les:topic-first-no-bei', label: '2.31b', title: 'The thing can come first with no 被', shape: 'pattern', minutes: 6, skill: 'zh:g:notional-passive' },
          { id: 'zh:les:ba-vs-bei', label: '2.31c', title: '把 and 被 swap who acts on whom', shape: 'pattern', minutes: 6, skill: 'zh:g:ba-vs-bei' },
        ],
      },
      {
        id: '2.32',
        title: 'Real-speed speech',
        prereqs: ['1.2', '1.16', '2.28'],
        lessons: [
          { id: 'zh:les:fillers', label: '2.32a', title: 'Fillers buy time; the meaning comes after', shape: 'pattern', minutes: 11, skill: 'zh:l:fillers' },
          { id: 'zh:les:final-particles-tone', label: '2.32b', title: '啊, 呢 and 吧 set the tone', shape: 'pattern', minutes: 23, skill: 'zh:g:final-particles' },
          { id: 'zh:les:bushi-ma-reminder', label: '2.32c', title: '不是…吗 reminds rather than asks', shape: 'pattern', minutes: 7, skill: 'zh:g:bushi-ma' },
          { id: 'zh:les:first-real-speed-interview', label: '2.32d', title: 'Real speed: one topic, many speakers', shape: 'clip', minutes: 7, skill: 'zh:l:real-speed-narrow' },
        ],
      },
      {
        id: '2.33',
        title: 'Checkpoint',
        prereqs: ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13', '2.14', '2.15', '2.16', '2.17', '2.18', '2.19', '2.20', '2.21', '2.22', '2.23', '2.24', '2.25', '2.26', '2.27', '2.28', '2.29', '2.30', '2.31', '2.32'],
        lessons: [
          { id: 'zh:les:s2b-checkpoint-cartoon', label: '2.33a', title: 'Checkpoint: an unseen cartoon', shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:s2b-checkpoint-speech', label: '2.33b', title: 'Checkpoint: unseen speech and a story', shape: 'checkpoint', minutes: 7, skill: null },
          { id: 'zh:les:s2b-checkpoint-confusables', label: '2.33c', title: 'Checkpoint: second-half confusables', shape: 'checkpoint', minutes: 7, skill: null },
        ],
      },
    ],
  },
]
