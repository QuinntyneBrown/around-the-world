import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { KidId, StickerId } from '@atw/api';
import { Portrait } from '../portrait/portrait';

/** A sticker as the bar offers it: its id, its words, whose it is and that kid's picture. */
export interface StickerChoice {
  readonly id: StickerId;
  readonly words: string;
  /** A kid's sticker, on the kid's tag colours, or Bolt's, drawn as a robot. */
  readonly kid: KidId | 'bolt';
  /** The kid's picture; empty for Bolt's. */
  readonly picture: string;
}

/**
 * Sticker bar (docs/design-system/components/sticker.html, the `sticker-bar` block): the six
 * stickers a watching player can send, as native buttons in a group named "Send a sticker",
 * 2 across, 3 across from 576 px and one row from 992 px. Each button's words are its accessible
 * name; the picture is decorative. It emits the id of the sticker pressed (L2-028 criteria 2
 * and 6).
 */
@Component({
  selector: 'div[atw-sticker-bar]',
  imports: [Portrait],
  templateUrl: './sticker-bar.html',
  styleUrl: './sticker-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'sticker-bar',
    role: 'group',
    'aria-label': 'Send a sticker',
  },
})
export class StickerBar {
  readonly stickers = input.required<readonly StickerChoice[]>();
  /** The sticker pressed. */
  readonly chosen = output<StickerId>();
}
