/** The kinds of maths a flash card can be, in the order Game Setup offers them (L2-016). */
export const MATHS_KINDS = ['times', 'plus', 'minus', 'divide'] as const;

export type MathsKind = (typeof MATHS_KINDS)[number];

/** The times tables Game Setup offers, ×2 to ×12 (L2-016). */
export const TIMES_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** The tour lengths Game Setup offers, in desks (L2-017). */
export const TOUR_LENGTHS = [6, 12, 24] as const;

export type TourLength = (typeof TOUR_LENGTHS)[number];

/** The card speeds Game Setup offers (L2-017). */
export const CARD_SPEEDS = ['chill', 'normal', 'lightning'] as const;

export type CardSpeed = (typeof CARD_SPEEDS)[number];

/**
 * The choices that shape a game (docs/detailed-designs/player/set-up-game/). Lists rather
 * than sets, in the order Game Setup offers them, so a setup is kept on the device as JSON.
 */
export interface GameSetup {
  /** The kinds of maths that are on: at least one. */
  readonly kinds: readonly MathsKind[];
  /** The times tables that are on: at least one, used only while Times is on. */
  readonly tables: readonly number[];
  readonly tourLength: TourLength;
  readonly cardSpeed: CardSpeed;
}
