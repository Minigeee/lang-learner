import { describe, expect, it } from 'vitest'
import { deriveProgress, type CurriculumStage, type EventEnvelope, type ItemId, type LessonId } from '@lang-learner/core'
import { LANES, layoutStage } from '../src/path/layout.ts'
import { pathModel } from '../src/path/model.ts'
import { hrefOf, parseRoute, type Route } from '../src/router.ts'

describe('the stage layout', () => {
  const units = [
    { id: '0.1', prereqs: [] }, { id: '0.2', prereqs: [] }, { id: '0.3', prereqs: ['0.2'] },
    { id: '0.4', prereqs: ['0.2', '0.3'] }, { id: '0.5', prereqs: ['0.2'] }, { id: '0.6', prereqs: ['0.2', '0.4', '0.5'] },
    { id: '0.7', prereqs: ['0.1'] }, { id: '0.8', prereqs: ['0.7'] }, { id: '0.9', prereqs: ['0.8', 'S9.9'] },
    { id: 'a', prereqs: [] }, { id: 'b', prereqs: [] }, { id: 'c', prereqs: [] },
  ]
  const layout = layoutStage(units)
  const at = new Map(layout.nodes.map((n) => [n.id, n]))

  it('places every unit once, at most three to a row, with every edge pointing down', () => {
    expect(layout.nodes.map((n) => n.id).sort()).toEqual(units.map((u) => u.id).sort())
    const perRow = new Map<number, number>()
    for (const n of layout.nodes) perRow.set(n.row, (perRow.get(n.row) ?? 0) + 1)
    expect(Math.max(...perRow.values())).toBeLessThanOrEqual(LANES)
    for (const e of layout.edges) expect(at.get(e.from)!.row).toBeLessThan(at.get(e.to)!.row)
  })

  it('ignores prerequisites outside the stage', () => {
    expect(layout.edges.some((e) => e.from === 'S9.9')).toBe(false)
  })
})

describe('the path model', () => {
  const entry = (id: string, authored: boolean, skill: string | null = null) =>
    ({ id: `xx:les:${id}` as LessonId, label: id, title: id, shape: 'pattern' as const, minutes: 5, skill: skill as ItemId | null, authored })
  const curriculum: CurriculumStage[] = [
    { id: 'S0', title: 'Sounds', assumes: [], units: [{ id: '0.1', title: 'T', prereqs: [], lessons: [entry('a', true, 'xx:sc:a'), entry('b', false)] }] },
    { id: 'S1', title: 'One', assumes: ['S0'], units: [
      { id: '1.1', title: 'G', prereqs: [], lessons: [entry('c', true), entry('d', true)] },
      { id: '1.2', title: 'Q', prereqs: ['1.1'], lessons: [entry('e', false)] },
    ] },
  ]
  const ev = (payload: unknown, i: number): EventEnvelope =>
    ({ id: `e${i}`, kind: 'claim', v: 1, lang: 'xx', occurredAt: i, deviceId: 'd', deviceSeq: i, build: 'b', payload })

  it('starts at the first authored lesson, and a self-reported stage moves it on', () => {
    expect(pathModel(curriculum, deriveProgress([], curriculum)).next?.id).toBe('xx:les:a')
    const after = pathModel(curriculum, deriveProgress([ev({ scope: 'stage', id: 'S0', as: 'known' }, 1)], curriculum))
    expect(after.next?.id).toBe('xx:les:c')
    expect(after.stages[0]!.done).toBe(true)
    expect(after.unit('1.1')!.state).toBe('current')
    expect(after.unit('1.2')!.state).toBe('later')
    expect(after.unit('0.1')!.unlocks).toEqual([])
    expect(after.unit('1.1')!.unlocks).toEqual(['1.2'])
  })
})

describe('routes', () => {
  it('round-trip through the hash', () => {
    const routes: Route[] = [
      { name: 'today' }, { name: 'path' }, { name: 'path', view: 'items' }, { name: 'unit', id: '1.10' }, { name: 'map' },
      { name: 'item', id: 'zh:w:是:shi4' as ItemId }, { name: 'lesson', id: 'zh:les:tone-shapes' as LessonId }, { name: 'session', minutes: 15 },
      { name: 'settings' }, { name: 'welcome' },
    ]
    for (const r of routes) expect(parseRoute(hrefOf(r), 'zh')).toEqual(r)
    expect(parseRoute('#/session/7', 'zh')).toEqual({ name: 'today' })
    expect(parseRoute('', 'zh')).toEqual({ name: 'today' })
  })
})
