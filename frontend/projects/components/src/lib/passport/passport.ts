import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { ordinal } from '../ordinal/ordinal';
import { Portrait } from '../portrait/portrait';
import { Skeleton } from '../skeleton/skeleton';

/** One tile of the passport: a desk's country, and whether the child reached it. */
export interface PassportStamp {
  readonly country: string;
  readonly reached: boolean;
}

/** A tour longer than this sets its stamps in more, wider columns (`passport__stamps--long`). */
const SHORT_TOUR = 12;

/**
 * Passport (docs/design-system/components/passport.html): the child's portrait, "Your
 * passport", "{n} of {tour length} countries · {place} place", and one tile for each desk of
 * the tour: a stamp with the country's name, or "?" read "Not reached" (L2-035 criterion 2). It
 * holds one tile a desk, so it is bounded by the tour. With `loading` it is a placeholder.
 */
@Component({
  selector: 'atw-passport',
  imports: [Portrait, Skeleton],
  templateUrl: './passport.html',
  styleUrl: './passport.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Passport {
  readonly kid = input<KidId>('zuri');
  readonly picture = input('');
  /** One stamp for each desk of the tour, from desk 1. */
  readonly stamps = input<readonly PassportStamp[]>([]);
  /** The child's place. */
  readonly place = input(1);
  readonly loading = input(false);

  protected readonly line = computed(() => {
    const reached = this.stamps().filter((stamp) => stamp.reached).length;
    return `${reached} of ${this.stamps().length} countries · ${ordinal(this.place())} place`;
  });
  protected readonly long = computed(() => this.stamps().length > SHORT_TOUR);
}
