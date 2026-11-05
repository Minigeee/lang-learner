---
idea: The same words, in voices you haven't heard.
---

:::practice{format=C0}
```yaml
prompt: Which tone?
options:
  - { key: '1', label: ā 1, target: true }
  - { key: '4', label: à 4, target: true }
items:
  - { syllable: ma1, answer: '1', target: zh:sc:tone-1234, rung: 1 }
```
:::

:::practice{format=C0}
```yaml
prompt: Who is it?
items:
  - line: 他是老师。
    answer: t
    target: zh:g:shi-links-nouns
    rung: 4
    options:
      - { key: t, label: A teacher }
      - { key: s, label: A student }
```
:::
