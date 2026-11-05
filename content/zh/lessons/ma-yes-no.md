---
idea: Add 吗 and a statement becomes a yes-no question.
cards: [zh:w:她:ta1, zh:w:吗:ma5, zh:w:同学:tong2xue2]
names: [王明, 李红, 张伟, 穆拉德, 考特尼]
skill:
  pool:
    - { line: 李红是学生吗？, answer: ask, rung: 4 }
    - { line: 李红是学生。, answer: tell, rung: 4 }
    - { line: 张伟是老师。, answer: tell, rung: 4 }
    - { line: 张伟是老师吗？, answer: ask, rung: 4 }
    - { line: 王明是你同学吗？, answer: ask, rung: 4 }
    - { line: 王明是你同学。, answer: tell, rung: 4 }
    - { line: 他叫王明。, answer: tell, rung: 4 }
    - { line: 他叫王明吗？, answer: ask, rung: 4 }
    - { line: 你是老师吗？, answer: ask, rung: 4 }
    - { line: 你是老师。, answer: tell, rung: 4 }
    - { line: 是穆拉德吗？, answer: ask, rung: 4 }
    - { line: 我是考特尼。, answer: tell, rung: 4 }
deeper:
  - question: Can 吗 go on any sentence?
    answer: Not on one that's already a question, such as one with 什么 or 谁.
  - question: How do I say yes to a question with 是?
    answer: Say 是. Saying no comes in a later lesson.
---

:::opener{type=showdown}
:ex[他是老师。]{clip="clip:tts-a-tashilaoshi"}
:ex[他是老师吗？]{clip="clip:tts-a-tashilaoshima"}

```yaml
hook:
  prompt: Which one asks?
  options: [The first one, The second one]
```
:::

:::lesson
Put :w[吗]{#zh:w:吗:ma5} on the end of a statement and it asks yes or no. No word moves, and the voice doesn't have to rise. After its 吗 part, the video previews a later lesson.

```yaml
video: { youtubeId: uvtZpiQs4sI, role: main, durationSec: 802 }
```
:::

:::examples
:ex[他是老师。]{en="He's a teacher."}
:ex[他是老师吗？]{en="Is he a teacher?"}
:ex[她是学生。]{en="She's a student."}
:ex[她是学生吗？]{en="Is she a student?"}
:ex[他是你同学。]{en="He's your classmate."}
:ex[他是你同学吗？]{en="Is he your classmate?"}

```yaml
highlight: [吗]
```
:::

:::practice{format=C0}
```yaml
prompt: Asking or telling?
options:
  - { key: ask, label: Asking }
  - { key: tell, label: Telling }
items:
  - { line: 你是学生吗？, answer: ask, rung: 4 }
  - { line: 你是学生。, answer: tell, rung: 4 }
  - { line: 他是学生。, answer: tell, rung: 4 }
  - { line: 他是学生吗？, answer: ask, rung: 4 }
  - { line: 她是老师吗？, answer: ask, rung: 4 }
  - { line: 她是老师。, answer: tell, rung: 4 }
  - { line: 王明是老师。, answer: tell, rung: 4 }
  - { line: 王明是老师吗？, answer: ask, rung: 4 }
  - { line: 他叫张伟吗？, answer: ask, rung: 4 }
  - { line: 他叫张伟。, answer: tell, rung: 4 }
  - { line: 她叫李红。, answer: tell, rung: 4 }
  - { line: 她叫李红吗？, answer: ask, rung: 4 }
```
:::
