/** The most digits an entry holds: an answer is from 0 to 999 (L2-010 criterion 2). */
export const MAX_DIGITS = 3;

/**
 * The digits entered on the number pad for the current flash card, as text
 * (docs/detailed-designs/answering/answer-with-number-pad/). Pure functions over the entry.
 */
export const NumberEntry = {
  /** The entry with the digit added, or unchanged when it already holds three. */
  add(entry: string, digit: number): string {
    return entry.length >= MAX_DIGITS ? entry : `${entry}${digit}`;
  },

  /** The entry with its last digit removed (L2-010 criterion 3). */
  removeLast(entry: string): string {
    return entry.slice(0, -1);
  },

  /** The whole number entered, or null when no digit is (L2-010 criterion 4). */
  value(entry: string): number | null {
    return entry === '' ? null : Number(entry);
  },
};
