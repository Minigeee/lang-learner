---
idea: 是 joins who someone is to what they are.
cards: [zh:w:学生:xue2sheng5, zh:w:老师:lao3shi1]
skill:
  pool:
    - { line: 他是学生。, answer: he, rung: 4 }
deeper:
  - question: Is 是 always "is"?
    answer: It links two nouns. Adjectives work differently, and a later lesson shows how.
---

:::opener{type=discover}
:ex[我是学生。]
:ex[他是老师。]

```yaml
video: { youtubeId: aaaaaaaaaaa, role: supplemental, durationSec: 107 }
hook:
  prompt: What does 是 do?
  options: [It joins two nouns, It asks a question, It says no]
```
:::

:::lesson
是 joins two nouns: who, then what they are. :ex[我是学生。] says it in one line, and :w[学生] comes last.

```yaml
figure: slot-bands
wrong: 我学生。
right: 我是学生。
```
:::

:::examples
:ex[我是学生。]{en="I'm a student."}
:ex[他是老师。]{en="He's a teacher." clip="clip:a3-ta-laoshi-1"}

```yaml
highlight: [是]
```
:::

:::practice{format=C0}
```yaml
prompt: Who is the teacher?
options:
  - { key: he, label: He is }
  - { key: me, label: I am }
items:
  - { line: 他是老师。, answer: he, rung: 4 }
  - { line: 我是老师。, answer: me, rung: 4 }
```
:::
