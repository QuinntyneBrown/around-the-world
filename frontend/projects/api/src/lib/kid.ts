/** One of the five kids a player picks to play as (L2-013), in the order they are offered. */
export const KID_IDS = ['zuri', 'kenji', 'nia', 'milo', 'pip'] as const;

export type KidId = (typeof KID_IDS)[number];

/** A kid of the cast: their name, tagline, description and picture (L2-013, L2-037). */
export interface Kid {
  readonly id: KidId;
  readonly name: string;
  readonly tagline: string;
  readonly description: string;
  /** The picture's address in `game`: "img/kid-zuri.jpg". */
  readonly picture: string;
}

/** Whether a value read from anywhere is one of the five kids' ids. */
export function isKidId(value: unknown): value is KidId {
  return typeof value === 'string' && (KID_IDS as readonly string[]).includes(value);
}
