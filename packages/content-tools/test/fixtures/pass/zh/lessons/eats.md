---
idea: 吃 takes its food after it.
skill:
  pool:
    - { line: 他吃饭。, answer: eats, rung: 4 }
---

:::opener{type=showdown}
:ex[他吃饭。]
:ex[他是学生。]
:::

:::lesson
吃 comes first, then the food.
:::

:::examples
:ex[他吃饭。]{en="He eats."}
:::

:::practice{format=C0}
```yaml
prompt: What is he doing?
options:
  - { key: eats, label: Eating }
  - { key: is, label: Being }
items:
  - { line: 他吃饭。, answer: eats, rung: 4 }
  - { line: 他是学生。, answer: is, rung: 4 }
```
:::
