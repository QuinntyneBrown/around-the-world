import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { Panel } from '../panel/panel';
import { Skeleton } from '../skeleton/skeleton';

/** "Just me" or "With friends". */
export type Mode = 'solo' | 'friends';

/**
 * Mode card (docs/design-system/components/mode-card.html): one of the two ways to play on Solo
 * Or Friends, a panel with an icon, a title, one sentence, a picture of what you get
 * (`slot="art"`) and the actions at the bottom (`slot="actions"`). With `loading`, skeletons
 * in its shape stand in and it is hidden from assistive technology; the screen's status says
 * what is arriving.
 */
@Component({
  selector: 'atw-mode-card',
  imports: [Icon, Panel, Skeleton],
  templateUrl: './mode-card.html',
  styleUrl: './mode-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeCard {
  readonly mode = input<Mode>('solo');
  readonly heading = input('');
  readonly text = input('');
  readonly loading = input(false);
  /** The heading's id, which names the card. */
  protected readonly headingId = computed(() => `${this.mode()}-title`);
}
