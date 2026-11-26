import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GAME_SESSION } from '@atw/api';
import { IconButton, MapToast, Screen, Skeleton, Standings, WorldMap } from '@atw/components';
import { MapWords } from './map-words';

/**
 * World Map (docs/mocks/pages/world-map/): the classroom from above with every player's place,
 * the message of the last move and the standings (L2-034). It shows the tour `GameSession`
 * publishes; the session decides when the game moves on, and "Back to the card" asks it to at
 * once (docs/detailed-designs/tour/travel-round-ring/). Until the tour is published it is in
 * its loading state; the error state comes with the 3D classroom (docs/adr/0023).
 */
@Component({
  selector: 'atw-world-map-page',
  imports: [IconButton, MapToast, Screen, Skeleton, Standings, WorldMap],
  templateUrl: './world-map.html',
  styleUrl: './world-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapPage {
  private readonly session = inject(GAME_SESSION);

  protected readonly tour = this.session.tour;
  protected readonly where = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.where(tour) : '';
  });
  protected readonly label = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.label(tour) : '';
  });
  protected readonly message = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.message(tour) : null;
  });
  protected readonly kids = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.kids(tour) : [];
  });
  protected readonly standings = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.standings(tour) : [];
  });
  protected readonly countries = computed(() =>
    (this.tour()?.desks ?? []).map(({ country }) => country),
  );
  protected readonly nextDesk = computed(() => {
    const tour = this.tour();
    return tour ? MapWords.nextDesk(tour) : 1;
  });

  /** "Back to the card": Duel returns at once (L2-034 criterion 12). */
  protected backToTheCard(): void {
    this.session.continue();
  }
}
