import { type FlashCard, type GameSetup, type MathsKind } from '@atw/api';
import { FlashCardMaker } from './flash-card-maker';
import { fixedRandom, mathRandom } from './random-source';

const SETUP: GameSetup = {
  kinds: ['times'],
  tables: [2, 3, 4, 5, 10],
  tourLength: 12,
  cardSpeed: 'normal',
};

function setup(kinds: MathsKind[], tables = [2, 3, 4, 5, 6, 7, 8, 9, 10]): GameSetup {
  return { ...SETUP, kinds, tables };
}

function cards(maker: FlashCardMaker, count: number): FlashCard[] {
  return Array.from({ length: count }, () => maker.next());
}

describe('FlashCardMaker (L2-008, docs/adr/0018)', () => {
  it('makes Times cards with a chosen table and a factor from 1 to 12 (criterion 1)', () => {
    const maker = new FlashCardMaker(SETUP, mathRandom);
    for (const card of cards(maker, 200)) {
      expect(card.kind).toBe('times');
      const tableLeft = SETUP.tables.includes(card.left) && card.right >= 1 && card.right <= 12;
      const tableRight = SETUP.tables.includes(card.right) && card.left >= 1 && card.left <= 12;
      expect(tableLeft || tableRight).toBe(true);
    }
  });

  it('puts the table on either side, as the random source says', () => {
    // kind 0, table index 1 (3), factor index 6 (7) then 7 (8), side 0 then side 1
    const maker = new FlashCardMaker(SETUP, fixedRandom(0, 1, 6, 0, 0, 1, 7, 1));
    expect(maker.next()).toEqual({ kind: 'times', left: 3, right: 7 });
    expect(maker.next()).toEqual({ kind: 'times', left: 8, right: 3 });
  });

  it('makes only chosen kinds, and each chosen kind in 100 cards (criterion 2)', () => {
    const kinds: MathsKind[] = ['plus', 'minus', 'divide'];
    const made = cards(new FlashCardMaker(setup(kinds), mathRandom), 100);
    expect(new Set(made.map((card) => card.kind))).toEqual(new Set(kinds));
  });

  it('makes Divide cards that divide exactly by a divisor that is never 0 (criterion 3)', () => {
    for (const card of cards(new FlashCardMaker(setup(['divide']), mathRandom), 300)) {
      expect(card.right).toBeGreaterThan(0);
      expect(card.left % card.right).toBe(0);
    }
  });

  it('draws the divisor from the chosen tables while Times is on, else from 2 to 12', () => {
    const withTimes = cards(new FlashCardMaker(setup(['times', 'divide'], [7]), mathRandom), 200);
    for (const card of withTimes.filter((made) => made.kind === 'divide'))
      expect(card.right).toBe(7);
    const divisors = new Set(
      cards(new FlashCardMaker(setup(['divide'], [7]), mathRandom), 400).map((card) => card.right),
    );
    expect(divisors).toEqual(new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
  });

  it('makes Minus cards whose answer is never negative (criterion 4)', () => {
    for (const card of cards(new FlashCardMaker(setup(['minus']), mathRandom), 300)) {
      expect(FlashCardMaker.answerOf(card)).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every card a whole-number answer from 0 to 999 (criterion 5)', () => {
    const all = setup(['times', 'plus', 'minus', 'divide'], [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const card of cards(new FlashCardMaker(all, mathRandom), 1000)) {
      const answer = FlashCardMaker.answerOf(card);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThanOrEqual(0);
      expect(answer).toBeLessThanOrEqual(999);
    }
  });

  it.each([
    ['times', [0], { kind: 'times', left: 2, right: 2 }],
    ['plus', [0], { kind: 'plus', left: 2, right: 3 }],
    ['minus', [0], { kind: 'minus', left: 10, right: 2 }],
    ['divide', [0], { kind: 'divide', left: 4, right: 2 }],
  ] as const)(
    'never makes the same %s card twice running, even when the source repeats (criterion 6)',
    (kind, numbers, second) => {
      const maker = new FlashCardMaker(setup([kind], [2]), fixedRandom(...numbers));
      const first = maker.next();
      const next = maker.next();
      expect(FlashCardMaker.same(first, next)).toBe(false);
      expect(next).toEqual(second);
    },
  );

  it('counts 4 × 6 and 6 × 4 as the same card, but not 8 − 2 and 2 − 8', () => {
    expect(
      FlashCardMaker.same(
        { kind: 'times', left: 4, right: 6 },
        { kind: 'times', left: 6, right: 4 },
      ),
    ).toBe(true);
    expect(
      FlashCardMaker.same(
        { kind: 'minus', left: 8, right: 2 },
        { kind: 'minus', left: 2, right: 8 },
      ),
    ).toBe(false);
  });

  it('works out the answer of each kind', () => {
    expect(FlashCardMaker.answerOf({ kind: 'times', left: 6, right: 4 })).toBe(24);
    expect(FlashCardMaker.answerOf({ kind: 'plus', left: 6, right: 4 })).toBe(10);
    expect(FlashCardMaker.answerOf({ kind: 'minus', left: 6, right: 4 })).toBe(2);
    expect(FlashCardMaker.answerOf({ kind: 'divide', left: 144, right: 12 })).toBe(12);
  });
});
