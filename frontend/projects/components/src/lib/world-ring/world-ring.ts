import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { RingPlace } from '@atw/api';

const CENTRE = 66;
const RADIUS = 52;

/** A point on the ring for desk n of a tour, desk 1 at the top, clockwise. */
function pointOf(desk: number, tourLength: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + ((desk - 1) * 2 * Math.PI) / tourLength;
  return {
    x: Math.round((CENTRE + RADIUS * Math.cos(angle)) * 10) / 10,
    y: Math.round((CENTRE + RADIUS * Math.sin(angle)) * 10) / 10,
  };
}

/**
 * World ring (docs/design-system/components/world-ring.html): a tiny map of every desk round
 * the room, with a dot for each kid and the device's own player's dot larger, on Duel from 768
 * px wide (L2-033 criterion 1, L2-050 criterion 3). Its name says where the player is.
 */
@Component({
  selector: 'atw-world-ring',
  templateUrl: './world-ring.html',
  styleUrl: './world-ring.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'world-ring' },
})
export class WorldRing {
  readonly tourLength = input.required<number>();
  /** The desk the device's player is at. */
  readonly desk = input.required<number>();
  readonly places = input<readonly RingPlace[]>([]);

  protected readonly desks = computed(() =>
    Array.from({ length: this.tourLength() }, (_, index) => ({
      start: index === 0,
      ...pointOf(index + 1, this.tourLength()),
    })),
  );
  protected readonly deskRadius = computed(() => (this.tourLength() > 12 ? 3 : 4.5));
  /** Everyone else first, so the player's own dot is drawn on top. */
  protected readonly racers = computed(() =>
    [...this.places()]
      .sort((one, other) => Number(one.you) - Number(other.you))
      .map((place) => ({ ...place, ...pointOf(place.desk, this.tourLength()) })),
  );
  protected readonly name = computed(
    () => `The ring of ${this.tourLength()} desks: you are at desk ${this.desk()}`,
  );
}
