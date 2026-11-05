---
idea: '叫 means "is called," so a name comes next.'
cards: [zh:w:你:ni3, zh:w:叫:jiao4, zh:w:名字:ming2zi5]
chunks: [什么名字]
names: [王明, 李红, 张伟, 陈静, 拉尔斯]
skill:
  pool:
    - { line: 他叫张伟。, answer: name, rung: 4 }
    - { line: 你是学生。, answer: what, rung: 4 }
    - { line: 老师叫王明。, answer: name, rung: 4 }
    - { line: 他是老师。, answer: what, rung: 4 }
    - { line: 学生叫李红。, answer: name, rung: 4 }
    - { line: 张伟是学生。, answer: what, rung: 4 }
    - { line: 他叫拉尔斯。, answer: name, rung: 4 }
    - { line: 陈静是老师。, answer: what, rung: 4 }
    - { line: 学生叫王明。, answer: name, rung: 4 }
    - { line: 王明是学生。, answer: what, rung: 4 }
    - { line: 我叫李红。, answer: name, rung: 4 }
    - { line: 李红是老师。, answer: what, rung: 4 }
deeper:
  - question: Is 我是王明 wrong?
    answer: No. 是 works with a name too, as when you say who's calling. 叫 says what your name is.
  - question: Does 叫 only mean "is called"?
    answer: No. It also means to call or to shout, and later lessons show more uses.
  - question: Can I ask anyone their name this way?
    answer: It's fine with peers and children. With elders or in formal settings, people use a more polite question.
---

:::opener{type=showdown}
:ex[我叫王明。]{clip="clip:tts-b-wojiaowangming"}
:ex[我是老师。]{clip="clip:tts-b-woshilaoshi"}

```yaml
hook:
  prompt: Which one tells you a name?
  options: [The first one, The second one]
```
:::

:::lesson
:w[叫] means "is called," so a name comes next: :ex[我叫王明。] :w[是] can take a name too, and it also says what someone is: :ex[我是老师。]

```yaml
video: { youtubeId: yMebwotqRHg, role: main, durationSec: 279 }
```
:::

:::examples
:ex[我叫王明。]{en="My name is Wang Ming."}
:ex[你叫什么名字？]{en="What's your name?"}
:ex[他叫王明。]{en="His name is Wang Ming."}
:ex[我是李红。]{en="I'm Li Hong."}

```yaml
highlight: [叫, 是]
```
:::

:::practice{format=C0}
```yaml
prompt: What does it tell you?
options:
  - { key: name, label: Their name }
  - { key: what, label: What they are }
items:
  - { line: 我叫张伟。, answer: name, rung: 4 }
  - { line: 我是学生。, answer: what, rung: 4 }
  - { line: 我叫陈静。, answer: name, rung: 4 }
  - { line: 你是老师。, answer: what, rung: 4 }
  - { line: 老师叫李红。, answer: name, rung: 4 }
  - { line: 他是学生。, answer: what, rung: 4 }
  - { line: 学生叫张伟。, answer: name, rung: 4 }
  - { line: 王明是老师。, answer: what, rung: 4 }
  - { line: 老师叫陈静。, answer: name, rung: 4 }
  - { line: 李红是学生。, answer: what, rung: 4 }
  - { line: 老师叫张伟。, answer: name, rung: 4 }
  - { line: 张伟是老师。, answer: what, rung: 4 }
```
:::
