import { type DuelState } from '@atw/api';
import { DuelWords } from './duel-words';

const OPEN: DuelState = {
  card: { kind: 'times', left: 6, right: 4 },
  desk: 5,
  tourLength: 12,
  country: 'Italy',
  traveller: { name: 'You', kid: 'zuri' },
  deskHolder: { name: 'Nia', kid: 'nia' },
  role: 'traveller',
  secondsToAnswer: 6,
  timeLeftMs: 4000,
  frozen: false,
  wrongAnswer: null,
  outcome: 'open',
  winner: null,
  answer: null,
  ring: [],
  hop: null,
};

describe('DuelWords', () => {
  it.each([
    [{ kind: 'times', left: 6, right: 4 }, '6 × 4', '6 times 4'],
    [{ kind: 'plus', left: 12, right: 30 }, '12 + 30', '12 plus 30'],
    [{ kind: 'minus', left: 50, right: 8 }, '50 − 8', '50 minus 8'],
    [{ kind: 'divide', left: 144, right: 12 }, '144 ÷ 12', '144 divided by 12'],
  ] as const)('writes %j as "%s", read as "%s"', (card, sum, words) => {
    expect(DuelWords.sum(card)).toBe(sum);
    expect(DuelWords.sumInWords(card)).toBe(words);
  });

  it.each<[string, Partial<DuelState>, string, string | undefined, string | undefined]>([
    ['a new card', {}, 'New card: 6 × 4.', undefined, undefined],
    [
      'a wrong answer',
      { frozen: true, wrongAnswer: 26 },
      'Not 26. Frozen for one second.',
      'Not 26! Frozen for a sec…',
      undefined,
    ],
    [
      'a won duel',
      { outcome: 'won', winner: 'traveller', answer: 24 },
      '6 × 4 is 24. You got it!',
      '= 24',
      'You got it!',
    ],
    [
      'a lost duel',
      { outcome: 'won', winner: 'deskHolder', answer: 24 },
      'Nia said 24 first. You sit at Italy.',
      'Nia said 24 first. So close!',
      undefined,
    ],
    [
      'a duel watched (L2-028 criterion 1)',
      { role: 'watching', traveller: { name: 'Cosmic Llama', kid: 'nia' } },
      'You are watching. Cosmic Llama against Nia: 6 × 4.',
      'Watching… your turn is next',
      undefined,
    ],
    [
      'a duel watched and won',
      { role: 'watching', outcome: 'won', winner: 'deskHolder', answer: 24 },
      'Nia said 24 first.',
      'Nia said 24 first.',
      undefined,
    ],
    [
      'a card nobody answered',
      { outcome: 'timedOut', answer: 24 },
      'Time is up. It was 24. A new card is coming.',
      'Time’s up! It was 24. Here comes a new card…',
      undefined,
    ],
  ])('says %s', (_, change, announcement, result, emphasis) => {
    const duel = { ...OPEN, ...change };
    expect(DuelWords.announcement(duel)).toBe(announcement);
    expect(DuelWords.line(duel).result).toBe(result);
    expect(DuelWords.line(duel).emphasis).toBe(emphasis);
  });
});
