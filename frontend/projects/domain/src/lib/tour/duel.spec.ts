import { Duel, FREEZE_MS } from './duel';

const SIX_TIMES_FOUR = { kind: 'times', left: 6, right: 4 } as const;

function duel(): Duel {
  return new Duel(SIX_TIMES_FOUR, { traveller: 'you', deskHolder: 'kenji' });
}

describe('Duel (L2-001, L2-004, L2-005)', () => {
  it.each([
    ['the traveller answers 24 first', 'you', 'traveller'],
    ['the desk holder answers 24 first', 'kenji', 'deskHolder'],
  ] as const)('is won by the first correct answer: %s (L2-001 1, 2)', (_, player, winner) => {
    const played = duel();
    expect(played.give(player, 24, 1500)).toBe('won');
    expect(played.outcome).toBe('won');
    expect(played.winner).toBe(winner);
  });

  it('ignores an answer from a player who is neither duellist (L2-001 3)', () => {
    const played = duel();
    expect(played.give('nia', 24, 1000)).toBe('ignored');
    expect(played.outcome).toBe('open');
  });

  it('leaves the result unchanged when the other player then answers correctly (L2-001 4)', () => {
    const played = duel();
    played.give('kenji', 24, 1000);
    expect(played.give('you', 24, 1001)).toBe('ignored');
    expect(played.winner).toBe('deskHolder');
  });

  it('freezes a wrong answer for 1 second and ignores answers meanwhile (L2-004 1)', () => {
    const played = duel();
    expect(played.give('you', 42, 1000)).toBe('wrong');
    expect(played.isFrozen('you', 1000 + FREEZE_MS - 1)).toBe(true);
    expect(played.give('you', 24, 1000 + FREEZE_MS - 1)).toBe('ignored');
    expect(played.outcome).toBe('open');
  });

  it('lets a frozen player answer the same card again after 1 second (L2-004 2)', () => {
    const played = duel();
    played.give('you', 42, 1000);
    expect(played.unfreezesAt('you')).toBe(2000);
    expect(played.give('you', 24, 2000)).toBe('won');
  });

  it('lets the desk holder win while the traveller is frozen, and never freezes the rival (L2-004 3, 4)', () => {
    const played = duel();
    played.give('you', 42, 1000);
    expect(played.isFrozen('kenji', 1000)).toBe(false);
    expect(played.give('kenji', 24, 1200)).toBe('won');
    expect(played.winner).toBe('deskHolder');
  });

  it('closes an undecided duel with no winner when time runs out (L2-005 2)', () => {
    const played = duel();
    expect(played.timeOut()).toBe(true);
    expect(played.outcome).toBe('timedOut');
    expect(played.winner).toBeNull();
    expect(played.give('you', 24, 7000)).toBe('ignored');
  });

  it('does not time out a duel already won', () => {
    const played = duel();
    played.give('you', 24, 1000);
    expect(played.timeOut()).toBe(false);
    expect(played.outcome).toBe('won');
  });
});
