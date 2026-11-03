// The zh curriculum: order, titles, ideas, teaches/assumes, template (TDD §5.3).
// Only a slice of S0 and S1 is modeled; lessons without a file show as "soon".
import { stage, unit, lesson } from '../../src/curriculum-dsl.ts'

export const curriculum = [
  stage('zh:stage:sounds', 'Sounds', { required: 0, optional: 1 }, [
    unit('zh:unit:yi-bu', '一 and 不', [
      lesson({ id: 'zh:les:bu-tone-change', title: '不 before a 4th tone', template: 'sound',
        idea: '不 is said bú when the next syllable is 4th tone, as in 不是 and 不对.',
        teaches: ['zh:sr:bu-sandhi'] }),
    ]),
  ]),
  stage('zh:stage:survival', 'Stage 1', { required: 1, optional: 1 }, [
    unit('zh:unit:greetings', 'Greetings and names', [
      lesson({ id: 'zh:les:shi-links-nouns', title: '是 links two nouns', template: 'pattern',
        idea: '是 joins two nouns: 我是学生. It never joins a noun to an adjective.',
        teaches: ['zh:g:shi-noun', 'zh:w:是:shi4', 'zh:w:我:wo3', 'zh:w:你:ni3', 'zh:w:他:ta1', 'zh:w:老师:lao3shi1', 'zh:w:学生:xue2sheng5'] }),
    ]),
    unit('zh:unit:describing', 'Describing', [
      lesson({ id: 'zh:les:hen-adjective', title: '很 before an adjective', template: 'pattern',
        idea: 'An adjective follows 很 directly, with no 是, and here 很 doesn\'t mean "very".',
        teaches: ['zh:g:hen-adj', 'zh:w:很:hen3', 'zh:w:好:hao3', 'zh:w:忙:mang2'] }),
      lesson({ id: 'zh:les:bu-negation', title: '不 says no', template: 'pattern',
        idea: '不 before a verb or adjective negates it: 不是, 不忙, 不喝.',
        teaches: ['zh:g:bu-negation', 'zh:w:不:bu4', 'zh:w:喝:he1', 'zh:w:咖啡:ka1fei1', 'zh:w:茶:cha2'],
        assumes: ['zh:sr:bu-sandhi'] }),
    ]),
    unit('zh:unit:this-that', 'This, that, which', [
      lesson({ id: 'zh:les:zhe-na', title: '这 and 那 take a measure word', template: 'pattern',
        idea: '这 and 那 need a measure word before the noun: 这个, 那本书.',
        teaches: ['zh:g:demonstrative-measure', 'zh:w:这:zhe4', 'zh:w:那:na4', 'zh:w:个:ge4', 'zh:w:本:ben3', 'zh:w:书:shu1', 'zh:w:只:zhi1'] }),
    ]),
    unit('zh:unit:family', 'Family', [
      lesson({ id: 'zh:les:you-have', title: '有 for "have"', template: 'pattern',
        idea: '有 means "have" and "there is", and only 没 negates it: 没有, never 不有.',
        teaches: ['zh:g:you-have', 'zh:w:有:you3', 'zh:w:没有:mei2you3', 'zh:w:没:mei2'] }),
    ]),
    unit('zh:unit:where-things-are', 'Where things are', [
      lesson({ id: 'zh:les:zai-where', title: '在 says where something is', template: 'pattern',
        idea: 'Thing + 在 + place says where it is, and 在哪儿 asks it.',
        teaches: ['zh:g:zai-location', 'zh:w:在:zai4', 'zh:w:哪儿:na3r5', 'zh:w:这儿:zhe4r5', 'zh:w:那儿:na4r5'] }),
      lesson({ id: 'zh:les:place-words', title: 'Place words come after the noun', template: 'pattern',
        idea: 'Chinese says "table on", not "on the table": 桌子上, 房间里, 门后边.',
        teaches: ['zh:g:place-words', 'zh:w:上:shang4', 'zh:w:下:xia4', 'zh:w:里:li3', 'zh:w:桌子:zhuo1zi5', 'zh:w:前边:qian2bian5', 'zh:w:后边:hou4bian5'] }),
      lesson({ id: 'zh:les:where-is-the-cat', title: 'Where is the cat?', template: 'clip',
        idea: 'A picture story about a cat that keeps moving. Listen for 在 and 有, and for the place word after each noun.',
        teaches: ['zh:g:place-you-thing', 'zh:w:猫:mao1', 'zh:w:椅子:yi3zi5', 'zh:w:床:chuang2', 'zh:w:外边:wai4bian5'],
        assumes: ['zh:g:zai-location', 'zh:g:place-words', 'zh:w:只:zhi1'] }),
    ]),
    unit('zh:unit:dates-times', 'Dates and times', [
      lesson({ id: 'zh:les:days', title: 'Today, tomorrow, yesterday', template: 'pattern',
        idea: '今天, 明天 and 昨天 sit before the verb, never at the end.',
        teaches: ['zh:w:今天:jin1tian1', 'zh:w:明天:ming2tian1', 'zh:w:昨天:zuo2tian1'] }),
    ]),
    unit('zh:unit:wanting', 'Wanting', [
      lesson({ id: 'zh:les:xiang-would-like', title: '想 + verb: would like to', template: 'pattern',
        idea: '想 before a verb says what you would like to do: 我想喝茶.',
        teaches: ['zh:g:xiang-verb', 'zh:w:想:xiang3', 'zh:w:去:qu4', 'zh:w:吃:chi1', 'zh:w:买:mai3'] }),
    ]),
    unit('zh:unit:didnt-dont-lets', "Didn't, don't, let's", [
      lesson({ id: 'zh:les:mei-didnt', title: '没 + verb: it didn\'t happen', template: 'pattern',
        idea: '没 (or 没有) before a verb says the action didn\'t happen: 我没喝咖啡.',
        teaches: ['zh:g:mei-past-negation'] }),
      lesson({ id: 'zh:les:bu-vs-mei', title: '不 or 没?', template: 'pattern',
        idea: '不 says no to now, habits and plans; 没 says something didn\'t happen. Ask which one the speaker means: a choice, or a missing event.',
        teaches: ['zh:g:bu-vs-mei'],
        assumes: ['zh:w:今天:jin1tian1', 'zh:w:明天:ming2tian1'] }),
      lesson({ id: 'zh:les:ba-suggestion', title: '吧 softens a suggestion', template: 'pattern',
        idea: '吧 at the end turns a statement into a suggestion: 我们走吧.',
        teaches: ['zh:g:ba-suggestion', 'zh:w:吧:ba5'] }),
    ]),
  ]),
]
