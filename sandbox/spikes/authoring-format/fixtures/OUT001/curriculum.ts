import { lesson } from '../../src/curriculum-dsl.ts'
import { withLessons } from '../_lib.ts'

const sounds = withLessons('zh:unit:yi-bu', [
  lesson({ id: 'zh:les:fixture-out001-sounds', title: 'Fixture', template: 'sound',
    idea: 'Required output in the Sounds stage.', teaches: ['zh:sr:bu-sandhi'] }),
])
export const curriculum = withLessons('zh:unit:didnt-dont-lets', [
  lesson({ id: 'zh:les:fixture-out001', title: 'Fixture', template: 'pattern',
    idea: 'Free production in Stage 1.', teaches: ['zh:g:bu-vs-mei'] }),
]).map((s, i) => (i === 0 ? sounds[0] : s))
