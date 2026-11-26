import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Sticker region (docs/design-system/components/sticker.html, the `sticker-region` block): where
 * the stickers received stack at the right edge of Duel, above its footer, newest at the bottom,
 * clear of the flash card (L2-028 criterion 7). It is a polite live region and takes no pointer
 * input; its `StickerPop`s go inside it. On a watching player's Duel (`watching`) the flash card
 * leaves no room above the `StickerBar` under 992 px, so the stickers pass over the bar there,
 * which still takes every press, and stand above its one row from 992 px (docs/adr/0035).
 */
@Component({
  selector: 'div[atw-sticker-region]',
  templateUrl: './sticker-region.html',
  styleUrl: './sticker-region.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticker-region',
    role: 'status',
    'aria-live': 'polite',
    '[class.sticker-region--watching]': 'watching()',
  },
})
export class StickerRegion {
  /** Whether it is a watching player's, with the sticker bar in the footer. */
  readonly watching = input(false);
}
