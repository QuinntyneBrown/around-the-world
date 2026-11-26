import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';

/**
 * Bean: the small bean-bodied kid with their one accessory (Zuri's pencil, Kenji's glasses
 * and pack, Nia's headband, Milo's helmet and Bolt, Pip's paper plane). It is the drawn kid
 * that stands in for a portrait that cannot load (docs/design-system/components/portrait.html)
 * and the kid on World Map (docs/design-system/components/world-map.html). It is decorative.
 */
@Component({
  selector: 'atw-bean',
  templateUrl: './bean.html',
  styleUrl: './bean.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bean {
  readonly kid = input.required<KidId>();
  readonly large = input(false);
}
