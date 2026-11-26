/** How many letters a room code has (L2-022). */
export const ROOM_CODE_LENGTH = 4;

/**
 * What the code field keeps of what a child typed (L2-023 criterion 1): the letters from A to Z
 * only, in either case, shown as capitals, four at most. Anything else is dropped.
 */
export function roomCodeLetters(typed: string): string {
  return [...typed]
    .filter((letter) => /^[a-z]$/i.test(letter))
    .join('')
    .toUpperCase()
    .slice(0, ROOM_CODE_LENGTH);
}
