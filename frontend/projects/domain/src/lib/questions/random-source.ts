/**
 * A source of random whole numbers (docs/detailed-designs/tour/make-flash-card/). The game
 * binds it to `Math.random`; a unit test gives a fixed sequence, so each rule is tested on
 * chosen numbers.
 */
export interface RandomSource {
  /** A whole number from 0 up to, but not including, the limit. */
  below(limit: number): number;
}

/** The random source of the game, from `Math.random`. */
export const mathRandom: RandomSource = {
  below: (limit) => Math.min(limit - 1, Math.floor(Math.random() * limit)),
};

/** A random source that gives these numbers in turn, again from the first after the last. */
export function fixedRandom(...numbers: number[]): RandomSource {
  let next = 0;
  return {
    below: (limit) => {
      const value = numbers[next % numbers.length];
      next += 1;
      return Math.max(0, Math.min(limit - 1, value));
    },
  };
}
