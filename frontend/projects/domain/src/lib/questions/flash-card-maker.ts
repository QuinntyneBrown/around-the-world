import { type FlashCard, type GameSetup, type MathsKind } from '@atw/api';
import { type RandomSource } from './random-source';

/** How often the maker draws again when it drew the last card, before it moves the card on. */
const REDRAWS = 10;

/** The range of a number on a card, from `min` to `max`. */
interface Range {
  readonly min: number;
  readonly max: number;
}

const ONE_TO_TWELVE: Range = { min: 1, max: 12 };
const PLUS: Range = { min: 2, max: 50 };
const MINUS_LEFT: Range = { min: 10, max: 99 };
const DIVISORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/**
 * Makes each flash card of a game from the chosen maths, and is the only place on the device
 * where one is made (`L2-008`, docs/adr/0018-flash-card-ranges.md). It remembers the last card
 * it made, and no more, so that it never makes the same card twice running.
 */
export class FlashCardMaker {
  private last: FlashCard | null = null;

  constructor(
    private readonly setup: GameSetup,
    private readonly random: RandomSource,
  ) {}

  /** The answer of a card: a whole number from 0 to 999. */
  static answerOf(card: FlashCard): number {
    switch (card.kind) {
      case 'times':
        return card.left * card.right;
      case 'plus':
        return card.left + card.right;
      case 'minus':
        return card.left - card.right;
      case 'divide':
        return card.left / card.right;
    }
  }

  /** Whether two cards are the same card: `4 × 6` is `6 × 4` (ADR 0018). */
  static same(one: FlashCard, other: FlashCard): boolean {
    if (one.kind !== other.kind) return false;
    if (one.left === other.left && one.right === other.right) return true;
    const turns = one.kind === 'times' || one.kind === 'plus';
    return turns && one.left === other.right && one.right === other.left;
  }

  /** The next card: of a chosen kind, and not the same as the last one. */
  next(): FlashCard {
    let card = this.draw();
    for (let tries = 0; tries < REDRAWS && this.isLast(card); tries++) card = this.draw();
    if (this.isLast(card)) card = this.moveOn(card);
    this.last = card;
    return card;
  }

  private isLast(card: FlashCard): boolean {
    return this.last !== null && FlashCardMaker.same(card, this.last);
  }

  private draw(): FlashCard {
    const kinds = this.setup.kinds;
    const kind = kinds[this.random.below(kinds.length)];
    return this.make(kind);
  }

  private make(kind: MathsKind): FlashCard {
    switch (kind) {
      case 'times': {
        const table = this.pick(this.setup.tables);
        const other = this.within(ONE_TO_TWELVE);
        return this.random.below(2) === 0
          ? { kind, left: table, right: other }
          : { kind, left: other, right: table };
      }
      case 'plus':
        return { kind, left: this.within(PLUS), right: this.within(PLUS) };
      case 'minus': {
        const left = this.within(MINUS_LEFT);
        return { kind, left, right: this.within({ min: 1, max: left }) };
      }
      case 'divide': {
        const divisor = this.pick(this.divisors());
        const quotient = this.within(ONE_TO_TWELVE);
        return { kind, left: divisor * quotient, right: divisor };
      }
    }
  }

  /** The card with its second number moved on by one within its range, so it differs. */
  private moveOn(card: FlashCard): FlashCard {
    switch (card.kind) {
      case 'times':
        return card.left === card.right || this.setup.tables.includes(card.left)
          ? { ...card, right: (card.right % 12) + 1 }
          : { ...card, left: (card.left % 12) + 1 };
      case 'plus':
        return { ...card, right: card.right >= PLUS.max ? PLUS.min : card.right + 1 };
      case 'minus':
        return { ...card, right: card.right >= card.left ? 1 : card.right + 1 };
      case 'divide': {
        const quotient = (card.left / card.right) % 12;
        return { ...card, left: card.right * (quotient + 1) };
      }
    }
  }

  /** The divisors of a Divide card: the chosen tables while Times is on, else 2 to 12. */
  private divisors(): readonly number[] {
    return this.setup.kinds.includes('times') ? this.setup.tables : DIVISORS;
  }

  private pick(values: readonly number[]): number {
    return values[this.random.below(values.length)];
  }

  private within(range: Range): number {
    return range.min + this.random.below(range.max - range.min + 1);
  }
}
