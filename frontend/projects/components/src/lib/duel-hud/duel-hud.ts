import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Duel HUD (docs/design-system/components/duel-hud.html): the two duellists, "vs" between them
 * and the timer bar, on a surface at the top of Duel. With `loading`, skeletons in their shape
 * stand in and it is hidden from assistive technology. Journey 04 shows the duellists.
 */
@Component({
  selector: 'atw-duel-hud',
  imports: [Skeleton],
  templateUrl: './duel-hud.html',
  styleUrl: './duel-hud.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'duel-hud', '[attr.aria-hidden]': 'loading() || null' },
})
export class DuelHud {
  readonly loading = input(false);
}
