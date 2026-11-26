import { type FlashCard } from './flash-card';
import { type KidId } from './kid';

/** One of the two players of a duel, as the Duel screen shows them. */
export interface Duellist {
  /** The name the duel strip shows: "You", a nickname, a kid's name or "Classmate" (L2-033 6). */
  readonly name: string;
  /** Their kid, or "classmate" for a classmate who is not one of the five kids. */
  readonly kid: KidId | 'classmate';
}

/** A kid's place on the world ring (docs/design-system/components/world-ring.html). */
export interface RingPlace {
  readonly kid: KidId;
  readonly desk: number;
  /** Whether it is the device's own player. */
  readonly you: boolean;
}

/** Whether a duel is still open, won, or ran out of time with no correct answer. */
export type DuelOutcome = 'open' | 'won' | 'timedOut';

/** What the device's player is in a duel. */
export type DuelRole = 'traveller' | 'deskHolder' | 'watching';

/**
 * A duel as the Duel screen shows it (docs/detailed-designs/tour/play-duel/). Published by
 * `GameSession.duel`; the answer is in it only once the duel is decided.
 */
export interface DuelState {
  readonly card: FlashCard;
  /** The number of the desk the duel is at; the first duel of a tour is at desk 2. */
  readonly desk: number;
  readonly tourLength: number;
  /** The country of the desk the duel is at. */
  readonly country: string;
  readonly traveller: Duellist;
  readonly deskHolder: Duellist;
  readonly role: DuelRole;
  /** The card's time to answer, set by the card speed (L2-005). */
  readonly secondsToAnswer: number;
  readonly timeLeftMs: number;
  /** Whether the device's player is frozen after a wrong answer (L2-004). */
  readonly frozen: boolean;
  /** The wrong answer that froze the device's player, while they are frozen. */
  readonly wrongAnswer: number | null;
  readonly outcome: DuelOutcome;
  /** Who won, once the duel is won. */
  readonly winner: 'traveller' | 'deskHolder' | null;
  /** The card's answer, once the duel is decided. */
  readonly answer: number | null;
  /** The kids round the ring, for the world ring. */
  readonly ring: readonly RingPlace[];
}
