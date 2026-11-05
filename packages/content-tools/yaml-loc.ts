// YAML parsing that keeps source lines, so every diagnostic can point at file:line.
import { isMap, isScalar, isSeq, LineCounter, parseDocument, type Node } from 'yaml'

export type Path = (string | number)[]

export interface LocatedYaml {
  data: unknown
  /** The 1-based file line of the node at `path`, falling back to its nearest ancestor. */
  lineOf(path: Path): number
  errors: { line: number; message: string }[]
}

/** `firstLine` is the file line of the text's first line, for fences and frontmatter. */
export function parseYaml(text: string, firstLine = 1): LocatedYaml {
  const counter = new LineCounter()
  const doc = parseDocument(text, { lineCounter: counter, uniqueKeys: true })
  const toLine = (offset: number) => counter.linePos(offset).line + firstLine - 1
  const errors = [...doc.errors, ...doc.warnings].map((e) => ({ line: toLine(e.pos[0]), message: e.message.split('\n')[0]! }))
  const lineOf = (path: Path): number => {
    let node = doc.contents as Node | null | undefined
    let best = node?.range ? toLine(node.range[0]) : firstLine
    for (const key of path) {
      if (isMap(node)) {
        const pair = node.items.find((p) => (isScalar(p.key) ? p.key.value : p.key) === key)
        if (!pair) break
        const k = pair.key as Node | null
        node = pair.value as Node | null
        const range = node?.range ?? k?.range
        if (range) best = toLine(range[0])
      } else if (isSeq(node) && typeof key === 'number') {
        node = node.items[key] as Node | null
        if (!node?.range) break
        best = toLine(node.range[0])
      } else break
    }
    return best
  }
  return { data: errors.length ? undefined : doc.toJS(), lineOf, errors }
}
