import { lesson } from '../../src/curriculum-dsl.ts'
import { withLessons } from '../_lib.ts'

// A lesson placed at the start of Stage 1 that needs items taught much later.
export const curriculum = withLessons('zh:unit:greetings', [
  lesson({ id: 'zh:les:fixture-ord001', title: 'Fixture', template: 'pattern',
    idea: 'Placed before the lessons it builds on.', teaches: ['zh:g:place-you-thing'],
    assumes: ['zh:w:猫:mao1'] }),
], 'start')
