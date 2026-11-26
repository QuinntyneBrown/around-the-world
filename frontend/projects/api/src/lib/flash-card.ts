import { type MathsKind } from './game-setup';

/**
 * One sum shown to both players of a duel (docs/detailed-designs/tour/make-flash-card/): a kind
 * of maths and two whole numbers, as in `6 × 4`. It does not hold the answer, so a state that
 * carries a card does not reveal it.
 */
export interface FlashCard {
  readonly kind: MathsKind;
  readonly left: number;
  readonly right: number;
}
