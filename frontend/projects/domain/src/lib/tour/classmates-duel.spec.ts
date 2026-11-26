import { type FlashCard } from '@atw/api';
import { type Answerer, CARDS_AT_ONCE, ClassmatesDuel } from './classmates-duel';

const CARD: FlashCard = { kind: 'times', left: 6, right: 4 };

/** A classmate who gives these answers at these times, in turn, from each decision. */
function answering(...decisions: [number, number][]): Answerer {
  let next = 0;
  return {
    decide: () => {
      const [answer, afterMs] = decisions[Math.min(next++, decisions.length - 1)];
      return { answer, afterMs };
    },
  };
}

describe('ClassmatesDuel', () => {
  it('gives the duel to the first correct answer (L2-001)', () => {
    const result = ClassmatesDuel.play(
      () => CARD,
      { traveller: answering([24, 1500]), deskHolder: answering([24, 1200]) },
      6000,
    );
    expect(result).toEqual({ winner: 'deskHolder', afterMs: 1200 });
  });

  it('freezes a wrong answer for 1 second and lets the classmate decide again (L2-004)', () => {
    const result = ClassmatesDuel.play(
      () => CARD,
      { traveller: answering([25, 900], [24, 900]), deskHolder: answering([24, 3000]) },
      6000,
    );
    // 900 wrong, frozen until 1900, decides again 900 later: 2800
    expect(result).toEqual({ winner: 'traveller', afterMs: 2800 });
  });

  it('deals a new card when nobody answers in time, counting the first card’s time (L2-005)', () => {
    let cards = 0;
    const result = ClassmatesDuel.play(
      () => {
        cards++;
        return CARD;
      },
      {
        // wrong at 1000, frozen until 2000, then right at 4500: after the card's 3000
        traveller: answering([1, 1000], [24, 2500], [24, 1000]),
        deskHolder: answering([2, 5000]),
      },
      3000,
    );
    expect(cards).toBe(2);
    expect(result).toEqual({ winner: 'traveller', afterMs: 4000 });
  });

  it('gives no result when no card is answered in time', () => {
    let cards = 0;
    const result = ClassmatesDuel.play(
      () => {
        cards++;
        return CARD;
      },
      { traveller: answering([1, 4000]), deskHolder: answering([2, 4000]) },
      3000,
    );
    expect(result).toBeNull();
    expect(cards).toBe(CARDS_AT_ONCE);
  });
});
