import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Portrait } from '../portrait/portrait';

/**
 * Sticker pop (docs/design-system/components/sticker.html, the `sticker-pop` block): a sticker
 * received, on the sender's kid's tag colours, with the sender's kid, the sticker's words and the
 * sender's name ("You" on their own device). It pops in, tilted; with reduced motion it is
 * upright and only fades in (L2-028 criterion 3). It sits in a `StickerRegion`.
 */
@Component({
  selector: 'p[atw-sticker-pop]',
  imports: [Portrait],
  templateUrl: './sticker-pop.html',
  styleUrl: './sticker-pop.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticker-pop',
    '[attr.data-kid]': 'kid()',
  },
})
export class StickerPop {
  /** The sender's kid. */
  readonly kid = input.required<KidId>();
  readonly picture = input.required<string>();
  readonly words = input.required<string>();
  /** Who sent it: "You" or the sender's nickname. */
  readonly from = input.required<string>();
}
