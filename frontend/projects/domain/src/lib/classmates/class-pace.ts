/** No classmate's answer arrives sooner than a child could give one (L2-020 criterion 5). */
export const FLOOR_MS = 800;
/** How soon a classmate may answer in the duel after the player lost two in a row. */
export const CATCH_UP_MS = 2000;
const LOSSES_BEFORE_CATCH_UP = 2;

/**
 * Keeps a classmate from winning every duel of a tour against a child who answers within 2
 * seconds (L2-020 criterion 5, ADR 0019): after the device's player has lost two duels in a
 * row, the classmates in their next duel answer no sooner than 2 seconds.
 */
export const ClassPace = {
  notBeforeMs(lostInARow: number): number {
    return lostInARow >= LOSSES_BEFORE_CATCH_UP ? CATCH_UP_MS : FLOOR_MS;
  },
};
