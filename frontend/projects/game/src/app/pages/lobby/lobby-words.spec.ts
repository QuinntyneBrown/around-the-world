import { type GameSetup } from '@atw/api';
import { mathsWords, setupRows } from './lobby-words';

const DEFAULTS: GameSetup = {
  kinds: ['times'],
  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  tourLength: 12,
  cardSpeed: 'normal',
};

describe('the Lobby’s words for a setup', () => {
  it.each([
    [['times'], [2, 3, 4, 5, 6, 7, 8, 9, 10], '×2 to ×10'],
    [['times'], [7], '×7'],
    [['times'], [2, 5, 7], '×2, ×5, ×7'],
    [['times', 'plus', 'minus'], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], '× + −, ×2 to ×12'],
    [['plus', 'minus'], [2, 3], '+ −'],
    [['divide'], [2], '÷'],
  ] as const)('reads kinds %j with tables %j as %s', (kinds, tables, words) => {
    expect(mathsWords({ ...DEFAULTS, kinds: [...kinds], tables: [...tables] })).toBe(words);
  });

  it('reads the tour in desks and how this device answers', () => {
    expect(setupRows({ ...DEFAULTS, tourLength: 24 }, 'voice')).toEqual([
      { term: 'Maths', value: '×2 to ×10' },
      { term: 'Tour', value: '24 desks' },
      { term: 'Answer by', value: 'Shouting it!' },
    ]);
    expect(setupRows(DEFAULTS, 'numberPad')[2]).toEqual({
      term: 'Answer by',
      value: 'The number pad',
    });
  });
});
