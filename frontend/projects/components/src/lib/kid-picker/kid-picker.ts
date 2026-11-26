import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Kid, KidId } from '@atw/api';
import { Icon } from '../icon/icon';
import { Portrait, type PortraitState } from '../portrait/portrait';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Kid picker (docs/design-system/components/kid-picker.html): the five kids as five toggle
 * buttons in one row, in a group labelled "Choose a kid", with exactly one pressed. The chosen
 * kid has an edge in their deep colour and a tick beside the name, so colour is never the only
 * mark (L2-051 criterion 3). With `loading`, skeletons stand in for the roster.
 */
@Component({
  selector: 'atw-kid-picker',
  imports: [Icon, Portrait, Skeleton],
  templateUrl: './kid-picker.html',
  styleUrl: './kid-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KidPicker {
  /** The kids in the order they are offered. */
  readonly kids = input.required<readonly Kid[]>();
  readonly selected = input.required<KidId>();
  /** Whether the kids' pictures have arrived, are arriving, or could not load. */
  readonly pictures = input<PortraitState>('loaded');
  readonly loading = input(false);
  /** The kid the child chose. */
  readonly picked = output<KidId>();
}
