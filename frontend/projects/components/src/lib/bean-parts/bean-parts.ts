import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';

/**
 * The parts of the bean-bodied kid, drawn into an SVG group at the origin, standing on it: the
 * body in the kid's colour and their one accessory. `Bean` draws them as an icon, and World Map
 * places them at the desks (docs/design-system/components/world-map.html).
 */
@Component({
  selector: 'g[atw-bean-parts]',
  templateUrl: './bean-parts.html',
  styleUrl: './bean-parts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[attr.data-kid]': 'kid()' },
})
export class BeanParts {
  /** The kid, or "classmate" for the plain bean of a further classmate, with no accessory. */
  readonly kid = input.required<KidId | 'classmate'>();
}
