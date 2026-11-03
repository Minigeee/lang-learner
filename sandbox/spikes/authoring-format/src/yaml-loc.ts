// YAML parsing that keeps source lines, so every diagnostic can point at file:line.
import { parseDocument, LineCounter, isMap, isSeq, isScalar, type Node } from 'yaml'

export type Path = (string | number)[]

export interface LocatedYaml {
  data: unknown
  /** 1-based line in the containing file of the node at `path`, falling back to the nearest ancestor. */
  lineOf(path: Path): number
  errors: { line: number; message: string }[]
}

/** `firstLine` is the 1-based file line of the YAML text's first line (for fences and frontmatter). */
export function parseYaml(text: string, firstLine = 1): LocatedYaml {
  const lc = new LineCounter()
  const doc = parseDocument(text, { lineCounter: lc, uniqueKeys: true })
  const toLine = (offset: number) => lc.linePos(offset).line + firstLine - 1
  const errors = [...doc.errors, ...doc.warnings].map((e) => ({
    line: toLine(e.pos[0]),
    message: e.message.split('\n')[0],
  }))
  const lineOf = (path: Path): number => {
    let node: Node | null | undefined = doc.contents as Node
    let best = node?.range ? toLine(node.range[0]) : firstLine
    for (const key of path) {
      if (isMap(node)) {
        const pair = node.items.find((p) => (isScalar(p.key) ? p.key.value : p.key) === key)
        if (!pair) break
        const k = pair.key as Node | null
        node = pair.value as Node | null
        const r = node?.range ?? k?.range
        if (r) best = toLine(r[0])
      } else if (isSeq(node) && typeof key === 'number') {
        node = node.items[key] as Node | null
        if (node?.range) best = toLine(node.range[0])
        else break
      } else break
    }
    return best
  }
  return { data: errors.length ? undefined : doc.toJS(), lineOf, errors }
}
