import { roomCodeLetters } from './room-code-letters';

describe('roomCodeLetters (L2-023 criterion 1)', () => {
  it.each([
    ['', ''],
    ['b', 'B'],
    ['bolt', 'BOLT'],
    ['BoLt', 'BOLT'],
    ['boltz', 'BOLT'],
    ['b0-o!l t', 'BOLT'],
    ['12', ''],
    ['bö', 'B'],
    ['bı', 'B'],
    ['é', ''],
  ])('keeps of "%s" the letters "%s"', (typed, kept) => {
    expect(roomCodeLetters(typed)).toBe(kept);
  });
});
