import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Portrait, type PortraitState } from '../portrait/portrait';
import { Skeleton } from '../skeleton/skeleton';
import { Stack } from '../stack/stack';

/**
 * Kid chip (docs/design-system/components/kid-chip.html): the kid and nickname a child picked,
 * and "Change kid", as one link to Pick Your Kid. It sits on the native `<a>` (docs/adr/0012),
 * which carries the page's `routerLink`; on a `<span>` with `loading` it is the chip's
 * skeleton while the kid's picture arrives. The nickname is text, never HTML.
 */
@Component({
  selector: 'a[atw-kid-chip], span[atw-kid-chip]',
  imports: [Portrait, Skeleton, Stack],
  templateUrl: './kid-chip.html',
  styleUrl: './kid-chip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'kid-chip', '[attr.aria-hidden]': "loading() ? 'true' : null" },
})
export class KidChip {
  readonly kid = input<KidId>('zuri');
  /** The kid's name: "Zuri". */
  readonly kidName = input('');
  /** The nickname as words: "Speedy Otter". */
  readonly nickname = input('');
  readonly picture = input('');
  readonly pictureState = input<PortraitState>('loaded');
  /** Skeletons in the chip's shape stand in while the kid's picture arrives. */
  readonly loading = input(false);
}
