import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Map message (docs/design-system/components/map-toast.html): the one line that drops in over
 * World Map when a duel is decided, centred under the header, in a polite live region, one at
 * a time (L2-034 criteria 3 and 4). With `inside` the region sits at the top of the room, where
 * an alert takes the message's place. Other content, such as that alert, goes inside it.
 */
@Component({
  selector: 'atw-map-toast',
  templateUrl: './map-toast.html',
  styleUrl: './map-toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'map-toast-region',
    role: 'status',
    'aria-live': 'polite',
    '[class.map-toast-region--inside]': 'inside()',
  },
})
export class MapToast {
  /** The message, or nothing while none is shown. */
  readonly message = input<string | null>(null);
  readonly inside = input(false);
}
