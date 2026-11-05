// MED001, AUD001, LIC001: every played line has a clip, clips are loud enough and in one voice per
// card, and every clip has rights the toolchain recognizes.
import { error, type Diag } from '../diag.ts'
import { authoredLines } from '../lesson.ts'
import type { Rule } from '../pack.ts'
import { norm } from '../project.ts'

export const linesHaveClips: Rule = {
  id: 'MED001',
  summary: 'Every played line matches a clip: a native line or a TTS line, by transcript or pinned by id.',
  run(project) {
    const out: Diag[] = []
    for (const doc of project.docs) for (const line of authoredLines(doc)) {
      if (!line.played) continue
      if (line.clip) {
        const clip = project.clips.get(line.clip)
        if (clip && line.zh && norm(clip.zh ?? '') !== norm(line.zh)) out.push(error(line.at, 'MED001', `${line.clip} says "${clip.zh}", not "${line.zh}"`))
      } else if (line.syllable) {
        if (!project.clipsForSyllable(line.syllable).length) out.push(error(line.at, 'MED001', `no clip for syllable ${line.syllable}`))
      } else if (line.zh && !project.clipsForLine(line.zh).length) {
        const near = project.nearestLines(line.zh)
        out.push(error(line.at, 'MED001', `no clip says "${line.zh}"${near.length ? `; nearest: ${near.join(' | ')}` : ''}`))
      }
    }
    return out
  },
}

const TARGET_LUFS = -20
/** Peak capping can land a clip quieter than the target, so the band is wider on that side. */
const TOLERANCE = { over: 1, under: 3 }

export const audioQuality: Rule = {
  id: 'AUD001',
  summary: "Clips sit at the target loudness, within tolerance, and a card's word and sentence share a voice.",
  run(project) {
    const out: Diag[] = []
    for (const c of project.clips.values()) {
      if (c.lufs > TARGET_LUFS + TOLERANCE.over || c.lufs < TARGET_LUFS - TOLERANCE.under) {
        out.push(error(c.at, 'AUD001', `${c.id} is at ${c.lufs} LUFS; expected ${TARGET_LUFS} (+${TOLERANCE.over}/−${TOLERANCE.under})`))
      }
    }
    for (const w of project.words.values()) {
      const word = project.clips.get(w.word)
      const sentence = project.clips.get(w.sentence)
      if (word && sentence && word.speaker !== sentence.speaker) {
        out.push(error(w.at, 'AUD001', `${w.id}: word audio is ${word.speaker} but sentence audio is ${sentence.speaker}; a card has one voice`))
      }
    }
    return out
  },
}

export const licensed: Rule = {
  id: 'LIC001',
  summary: 'Every clip has a license record, a named source, a statement of changes, a source its license allows, and that license\'s restriction.',
  run(project) {
    const out: Diag[] = []
    for (const c of project.clips.values()) {
      const license = project.licenses.get(c.rights.license)
      if (!license) out.push(error(c.at, 'LIC001', `${c.id}: no license record "${c.rights.license}" in licenses.yaml`))
      else if (!license.sources.includes(c.source)) out.push(error(c.at, 'LIC001', `${c.id}: source ${c.source} isn't allowed under ${license.id}, which covers ${license.sources.join(', ') || 'no media'}`))
      if (license && license.restriction !== c.rights.restriction) {
        out.push(error(c.at, 'LIC001', `${c.id}: rights.restriction is "${c.rights.restriction ?? ''}"; ${license.id} needs "${license.restriction ?? ''}"`))
      }
      if (!c.rights.source.trim()) out.push(error(c.at, 'LIC001', `${c.id}: rights.source is empty`))
      if (!c.rights.changes.trim()) out.push(error(c.at, 'LIC001', `${c.id}: rights.changes is empty`))
    }
    for (const l of project.licenses.values()) {
      if (!l.author.trim() || !l.url.trim()) out.push(error(l.at, 'LIC001', `${l.id}: a license record needs an author and a url`))
    }
    return out
  },
}
