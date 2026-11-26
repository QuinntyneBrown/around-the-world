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
