import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { BeanParts } from '../bean-parts/bean-parts';
import { RoomLayout, type RoomKid } from './room-layout';

let rooms = 0;

/**
 * World Map room (docs/design-system/components/world-map.html): the classroom from above, the
 * drawn stand-in for the 3D classroom while it loads, and its labels once it is drawn
 * (`labelsOnly`, docs/adr/0028). It draws the floor and the world-map
 * rug, the ring of desks with their country plaques, each kid as a bean at their desk or the
 * traveller on the dotted path, and the name tags of the five kids, "You" for the child
 * (L2-034 criteria 1 and 8, L2-037 criteria 5 and 6). Below 768 px it zooms to the child's own
 * kid; from 768 px it shows the whole room (L2-034 criterion 5). It is one picture, named by
 * `label`; `RoomLayout` places everything in it.
 */
@Component({
  selector: 'atw-world-map',
  imports: [BeanParts],
  templateUrl: './world-map.html',
  styleUrl: './world-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMap {
  readonly countries = input.required<readonly string[]>();
  readonly kids = input.required<readonly RoomKid[]>();
  readonly travellerDesk = input.required<number>();
  readonly nextDesk = input.required<number>();
  /** The picture's accessible name: "The classroom from above: a ring of 12 desks. …". */
  readonly label = input.required<string>();
  /**
   * Over the 3D classroom, which draws the floor, the desks and the kids at the same places
   * (docs/adr/0028), the room draws only its name tags and plaques.
   */
  readonly labelsOnly = input(false);

  /** The room is drawn once and shown in both views, so its id is this room's own. */
  protected readonly roomId = `world-map-room-${++rooms}`;
  protected readonly layout = computed(() =>
    RoomLayout.layout({
      countries: this.countries(),
      kids: this.kids(),
      travellerDesk: this.travellerDesk(),
      nextDesk: this.nextDesk(),
    }),
  );
}
