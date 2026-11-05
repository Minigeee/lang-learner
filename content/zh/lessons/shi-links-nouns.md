---
idea: 是 links a person to what they are.
cards: [zh:w:是:shi4, zh:w:我:wo3, zh:w:他:ta1, zh:w:学生:xue2sheng5, zh:w:老师:lao3shi1]
names: [王明, 李红]
skill:
  pool:
    - { line: 我是老师，王明是学生。, answer: me, rung: 4 }
    - { line: 他是老师，王明是学生。, answer: he, rung: 4 }
    - { line: 王明是老师，我是学生。, answer: wm, rung: 4 }
    - { line: 李红是老师，我是学生。, answer: lh, rung: 4 }
    - { line: 王明是学生，我是老师。, answer: me, rung: 4 }
    - { line: 他是老师，李红是学生。, answer: he, rung: 4 }
    - { line: 我是学生，王明是老师。, answer: wm, rung: 4 }
    - { line: 我是学生，李红是老师。, answer: lh, rung: 4 }
    - { line: 我是老师，李红是学生。, answer: me, rung: 4 }
    - { line: 他是学生，王明是老师。, answer: wm, rung: 4 }
    - { line: 他是学生，李红是老师。, answer: lh, rung: 4 }
deeper:
  - question: Is 是 only for people?
    answer: No. It links any two nouns, and later lessons use it for things too.
  - question: Does 是 change with the person or the time?
    answer: No. It has one form for I, he and you, and for past, present and future.
  - question: Does 是 work with adjectives?
    answer: Usually not. Most adjectives take 很 instead, and a later lesson shows how.
---

:::opener{type=discover}
:ex[我是北京人。]
:ex[他是美国人。]
:ex[你是英雄。]
:ex[我是实习教师。]
:ex[他是个摄影师。]
:ex[她是我高中老师。]

```yaml
video: { youtubeId: re6GOiJOYvE, role: supplemental, durationSec: 187 }
hook:
  prompt: What's the pattern?
  options: [是 sits between who and what, 是 comes at the end, 是 comes first]
```
:::

:::lesson
是 sits between a person and what they are. The person comes first, and what they are comes last: :ex[我是学生。]

```yaml
figure: slot-bands
video: { youtubeId: WDoyhfSUpII, role: supplemental, durationSec: 95 }
wrong: 我学生。
right: 我是学生。
```
:::

:::examples
:ex[我是学生。]{en="I'm a student."}
:ex[他是老师。]{en="He's a teacher."}
:ex[李红是学生。]{en="Li Hong is a student."}
:ex[王明是老师。]{en="Wang Ming is a teacher."}
:ex[他是学生，李红是老师。]{en="He's a student, and Li Hong is a teacher."}

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
  - { key: wm, label: Wang Ming }
  - { key: lh, label: Li Hong }
items:
  - { line: 我是老师。, answer: me, rung: 3 }
  - { line: 李红是老师。, answer: lh, rung: 3 }
  - { line: 他是老师。, answer: he, rung: 3 }
  - { line: 王明是老师。, answer: wm, rung: 3 }
  - { line: 他是老师，我是学生。, answer: he, rung: 4 }
  - { line: 我是老师，他是学生。, answer: me, rung: 4 }
  - { line: 王明是老师，李红是学生。, answer: wm, rung: 4 }
  - { line: 李红是老师，王明是学生。, answer: lh, rung: 4 }
  - { line: 我是学生，他是老师。, answer: he, rung: 4 }
  - { line: 他是学生，我是老师。, answer: me, rung: 4 }
  - { line: 李红是学生，王明是老师。, answer: wm, rung: 4 }
  - { line: 王明是学生，李红是老师。, answer: lh, rung: 4 }
```
:::
