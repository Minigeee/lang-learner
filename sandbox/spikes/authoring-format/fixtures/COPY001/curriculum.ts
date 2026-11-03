import { lesson } from '../../src/curriculum-dsl.ts'
import { withLessons } from '../_lib.ts'

export const curriculum = withLessons('zh:unit:didnt-dont-lets', [
  lesson({ id: 'zh:les:fixture-copy001', title: 'Fixture: a Pattern lesson', template: 'pattern',
    idea: 'Needs the S1 prerequisites first.', teaches: ['zh:g:bu-vs-mei'] }),
])
