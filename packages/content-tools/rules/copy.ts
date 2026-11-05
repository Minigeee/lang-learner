// COPY001: no internal terms in user-facing text. The mapping lives in docs/design/app-ui-flow.md
// ("UI copy: no internal terminology"); this is its machine-checkable half.
import { error, type Diag, type Loc } from '../diag.ts'
import { supportTexts } from '../lesson.ts'
import type { Rule } from '../pack.ts'

const BANNED: { re: RegExp; use: string }[] = [
  { re: /\b(hear it|we do|you do|i do)\b/i, use: 'Listen / How it works / Practice / Check' },
  { re: /\b(pattern|clip|sound) (lesson|template|shape)s?\b/i, use: 'Lesson / Video lesson / Sound practice' },
  { re: /\bS[0-2]\b/, use: 'the stage name (Sounds, Stage 1)' },
  { re: /\bprereq(uisite)?s?\b/i, use: '"builds on" or nothing' },
  { re: /\btest(ed)?[- ]out\b/i, use: '"Marked as known"' },
  { re: /\b(strands?|refold|output levels?|encompassing|comprehensible input|i\+1)\b/i, use: 'nothing (never shown)' },
  { re: /\bpass [1-9]\b/i, use: '"Watch 2 of 3", "Watch again"' },
  { re: /\b(slots?|widgets?|templates?|knowledge items?|evidence|checkpoints?|SRS|FSRS)\b/i, use: 'plain words ("step", "card", "Check")' },
]

export const copyTerms: Rule = {
  id: 'COPY001',
  summary: "User-facing text in an authored lesson, its title included, uses no internal terms.",
  run(project) {
    const out: Diag[] = []
    const scan = (text: string, at: Loc, what: string) => {
      for (const b of BANNED) {
        const m = b.re.exec(text)
        if (m) out.push(error(at, 'COPY001', `${what}: internal term "${m[0]}" in user-facing text; use ${b.use}`))
      }
    }
    for (const doc of project.docs) {
      const lesson = project.lessonOf(doc)
      if (lesson) scan(lesson.title, project.curriculumLine(lesson.id), `title of ${lesson.label}`)
      for (const t of supportTexts(doc)) scan(t.text, t.at, t.kind)
    }
    return out
  },
}
