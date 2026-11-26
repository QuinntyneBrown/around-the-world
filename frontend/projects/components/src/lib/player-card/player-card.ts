import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Badge } from '../badge/badge';

/** A player at a desk, as the Lobby shows them. */
export interface PlayerCardModel {
  readonly id: string;
  readonly kid: KidId;
  /** The kid's name: "Nia". */
  readonly kidName: string;
  /** The kid's picture's address. */
  readonly picture: string;
  /** The nickname in words, built on the device from its indexes: "Cosmic Gecko". */
  readonly nickname: string;
  readonly host: boolean;
  /** The device's own player. */
  readonly you: boolean;
}

/**
 * Player card (docs/design-system/components/player-card.html): one desk of the Lobby, a
 * player's kid on the kid's colour with the nickname and "as {kid}", "Host" with a crown and
 * "(you)" in words; or, with no player, "Empty desk" in a dashed outline. It sits on the native
 * `<li>` (docs/adr/0012). The nickname is bound as text, never as HTML (L2-040 criterion 3).
 */
@Component({
  selector: 'li[atw-player-card]',
  imports: [Badge],
  templateUrl: './player-card.html',
  styleUrl: './player-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'player-card',
    '[class.player-card--empty]': '!player()',
    '[attr.data-kid]': 'player()?.kid ?? null',
  },
})
export class PlayerCard {
  /** The player at the desk, or none for an empty desk. */
  readonly player = input<PlayerCardModel | null>(null);
}
