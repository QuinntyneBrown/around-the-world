/**
 * A made-up name of one adjective and one animal, held as the indexes of the two words in two
 * fixed lists of ten (L2-014). It is turned into words only to be shown, and never travels or
 * is kept as text (docs/detailed-designs/platform/keep-children-safe/).
 */
export interface Nickname {
  readonly adjective: number;
  readonly animal: number;
}
