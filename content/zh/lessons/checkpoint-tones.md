---
idea: You can tell tones and tone pairs apart.
---

:::practice{format=C0}
```yaml
prompt: Which tone?
options:
  - { key: '1', label: ā 1, target: true }
  - { key: '2', label: á 2, target: true }
  - { key: '3', label: ǎ 3, target: true }
  - { key: '4', label: à 4, target: true }
items:
  - { syllable: tang1, answer: '1', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: pao2, answer: '2', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: mo3, answer: '3', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: lu4, answer: '4', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: ge1, answer: '1', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: he2, answer: '2', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: zhi3, answer: '3', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: ti4, answer: '4', rung: 1, target: zh:sc:tone-1234 }
  - { syllable: di1, answer: '1', rung: 1, target: zh:sc:tone1-tone4, options: [{ key: '1', label: ā 1, target: true }, { key: '4', label: à 4, target: true }] }
  - { syllable: tan2, answer: '2', rung: 1, target: zh:sc:tone2-tone3, options: [{ key: '2', label: á 2, target: true }, { key: '3', label: ǎ 3, target: true }] }
  - { syllable: ni4, answer: '4', rung: 1, target: zh:sc:tone1-tone4, options: [{ key: '1', label: ā 1, target: true }, { key: '4', label: à 4, target: true }] }
  - { syllable: wei3, answer: '3', rung: 1, target: zh:sc:tone2-tone3, options: [{ key: '2', label: á 2, target: true }, { key: '3', label: ǎ 3, target: true }] }
  - { syllable: bao1, answer: '1', rung: 1, target: zh:sc:tone1-tone4, options: [{ key: '1', label: ā 1, target: true }, { key: '4', label: à 4, target: true }] }
  - { syllable: lao2, answer: '2', rung: 1, target: zh:sc:tone2-tone3, options: [{ key: '2', label: á 2, target: true }, { key: '3', label: ǎ 3, target: true }] }
  - { syllable: shu4, answer: '4', rung: 1, target: zh:sc:tone1-tone4, options: [{ key: '1', label: ā 1, target: true }, { key: '4', label: à 4, target: true }] }
  - { syllable: mai3, answer: '3', rung: 1, target: zh:sc:tone2-tone3, options: [{ key: '2', label: á 2, target: true }, { key: '3', label: ǎ 3, target: true }] }
```
:::

