import { describe, expect, it } from 'vitest'
import { checkpointAreas, deriveProgress as derive, type CurriculumStage, type EventDraft, type EventEnvelope, type ItemId, type LessonId } from '../index.ts'

const lesson = 'xx:les:order' as LessonId
const check = 'xx:les:check' as LessonId
const skill = 'xx:g:order' as ItemId
const sound = 'xx:sc:pair' as ItemId
const later = 'xx:les:later' as LessonId
const laterSkill = 'xx:g:later' as ItemId
const entry = (id: LessonId, s: ItemId | null, authored = true) => ({ id, label: id, title: id, shape: 'pattern' as const, minutes: 5, skill: s, authored })
const curriculum: CurriculumStage[] = [
  { id: 'S0', title: 'Sounds', assumes: [], units: [{ id: '0.1', title: 'u', prereqs: [], lessons: [entry(check, null), entry('xx:les:pair' as LessonId, sound, false)] }] },
  { id: 'S1', title: 'One', assumes: [], units: [{ id: '1.1', title: 'u', prereqs: [], lessons: [entry(lesson, skill), entry(later, laterSkill, false)] }] },
]

let t = 0
const deriveProgress = (events: readonly EventEnvelope[]) => derive(events, curriculum)
const ev = (draft: EventDraft | { kind: string; v: number; payload: unknown }): EventEnvelope =>
  ({ ...draft, id: `e${++t}`, lang: 'xx', occurredAt: t * 1000, deviceId: 'd', deviceSeq: t, build: 'b' }) as EventEnvelope
const cursor = (run: string, step: number | 'done', lessonId = lesson, lessonHash = 'h1') =>
  ev({ kind: 'lesson_cursor', v: 1, payload: { lessonId, lessonHash, run, step } })
const trial = (run: string, key: string, correct: boolean, o: { itemId?: ItemId; mode?: 'lesson' | 'checkpoint'; lessonId?: LessonId; attempt?: number } = {}) =>
  ev({ kind: 'trial', v: 1, payload: {
    lessonId: o.lessonId ?? lesson, lessonHash: 'h1', run, step: 3, key, attempt: o.attempt ?? 1, itemId: o.itemId ?? skill,
    widget: 'pick@1', mode: o.mode ?? 'lesson', correct, recycled: false,
  } })

describe('lesson status v1', () => {
  it('goes not started, in progress, complete, and stays complete on a rerun', () => {
    const l = { id: lesson, skill }
    expect(deriveProgress([]).lessonStatus(l)).toBe('not_started')
    const started = [cursor('r1', 0), cursor('r1', 1)]
    expect(deriveProgress(started).lessonStatus(l)).toBe('in_progress')
    const done = [...started, cursor('r1', 'done')]
    expect(deriveProgress(done).lessonStatus(l)).toBe('complete')
    expect(deriveProgress([...done, cursor('r2', 0)]).lessonStatus(l)).toBe('complete')
  })

  it('completes at any score', () => {
    const events = [cursor('r1', 3), trial('r1', '1', false), trial('r1', '2', false), cursor('r1', 'done')]
    expect(deriveProgress(events).lessonStatus({ id: lesson, skill })).toBe('complete')
  })

  it('marks a lesson known when a checkpoint shows its skill is solid', () => {
    const events = [cursor('c1', 0, check), ...['1', '2', '3'].map((k) => trial('c1', k, true, { itemId: sound, mode: 'checkpoint', lessonId: check }))]
    expect(deriveProgress(events).lessonStatus({ id: lesson, skill: sound })).toBe('known')
  })
})

describe('resume', () => {
  it('returns the latest run that has not reached done, with its trials in order', () => {
    const events = [cursor('r1', 0), cursor('r1', 'done'), cursor('r2', 0), cursor('r2', 3), trial('r2', '4', true), trial('r2', '2', false)]
    const run = deriveProgress(events).openRun(lesson)
    expect(run).toMatchObject({ run: 'r2', step: 3, lessonHash: 'h1' })
    expect(run!.trials.map((x) => [x.key, x.correct])).toEqual([['4', true], ['2', false]])
    expect(deriveProgress(events.slice(0, 2)).openRun(lesson)).toBeNull()
    expect(deriveProgress([...events, cursor('r2', 'done')]).trialsOf('r2')).toHaveLength(2)
  })

  it('orders by time, not by arrival', () => {
    const a = cursor('r1', 1)
    const b = cursor('r1', 2)
    expect(deriveProgress([b, a]).openRun(lesson)!.step).toBe(2)
  })
})

