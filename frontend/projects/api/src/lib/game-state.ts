import { type FlashCard } from './flash-card';
import { type KidId } from './kid';
import { type Nickname } from './nickname';
import { type TourEnding } from './tour';

/** Where a room's game is (docs/adr/0033-deciding-a-game-on-the-server.md). */
export type GamePhase = 'starting' | 'duel' | 'decided' | 'timeUp' | 'over';

/** One player of a room's game: a room's player, or a classmate the server plays. */
export interface GamePlayer {
  readonly id: string;
  readonly kid: KidId | 'classmate';
  /** The nickname's indexes, for a room's player; null for a classmate. */
  readonly nickname: Nickname | null;
  readonly distance: number;
  /** The desks whose countries the player has a stamp for, in the order reached. */
  readonly stamps: readonly number[];
  /** Removed after 30 seconds away: no desk, and nobody plays for them (docs/adr/0036). */
  readonly removed: boolean;
}

/**
 * The duel of the last card the server dealt. While it is open it holds no answer; the times
 * left are durations from the moment it was sent, never a time of the server's.
 */
export interface GameDuel {
  /** The number of the card in the game, so each card is told from the last. */
  readonly number: number;
  readonly desk: number;
  readonly traveller: string;
  readonly deskHolder: string;
  readonly card: FlashCard;
  readonly timeLeftMs: number;
  readonly travellerFrozenMs: number;
  readonly deskHolderFrozenMs: number;
  readonly travellerWrong: number | null;
  readonly deskHolderWrong: number | null;
  readonly outcome: 'open' | 'won' | 'timedOut';
  readonly winner: 'traveller' | 'deskHolder' | null;
  /** The card's answer, once the duel is decided. */
  readonly answer: number | null;
  /** How long ago the duel was decided, or its card's time ran out, when it was sent. */
  readonly sinceDecidedMs: number;
}

/** What a decided duel did to the ring. */
export interface GameMove {
  readonly kind: 'hop' | 'deskHolderTravels';
  readonly traveller: string;
  readonly from: number;
  readonly to: number;
  readonly passedEmptyDesk: boolean;
  readonly satDown: string | null;
}

/**
 * A room's game as the server sends it after each change (`GameChanged`, docs/adr/0033). The
 * device keeps the last one only, so what it holds is bounded by the tour (L2-048 criterion 5).
 */
export interface GameState {
  readonly tourLength: number;
  readonly secondsToAnswer: number;
  readonly phase: GamePhase;
  /** While starting: how long until the first card, when it was sent. */
  readonly firstCardInMs: number;
  readonly players: readonly GamePlayer[];
  /** The holder of each desk from desk 1, or null for an empty desk. */
  readonly desks: readonly (string | null)[];
  readonly traveller: string;
  readonly travellerDesk: number;
  /** The players' ids by distance travelled, the furthest first. */
  readonly standings: readonly string[];
  readonly duel: GameDuel | null;
  readonly lastMove: GameMove | null;
  readonly ending: TourEnding | null;
  readonly winner: string | null;
}
