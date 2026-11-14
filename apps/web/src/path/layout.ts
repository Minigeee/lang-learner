// The Path tab's unit graph layout (app-ui-flow Navigation): a vertical flowchart of one stage's
// units, by dependency depth, at most `LANES` side by side so it fits a phone.
export const LANES = 3

export interface LaidOutNode {
  id: string
  row: number
  /** Horizontal center, 0 to lanes - 1; a row with fewer nodes is centered. */
  x: number
}

export interface StageLayout {
  nodes: LaidOutNode[]
  /** Prerequisite edges inside the stage, from the prerequisite to the unit that builds on it. */
  edges: { from: string; to: string }[]
  rows: number
}

/**
 * Lays out units in table order: a unit's depth is one more than its deepest prerequisite in the
 * same stage, and each depth fills rows of up to `lanes`. Every edge points to a later row.
 */
export function layoutStage(units: readonly { id: string; prereqs: readonly string[] }[], lanes = LANES): StageLayout {
  const inStage = new Set(units.map((u) => u.id))
  const depth = new Map<string, number>()
  for (const u of units) {
    const d = Math.max(-1, ...u.prereqs.filter((p) => inStage.has(p)).map((p) => depth.get(p) ?? -1)) + 1
    depth.set(u.id, d)
  }
  const nodes: LaidOutNode[] = []
  let row = 0
  const maxDepth = Math.max(-1, ...depth.values())
  for (let d = 0; d <= maxDepth; d++) {
    const level = units.filter((u) => depth.get(u.id) === d)
    for (let i = 0; i < level.length; i += lanes) {
      const chunk = level.slice(i, i + lanes)
      const offset = (lanes - chunk.length) / 2
      chunk.forEach((u, lane) => nodes.push({ id: u.id, row, x: lane + offset }))
      row++
    }
  }
  const edges = units.flatMap((u) => u.prereqs.filter((p) => inStage.has(p)).map((p) => ({ from: p, to: u.id })))
  return { nodes, edges, rows: row }
}
