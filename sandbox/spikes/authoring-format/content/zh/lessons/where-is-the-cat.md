---
clips:
  story:
    want: { exemplifies: [zh:g:place-you-thing, zh:g:zai-location], maxSec: 90 }
    candidates: [clip:mc-where-cat-01, clip:gs-cat-hides-01]
  check:
    want: { exemplifies: [zh:g:place-you-thing], maxSec: 45, novelty: unseen, hasQuestions: true, speaker: { notIn: [story] } }
    candidates: [clip:mc-my-room-02, clip:lc-my-home-03, clip:gs-dog-garden-01]
cards:
  - { kind: sentence, clip: clip:mc-where-cat-01, note: zh:g:place-you-thing }
---

:::hear
```@clip-stage
clip: { slot: story }
passes: 3
prompt: Where does the cat end up?
```
:::

:::explain
## 有 starts from the place; 在 starts from the thing

The story uses two shapes for the same scene. :ex[床上有一只猫！] starts with the place and says what is there. :ex[我的猫在外边。] starts with a known thing and says where it is. The place word still comes after its noun in both: 床上, 椅子下边.

Use 有 to introduce something new, and 在 to locate something you already know about. That is why the story says "a cat" with 有 and "my cat" with 在.
:::

:::we-do
```@tap-when-you-hear
clip: { slot: story }
targets:
  - { item: zh:g:place-you-thing, label: 有 · there is }
  - { item: zh:g:zai-location, label: 在 · is at }
```

```@meaning-pick
target: zh:g:zai-location
ask: Where is it?
options:
  - { key: on-table, label: On the table }
  - { key: under-chair, label: Under the chair }
  - { key: on-bed, label: On the bed }
  - { key: behind-door, label: Behind the door }
  - { key: under-bed, label: Under the bed }
items:
  - { line: 桌子上有一本书。, answer: on-table, target: zh:g:place-you-thing }
  - { line: 床上有一只猫！, answer: on-bed, target: zh:g:place-you-thing }
  - { line: 它在门后边睡觉。, answer: behind-door }
  - { line: 小猫在床下边。, answer: under-bed }
```

```@shadow
clip: clip:mc-where-cat-01
optional: true
```
:::

:::you-do
```@gist-question
clip: { slot: check }
```
:::

:::recap
- 有 starts from a place and introduces something new there.
- 在 starts from a known thing and says where it is.
- The place word follows its noun: 桌子上, 门后边.
:::
