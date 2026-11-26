import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PlayerCard, type PlayerCardModel } from '../player-card/player-card';

/**
 * Player list (docs/design-system/components/player-card.html, the `player-grid` block): the
 * room's desks, each player's card and then "Empty desk" up to the room's 8 (L2-024 criterion
 * 1), in 2 columns, 3 from 576px and 4 from 1200px. It sits on the native `<ul>` (docs/adr/0012)
 * and is a polite live region, so a player who joins is announced.
 */
@Component({
  selector: 'ul[atw-player-list]',
  imports: [PlayerCard],
  templateUrl: './player-list.html',
  styleUrl: './player-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'player-grid player-grid--flush', 'aria-live': 'polite' },
})
export class PlayerList {
  readonly players = input.required<readonly PlayerCardModel[]>();
  /** How many desks the room has. */
  readonly capacity = input(8);
  protected readonly emptyDesks = computed(() =>
    Array.from({ length: Math.max(0, this.capacity() - this.players().length) }, (_, i) => i),
  );
}
