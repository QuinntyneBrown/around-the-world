import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GAME_SESSION } from '@atw/api';
import {
  Alert,
  IconButton,
  MapToast,
  Screen,
  Skeleton,
  Standings,
  WorldMap,
} from '@atw/components';
import { ClassroomStates } from '@atw/domain';
import {
  ClassroomCanvas,
  sameClassroom,
  type ClassroomStatus,
} from '../../classroom/classroom-canvas';
import { MapWords } from './map-words';

/**
 * World Map (docs/mocks/pages/world-map/): the classroom from above with every player's place,
 * the message of the last move and the standings (L2-034). It shows the tour `GameSession`
 * publishes; the session decides when the game moves on, and "Back to the card" asks it to at
 * once (docs/detailed-designs/tour/travel-round-ring/). Until the tour is published it is in
 * its loading state (docs/adr/0023). The 3D classroom is drawn from above under the drawn
 * room's labels once it arrives, the drawn room standing in until then; on a device that cannot
 * draw it, the still picture takes the room's place and the map says so (docs/adr/0028).
 */
@Component({
  selector: 'atw-world-map-page',
  imports: [Alert, ClassroomCanvas, IconButton, MapToast, Screen, Skeleton, Standings, WorldMap],
  templateUrl: './world-map.html',
  styleUrl: './world-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapPage {
  private readonly session = inject(GAME_SESSION);

  protected readonly tour = this.session.tour;
  /** The room from above: every player at their place, the move shown as a hop. */
  protected readonly classroom = computed(
    () => {
      const tour = this.tour();
      return tour ? ClassroomStates.ofTour(tour) : null;
    },
    { equal: sameClassroom },
  );
  protected readonly scene = signal<ClassroomStatus>('loading');
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
