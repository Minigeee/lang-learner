---
idea: 是 joins who someone is to what they are.
cards: [zh:w:学生:xue2sheng5, zh:w:老师:lao3shi1, zh:w:你:ni3]
skill:
  pool:
    - { line: 他是学生。, answer: he, rung: 4 }
---

:::opener{type=discover}
:ex[我是学生。]
:::

:::lesson
是 joins two nouns. :k{#zh:g:shi-link-nouns} :w[行] :w[学生]{#zh:w:学生:xue2sheng1}
:::

:::examples
:ex[我是学生。]{en="I'm a student."}
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
