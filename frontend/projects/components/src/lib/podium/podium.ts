import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { ordinal } from '../ordinal/ordinal';
import { Skeleton } from '../skeleton/skeleton';

/** One place on the Podium: its number, the kid, the name ("You" for the child) and picture. */
export interface PodiumPlace {
  readonly place: number;
  readonly kid: KidId;
  readonly name: string;
  readonly picture: string;
}

/**
 * Podium (docs/design-system/components/podium.html): the headline, the winner's cheer and the
 * top three on steps of their own colour. The list is in place order for a screen reader, and
 * drawn 2nd, 1st, 3rd; each rank is read "{place} place" and the name is on the step, so the
 * place is not carried by colour alone (L2-035 criteria 1 and 5). Only the places that exist are
 * shown. With `loading` the headline reads "Counting the desks…" over placeholder steps.
 */
@Component({
  selector: 'atw-podium',
  imports: [Skeleton],
  templateUrl: './podium.html',
  styleUrl: './podium.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Podium {
  readonly headline = input('');
  /** The line under the headline: the winner's cheer; empty for none. */
  readonly cheer = input('');
  /** The top three (or fewer), in place order. */
  readonly places = input<readonly PodiumPlace[]>([]);
  readonly loading = input(false);

  protected readonly shown = computed(() =>
    this.places()
      .slice(0, 3)
      .map((place) => ({ ...place, rank: `${ordinal(place.place)} place` })),
  );
}
