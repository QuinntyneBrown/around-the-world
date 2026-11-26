import { type KidId } from './kid';

/**
 * Where a tour is (docs/detailed-designs/tour/travel-round-ring/): the device's player in a duel,
 * World Map showing a move, World Map while classmates duel, or the tour over.
 */
export type TourPhase = 'duel' | 'moving' | 'watching' | 'over';

/** One player of a tour, as the screens name and draw them. */
export interface TourPlayer {
  readonly id: string;
  /** "You", a nickname, a kid's name or "Classmate" (L2-033 criterion 6, ADR 0019). */
  readonly name: string;
  /** Their kid, or "classmate" for a classmate who is not one of the five kids. */
  readonly kid: KidId | 'classmate';
  /** Whether it is the device's own player. */
  readonly you: boolean;
}

/** One desk of the ring: its number from 1, its country with its landmark, and its holder. */
export interface DeskState {
  readonly desk: number;
  readonly country: string;
  readonly landmark: string;
  /** The id of the player seated at it, or null for the empty desk. */
  readonly holder: string | null;
}

/**
 * What a decided duel did to the ring (docs/detailed-designs/tour/travel-round-ring/): the
 * traveller hopped on (`hop`), or the desk holder stood up and travels on while the beaten
 * traveller sat down (`deskHolderTravels`).
 */
export interface TourMove {
  readonly kind: 'hop' | 'deskHolderTravels';
  /** The id of the player travelling on. */
  readonly traveller: string;
  /** The desk the duel was at. */
  readonly from: number;
  /** The desk the traveller stands beside now. */
  readonly to: number;
  /** Whether the traveller passed the empty desk on the way (L2-002 criterion 4). */
  readonly passedEmptyDesk: boolean;
  /** For `deskHolderTravels`, the id of the beaten traveller who sat down at `from`. */
  readonly satDown: string | null;
}

/** One entry of the standings: a place from 1, a player and their distance travelled. */
export interface StandingsEntry {
  readonly place: number;
  readonly player: string;
  readonly distance: number;
}

/** A tour as World Map shows it (L2-034). Published by `GameSession.tour`. */
export interface TourState {
  readonly tourLength: number;
  /** The desks in order, from desk 1. */
  readonly desks: readonly DeskState[];
  readonly players: readonly TourPlayer[];
  /** The id of the traveller. */
  readonly traveller: string;
  /** The desk the traveller stands beside. */
  readonly travellerDesk: number;
  /** The five kids by distance travelled; a classmate who is not one of them has no entry. */
  readonly standings: readonly StandingsEntry[];
  /** The move World Map shows, or null when none is being shown. */
  readonly lastMove: TourMove | null;
  /** The desks whose countries the device's player has a stamp for, in the order reached. */
  readonly stamps: readonly number[];
  readonly phase: TourPhase;
}

/** How a tour ended (L2-006): someone went all the way round, or its time limit passed. */
/**
 * How a tour ended: someone went all the way round, its time limit passed, or, in a game with
 * friends, fewer than two players remained after a removal (L2-029 criterion 5, ADR 0036).
 */
export type TourEnding = 'allTheWayRound' | 'timeLimit' | 'everyoneLeft';

/** One page of a passport: a desk's country, stamped when the player reached it (L2-035 2). */
export interface PassportPage {
  readonly desk: number;
  readonly country: string;
  readonly stamped: boolean;
}

/**
 * How a tour ended, as the Podium shows it (docs/detailed-designs/tour/end-tour/). Published
 * by `GameSession.result` once the tour is over. It holds at most one place for each of the
 * five kids and one page for each desk, so it is bounded by the tour (L2-048 criterion 5).
 */
export interface TourResult {
  readonly ending: TourEnding;
  readonly tourLength: number;
  /** The id of the player who won: all the way round first, or the furthest on time. */
  readonly winner: string;
  /** The winner's distance travelled. */
  readonly winnerDistance: number;
  /** The places the screens name: the five kids, from 1st, as the standings (ADR 0024). */
  readonly places: readonly StandingsEntry[];
  readonly players: readonly TourPlayer[];
  /** The device's player's place among `places`. */
  readonly yourPlace: number;
  /** The device's player's passport: one page for each desk, from desk 1. */
  readonly passport: readonly PassportPage[];
  readonly countriesReached: number;
}