:::practice{format=C0}
```yaml
prompt: Which two tones?
items:
  - { line: 飞机, answer: '1+1', rung: 2, target: zh:sc:pairs-tone1-x, options: [{ key: '1+1', label: 1+1 }, { key: '1+3', label: 1+3 }, { key: '2+1', label: 2+1 }, { key: '4+1', label: 4+1 }] }
  - { line: 学习, answer: '2+2', rung: 2, target: zh:sc:pairs-tone2-x, options: [{ key: '1+2', label: 1+2 }, { key: '2+2', label: 2+2 }, { key: '2+3', label: 2+3 }, { key: '4+2', label: 4+2 }] }
  - { line: 跑步, answer: '3+4', rung: 2, target: zh:sr:half-third, options: [{ key: '2+4', label: 2+4 }, { key: '3+2', label: 3+2 }, { key: '3+4', label: 3+4 }, { key: '4+4', label: 4+4 }] }
  - { line: 电脑, answer: '4+3', rung: 2, target: zh:sc:pairs-tone4-x, options: [{ key: '2+3', label: 2+3 }, { key: '4+1', label: 4+1 }, { key: '4+3', label: 4+3 }, { key: '4+4', label: 4+4 }] }
  - { line: 铅笔, answer: '1+3', rung: 2, target: zh:sc:pairs-tone1-x, options: [{ key: '1+2', label: 1+2 }, { key: '1+3', label: 1+3 }, { key: '1+4', label: 1+4 }, { key: '4+3', label: 4+3 }] }
  - { line: 学校, answer: '2+4', rung: 2, target: zh:sc:pairs-tone2-x, options: [{ key: '1+4', label: 1+4 }, { key: '2+2', label: 2+2 }, { key: '2+4', label: 2+4 }, { key: '4+4', label: 4+4 }] }
  - { line: 汽车, answer: '4+1', rung: 2, target: zh:sc:pairs-tone4-x, options: [{ key: '2+1', label: 2+1 }, { key: '4+1', label: 4+1 }, { key: '4+2', label: 4+2 }, { key: '4+4', label: 4+4 }] }
  - { line: 明天, answer: '2+1', rung: 2, target: zh:sc:pairs-tone2-x, options: [{ key: '2+1', label: 2+1 }, { key: '2+2', label: 2+2 }, { key: '2+4', label: 2+4 }, { key: '3+1', label: 3+1 }] }
  - { line: 起床, answer: '3+2', rung: 2, target: zh:sr:half-third, options: [{ key: '1+2', label: 1+2 }, { key: '3+2', label: 3+2 }, { key: '3+4', label: 3+4 }, { key: '4+2', label: 4+2 }] }
  - { line: 电视, answer: '4+4', rung: 2, target: zh:sc:pairs-tone4-x, options: [{ key: '1+4', label: 1+4 }, { key: '3+4', label: 3+4 }, { key: '4+2', label: 4+2 }, { key: '4+4', label: 4+4 }] }
  - { line: 欢迎, answer: '1+2', rung: 2, target: zh:sc:pairs-tone1-x, options: [{ key: '1+1', label: 1+1 }, { key: '1+2', label: 1+2 }, { key: '1+4', label: 1+4 }, { key: '3+2', label: 3+2 }] }
  - { line: 苹果, answer: '2+3', rung: 2, target: zh:sc:pairs-tone2-x, options: [{ key: '1+3', label: 1+3 }, { key: '2+1', label: 2+1 }, { key: '2+3', label: 2+3 }, { key: '2+4', label: 2+4 }] }
  - { line: 练习, answer: '4+2', rung: 2, target: zh:sc:pairs-tone4-x, options: [{ key: '1+2', label: 1+2 }, { key: '3+2', label: 3+2 }, { key: '4+2', label: 4+2 }, { key: '4+3', label: 4+3 }] }
  - { line: 生日, answer: '1+4', rung: 2, target: zh:sc:pairs-tone1-x, options: [{ key: '1+1', label: 1+1 }, { key: '1+3', label: 1+3 }, { key: '1+4', label: 1+4 }, { key: '3+4', label: 3+4 }] }
  - { line: 小说, answer: '3+1', rung: 2, target: zh:sr:half-third, options: [{ key: '2+1', label: 2+1 }, { key: '3+1', label: 3+1 }, { key: '3+2', label: 3+2 }, { key: '3+4', label: 3+4 }] }
```
:::

:::practice{format=C0}
```yaml
prompt: Which two tones end it?
items:
  - { line: 这真是爆炸新闻。, answer: '1+2', rung: 4, target: zh:sc:pairs-tone1-x, options: [{ key: '1+1', label: 1+1 }, { key: '1+2', label: 1+2 }, { key: '1+4', label: 1+4 }, { key: '3+2', label: 3+2 }] }
  - { line: 希望你考上好学校。, answer: '2+4', rung: 4, target: zh:sc:pairs-tone2-x, options: [{ key: '1+4', label: 1+4 }, { key: '2+2', label: 2+2 }, { key: '2+4', label: 2+4 }, { key: '4+4', label: 4+4 }] }
  - { line: 陈小春现身北京。, answer: '3+1', rung: 4, target: zh:sr:half-third, options: [{ key: '2+1', label: 2+1 }, { key: '3+1', label: 3+1 }, { key: '3+2', label: 3+2 }, { key: '3+4', label: 3+4 }] }
  - { line: 氮气会造成两个问题。, answer: '4+2', rung: 4, target: zh:sc:pairs-tone4-x, options: [{ key: '1+2', label: 1+2 }, { key: '3+2', label: 3+2 }, { key: '4+2', label: 4+2 }, { key: '4+3', label: 4+3 }] }
  - { line: 每个男孩都得到一个苹果。, answer: '2+3', rung: 4, target: zh:sc:pairs-tone2-x, options: [{ key: '1+3', label: 1+3 }, { key: '2+1', label: 2+1 }, { key: '2+3', label: 2+3 }, { key: '2+4', label: 2+4 }] }
```
:::
