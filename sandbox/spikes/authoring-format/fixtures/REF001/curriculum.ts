import { lesson } from '../../src/curriculum-dsl.ts'
import { withLessons } from '../_lib.ts'

export const curriculum = withLessons('zh:unit:didnt-dont-lets', [
  lesson({ id: 'zh:les:fixture-ref001', title: 'Fixture', template: 'pattern',
    idea: 'A lesson with one kind of fault.', teaches: ['zh:g:bu-vs-mei', 'zh:w:咖啡:ka1fei4'] }),
])
