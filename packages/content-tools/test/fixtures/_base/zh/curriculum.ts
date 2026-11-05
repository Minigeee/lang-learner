// A small curriculum in the shape of content/zh/curriculum.ts.
export const curriculum = [
  {
    id: 'S0', title: 'Sounds', maxOutput: 0, perception: true,
    units: [
      { id: '0.1', title: 'Tones', prereqs: [], lessons: [
        { id: 'zh:les:tone-shapes', label: '0.1a', title: 'Each tone is a pitch shape', shape: 'sound', minutes: 5, skill: 'zh:sc:tone-1234' },
      ] },
    ],
  },
  {
    id: 'S1', title: 'Survival core', maxOutput: 1,
    units: [
      { id: '1.1', title: 'Greetings and names', prereqs: ['0.1'], lessons: [
        { id: 'zh:les:shi-links-nouns', label: '1.1a', title: '是 links two nouns', shape: 'pattern', minutes: 6, skill: 'zh:g:shi-links-nouns' },
        { id: 'zh:les:meeting-someone', label: '1.1b', title: 'Greetings are fixed chunks', shape: 'clip', minutes: 7, skill: 'zh:v:greetings' },
      ] },
      { id: '1.2', title: 'Review', prereqs: ['1.1'], lessons: [
        { id: 'zh:les:review-one', label: '1.2a', title: 'Greetings, heard fresh', shape: 'checkpoint', minutes: 7, skill: null },
      ] },
    ],
  },
  {
    id: 'S2', title: 'Base vocabulary', maxOutput: 1, assumes: ['S1'],
    units: [
      { id: '2.1', title: 'Daily verbs', prereqs: [], lessons: [
        { id: 'zh:les:eats', label: '2.1a', title: '吃 takes its food after it', shape: 'pattern', minutes: 6, skill: 'zh:g:eats' },
      ] },
    ],
  },
]
