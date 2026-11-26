import { type FlashCard } from '@atw/api';
import { type ClassmateDecision } from '../classmates/classmate-agent';
import { Duel, type DuelSide } from './duel';

/** What a classmate does on a card: decides its answer and its time, not sooner than a time. */
export interface Answerer {
  decide(card: FlashCard, notBeforeMs?: number): ClassmateDecision;
}

/** How a duel between two classmates ended: who won, and when, from its first card. */
export interface ClassmatesResult {
  readonly winner: DuelSide;
  readonly afterMs: number;
}

/** How many cards one working out plays before it waits their time and tries again. */
export const CARDS_AT_ONCE = 5;

/** An answer waiting to be given. */
interface Due {
  readonly side: DuelSide;
  readonly atMs: number;
  readonly answer: number;
}

/**
 * Works out a solo duel between two classmates at its start (docs/adr/0022): each card under the
 * rules of every duel (`Duel`), each classmate answering as its agent decides; a wrong answer
 * freezes it for 1 second and it decides again from then, and a card nobody answers in its time
 * gives way to a new one. The result is the winner and the time of the first correct answer, or
 * null when no card of `CARDS_AT_ONCE` was answered.
 */
export const ClassmatesDuel = {
  play(
    nextCard: () => FlashCard,
    answerers: Record<DuelSide, Answerer>,
    cardMs: number,
  ): ClassmatesResult | null {
    for (let played = 0; played < CARDS_AT_ONCE; played++) {
      const card = nextCard();
      const duel = new Duel(card, { traveller: 'traveller', deskHolder: 'deskHolder' });
      const due: Due[] = (['traveller', 'deskHolder'] as const).map((side) => {
        const decision = answerers[side].decide(card);
        return { side, atMs: decision.afterMs, answer: decision.answer };
      });
      for (;;) {
        due.sort((one, other) => one.atMs - other.atMs);
        const first = due.shift();
        if (!first || first.atMs > cardMs) break;
        const result = duel.give(first.side, first.answer, first.atMs);
        if (result === 'won') {
          return { winner: first.side, afterMs: played * cardMs + first.atMs };
        }
        if (result === 'wrong') {
          const unfreezes = duel.unfreezesAt(first.side);
          const decision = answerers[first.side].decide(card);
          due.push({
            side: first.side,
            atMs: unfreezes + decision.afterMs,
            answer: decision.answer,
          });
        }
      }
    }
    return null;
  },
};
