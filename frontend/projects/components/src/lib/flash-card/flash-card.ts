import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/** How the line under the sum reads: quiet before an answer, right or wrong after one. */
export type FlashCardTone = 'quiet' | 'right' | 'wrong';

/**
 * Flash card (docs/design-system/components/flash-card.html): the largest thing on the Duel
 * screen, the sum and a line under it. With no `sum` it is the card still being dealt: a
 * skeleton in the sum's shape, `aria-busy`, and its `status` read out politely (L2-031
 * criterion 4). Journey 04 deals the sums.
 */
@Component({
  selector: 'atw-flash-card',
  imports: [Skeleton],
  templateUrl: './flash-card.html',
  styleUrl: './flash-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flash-card', '[attr.aria-busy]': 'dealing() || null' },
})
export class FlashCard {
  /** The sum, "6 × 4", or nothing while the card is being dealt. */
  readonly sum = input<string>();
  /** Words read out politely and not shown: "Getting the first card ready…". */
  readonly status = input<string>();
  /** The line under the sum: "Get ready…". */
  readonly result = input<string>();
  readonly tone = input<FlashCardTone>('quiet');
  protected readonly dealing = computed(() => !this.sum());
}
