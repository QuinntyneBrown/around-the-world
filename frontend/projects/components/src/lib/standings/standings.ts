import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Bean } from '../bean/bean';
import { Skeleton } from '../skeleton/skeleton';

/** One entry of the standings: a place, a kid, a name and a distance travelled. */
export interface StandingsItem {
  readonly place: number;
  readonly kid: KidId;
  /** The kid's name, or "You" for the device's own player. */
  readonly name: string;
  readonly distance: number;
  readonly you: boolean;
}

/** How many entries the placeholders stand in for while World Map is drawn. */
const PLACEHOLDERS = [1, 2, 3, 4, 5];

/**
 * Standings (docs/design-system/components/standings.html): the five kids in order of how far
 * they have travelled. Each entry gives the place, the kid as a bean, the name and
 * "{distance}/{tour length}" (L2-034 criterion 11); the child's entry is "You" with
 * `aria-current` and an accent edge, so it is marked by more than colour (L2-034 criterion 6).
 * With `loading` it shows five placeholders.
 */
@Component({
  selector: 'atw-standings',
  imports: [Bean, Skeleton],
  templateUrl: './standings.html',
  styleUrl: './standings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Standings {
  readonly items = input<readonly StandingsItem[]>([]);
  readonly tourLength = input(0);
  readonly loading = input(false);
  protected readonly placeholders = PLACEHOLDERS;
}
