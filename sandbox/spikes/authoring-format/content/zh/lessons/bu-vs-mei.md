---
clips:
  hear:
    want: { exemplifies: [zh:g:bu-negation, zh:g:mei-past-negation], maxSec: 30 }
    candidates: [clip:lc-busy-weekend-01, clip:peppa-bedtime-02]
  check:
    want: { exemplifies: [zh:g:bu-vs-mei], maxSec: 45, novelty: unseen, hasQuestions: true, speaker: { notIn: [hear] } }
    candidates: [clip:mc-lazy-sunday-02, clip:mc-after-school-01, clip:mc-market-03]
cards:
  - { kind: sentence, clip: clip:cv-neg-002, note: zh:g:bu-vs-mei }
---

:::hear
```@clip-stage
clip: { slot: hear }
prompt: Which things won't she do, and which didn't happen?
```
:::

:::explain
## 不 says no to a choice; 没 says an event is missing

Both words mean "not", but they answer different questions. 不 refuses or denies something now, as a habit, or as a plan: :ex[我今天不喝咖啡。]{clip=clip:cv-neg-001}. 没 reports that something didn't happen: :ex[我昨天没喝咖啡。]{clip=clip:cv-neg-002}.

```@contrast-table
columns: [Now, habit or plan, Didn't happen]
rows:
  - { label: drink coffee, cells: [我今天不喝咖啡。, 我昨天没喝咖啡。] }
  - { label: go, cells: [我明天不去。, 他没去。] }
  - { label: eat, cells: [他不吃肉。, 他没吃饭。] }
```

## Past time doesn't decide it

A past habit still takes 不: :ex[以前我不喝咖啡。]{clip=clip:cv-neg-006} says what was usually true, not that one coffee was skipped. Ask whether a single event failed to happen. If it did, use 没.

:bad[我昨天不去公司。] → :ex[我昨天没去公司。]{clip=clip:lc-busy-weekend-01}

## 是 and adjectives only take 不

There is no event to be missing in "she isn't a teacher" or "I'm not busy", so :ex[她不是老师。]{clip=clip:cv-neg-005} and :ex[我今天不忙。]{clip=clip:cv-neg-009} keep 不. :k{#zh:g:you-have} is the one verb that only takes 没.
:::

:::we-do
```@meaning-pick
target: zh:g:bu-vs-mei
ask: Does it refuse, or say it didn't happen?
options:
  - { key: wont, label: "Doesn't / won't" }
  - { key: didnt, label: "Didn't happen" }
items:
  - { line: 我今天不喝咖啡。, answer: wont }
  - { line: 我昨天没喝咖啡。, answer: didnt }
  - { line: 他不吃肉。, answer: wont }
  - { line: 他没吃饭。, answer: didnt }
  - { line: 我明天不去。, answer: wont }
  - { line: 他没去。, answer: didnt }
```

```@confusable-sorter
set: [zh:g:bu-negation, zh:g:mei-past-negation]
labels: { zh:g:bu-negation: 不 · no / won't, zh:g:mei-past-negation: 没 · didn't }
count: 8
oldShare: 0.3
```
:::

:::you-do
```@meaning-pick
target: zh:g:bu-vs-mei
options:
  - { key: wont, label: "Doesn't / won't" }
  - { key: didnt, label: "Didn't happen" }
items:
  - { pool: { exemplifies: zh:g:bu-negation, count: 3, novelty: unseen }, answer: wont }
  - { pool: { exemplifies: zh:g:mei-past-negation, count: 3, novelty: unseen }, answer: didnt }
```

```@gist-question
clip: { slot: check }
```
:::

:::recap
- 不 refuses or denies: now, as a habit, or as a plan.
- 没 says a single event didn't happen, even with no time word.
- 是 and adjectives take 不; 有 takes 没.
:::

:::deeper
### Why does a past habit take 不?
不 negates the habit itself, and the habit was true at that time. 没 would claim a particular event was missing, which isn't what "I didn't use to drink coffee" means.

### Can 没 talk about the future?
Not on its own. 还没 means "not yet", which looks forward from now, but it still reports that something hasn't happened so far.
:::
