import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { BeanParts } from '../bean-parts/bean-parts';

/**
 * Bean: the small bean-bodied kid with their one accessory (Zuri's pencil, Kenji's glasses
 * and pack, Nia's headband, Milo's helmet and Bolt, Pip's paper plane). It is the drawn kid
 * that stands in for a portrait that cannot load (docs/design-system/components/portrait.html)
 * and the kid on World Map (docs/design-system/components/world-map.html). It is decorative.
 */
@Component({
  selector: 'atw-bean',
  imports: [BeanParts],
  templateUrl: './bean.html',
  styleUrl: './bean.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bean {
  /** The kid, or "classmate" for the plain bean of a further classmate, with no accessory. */
  readonly kid = input.required<KidId | 'classmate'>();
  readonly large = input(false);
}