describe('mastery v1', () => {
  it('moves an item to learning on a lesson trial, and never lets it fall', () => {
    const solid = [cursor('c1', 0, check), ...['1', '2', '3'].map((k) => trial('c1', k, true, { itemId: sound, mode: 'checkpoint', lessonId: check }))]
    const weakLater = [cursor('c2', 0, check), ...['1', '2', '3'].map((k) => trial('c2', k, false, { itemId: sound, mode: 'checkpoint', lessonId: check }))]
    expect(deriveProgress([trial('r1', '1', false)]).mastery(skill)).toBe('learning')
    expect(deriveProgress(solid).mastery(sound)).toBe('familiar')
    expect(deriveProgress([...solid, ...weakLater]).mastery(sound)).toBe('familiar')
    expect(deriveProgress(weakLater).mastery(sound)).toBe('learning')
  })

  it('never takes lesson practice as checkpoint evidence', () => {
    const events = ['1', '2', '3', '4'].map((k) => trial('r1', k, true, { itemId: sound }))
    expect(deriveProgress(events).mastery(sound)).toBe('learning')
  })

  it('skips kinds and versions it does not know', () => {
    const events = [ev({ kind: 'trial', v: 2, payload: { nonsense: true } }), ev({ kind: 'future', v: 1, payload: {} })]
    expect(deriveProgress(events).mastery(skill)).toBe('new')
  })
})

describe('checkpoint areas', () => {
  it('uses first tries, a minimum count, and the higher share for sounds', () => {
    const tries = (itemId: ItemId, right: number, of: number) =>
      Array.from({ length: of }, (_, i) => ({ itemId, attempt: 1, correct: i < right }))
    const areas = checkpointAreas([
      ...tries(sound, 5, 6), // 83%: under the sound share
      ...tries(skill, 4, 5), // 80%: at the other share
      ...tries('xx:g:few' as ItemId, 2, 2),
      { itemId: skill, attempt: 2, correct: false },
    ])
    expect(Object.fromEntries(areas.map((a) => [a.item, a.solid]))).toEqual({ [sound]: false, [skill]: true, 'xx:g:few': false })
    expect(areas.find((a) => a.item === skill)).toMatchObject({ right: 4, tries: 5 })
  })
})

describe('format intros', () => {
  it('counts a format as introduced once its widget has a trial, at any version', () => {
    const p = deriveProgress([trial('r1', '1', true)])
    expect(p.introduced('pick@2')).toBe(true)
    expect(p.introduced('recall@1')).toBe(false)
  })
})

describe('claims', () => {
  const claim = (scope: 'lesson' | 'unit' | 'stage', id: string, as: 'done' | 'known' | 'none') =>
    ev({ kind: 'claim', v: 1, payload: { scope, id, as } })

  it('marks a lesson done in one event, with no run', () => {
    const p = deriveProgress([claim('lesson', lesson, 'done')])
    expect(p.lessonStatus({ id: lesson, skill })).toBe('complete')
    expect(p.mastery(skill)).toBe('new')
  })

  it('reaches every lesson of a stage, authored or not, and caps its skills at Familiar', () => {
    const p = deriveProgress([claim('stage', 'S0', 'known')])
    expect(p.lessonStatus({ id: check, skill: null })).toBe('known')
    expect(p.lessonStatus({ id: 'xx:les:pair' as LessonId, skill: sound })).toBe('known')
    expect(p.mastery(sound)).toBe('familiar')
    expect(p.lessonStatus({ id: lesson, skill })).toBe('not_started')
    expect(p.claim({ scope: 'stage', id: 'S0' })).toBe('known')
    expect(p.claim({ scope: 'unit', id: '0.1' })).toBeNull()
  })

  it('lets the latest claim covering a lesson win, and a withdrawn one count as never made', () => {
    expect(deriveProgress([claim('unit', '1.1', 'known'), claim('lesson', later, 'done')]).lessonStatus({ id: later, skill: laterSkill })).toBe('complete')
    expect(deriveProgress([claim('lesson', later, 'done'), claim('unit', '1.1', 'known')]).lessonStatus({ id: later, skill: laterSkill })).toBe('known')
    const withdrawn = deriveProgress([claim('unit', '1.1', 'known'), claim('unit', '1.1', 'none')])
    expect(withdrawn.lessonStatus({ id: later, skill: laterSkill })).toBe('not_started')
    expect(withdrawn.mastery(laterSkill)).toBe('new')
    expect(withdrawn.claim({ scope: 'unit', id: '1.1' })).toBeNull()
  })

  it('puts a claim ahead of an open run, but never undoes a finished one', () => {
    expect(deriveProgress([cursor('r1', 0), claim('lesson', lesson, 'known')]).lessonStatus({ id: lesson, skill })).toBe('known')
    expect(deriveProgress([cursor('r1', 'done'), claim('lesson', lesson, 'known')]).lessonStatus({ id: lesson, skill })).toBe('complete')
  })
})

describe('evidence and reached items', () => {
  it('counts first tries per item and lists every item above New', () => {
    const p = deriveProgress([trial('r1', '1', true), trial('r1', '1', false, { attempt: 2 }), trial('r1', '2', false)])
    expect(p.evidence(skill)).toEqual({ tries: 2, right: 1 })
    expect(p.evidence(sound)).toEqual({ tries: 0, right: 0 })
    expect([...p.reached()]).toEqual([[skill, 'learning']])
  })
})
