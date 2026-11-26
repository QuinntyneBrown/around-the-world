import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Skeleton } from '../skeleton/skeleton';

/**
 * How the line under the sum reads: quiet before an answer or while waiting, plain for a lost
 * duel, right or wrong after an answer, and time up with a clock.
 */
export type FlashCardTone = 'quiet' | 'plain' | 'right' | 'wrong' | 'timeUp';

/**
 * Flash card (docs/design-system/components/flash-card.html): the largest thing on the Duel
 * screen, the sum and under it the answer box or what just happened. With no `sum` it is the
 * card still being dealt: a skeleton in the sum's shape, `aria-busy`, and its `status` read out
 * politely (L2-031 criterion 4). With `answer` it shows the answer box, "?" while no digit is
 * entered (L2-010 criterion 1). `frozen` outlines and shakes the card once and freezes the
 * answer box (L2-004 criterion 5); a right answer outlines it in green (L2-033 criterion 2).
 * Other content, such as the pill after a lost duel, goes in its foot.
 */
@Component({
  selector: 'atw-flash-card',
  imports: [Icon, Skeleton],
  templateUrl: './flash-card.html',
  styleUrl: './flash-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flash-card',
    '[class.flash-card--right]': "tone() === 'right'",
    '[class.flash-card--frozen]': 'frozen()',
    '[attr.aria-busy]': 'dealing() || null',
  },
})
export class FlashCard {
  /** The sum, "6 × 4", or nothing while the card is being dealt. */
  readonly sum = input<string>();
  /** The sum in words, "6 times 4", as its accessible name. */
  readonly sumLabel = input<string>();
  /** Words read out politely and not shown: "Getting the first card ready…". */
  readonly status = input<string>();
  /** The digits entered, empty for "?", or null for no answer box. */
  readonly answer = input<string | null>(null);
  readonly frozen = input(false);
  /** The line under the sum: "Get ready…", "= 24". */
  readonly result = input<string>();
  /** Words after the line, in the text's own colour: "You got it!". */
  readonly emphasis = input<string>();
  readonly tone = input<FlashCardTone>('quiet');
  protected readonly dealing = computed(() => !this.sum());
}
