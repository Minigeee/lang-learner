---
cards:
  - { kind: sentence, clip: clip:cv-neg-999, note: zh:g:bu-vs-mei }
---

:::hear
```@clip-stage
clip: clip:lc-busy-weekend-01
```
:::

:::explain
## A claim heading
See :k{#zh:g:mei-past-negaton} and :w[行]. The word :w[咖啡]{#zh:w:咖啡:ka1fei4} has the wrong tone.
:::

:::we-do
```@meaning-pick
target: zh:g:bu-vs-mei
options:
  - { key: wont, label: Won't }
  - { key: didnt, label: Didn't happen }
items:
  - { line: 他没去。, answer: didnt }
```

```@clip-stage-x
clip: { slot: hear }
```

```@tap-when-you-hear
clip: { slot: story }
targets:
  - { item: zh:g:bu-mei, label: No }
```
:::

:::you-do
```@gist-question
clip: clip:mc-lazy-sunday-02
```
:::

:::recap
- One.
- Two.
- Three.
:::
