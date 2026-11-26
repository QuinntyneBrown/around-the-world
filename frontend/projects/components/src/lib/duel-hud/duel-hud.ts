import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Portrait } from '../portrait/portrait';
import { Skeleton } from '../skeleton/skeleton';

/** One duellist as the duel strip shows them. */
export interface DuelHudPlayer {
  /** "You", a nickname, a kid's name or "Classmate". */
  readonly name: string;
  /** "Travelling" or "Holds {country}". */
  readonly role: string;
  readonly kid: KidId | 'classmate';
  /** The kid's picture, or empty for a classmate who is drawn. */
  readonly picture: string;
}

/**
 * Duel HUD (docs/design-system/components/duel-hud.html): the traveller on the left, "vs", the
 * desk holder on the right, each with their kid, name and role, over the timer bar the page
 * puts inside it. With `loading`, skeletons in their shape stand in and it is hidden from
 * assistive technology. `desk` ("Desk 2 of 12") shows beside the names only on a screen under
 * 544 px tall, where the world ring gives way (L2-050 criterion 5).
 */
@Component({
  selector: 'atw-duel-hud',
  imports: [Portrait, Skeleton],
  templateUrl: './duel-hud.html',
  styleUrl: './duel-hud.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'duel-hud', '[attr.aria-hidden]': 'loading() || null' },
})
export class DuelHud {
  readonly loading = input(false);
  readonly traveller = input<DuelHudPlayer>();
  readonly deskHolder = input<DuelHudPlayer>();
  readonly desk = input('');
  /** The traveller, then the desk holder. */
  protected readonly players = computed(() =>
    [this.traveller(), this.deskHolder()].filter((player) => player !== undefined),
  );
}
