import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { KidId } from '@atw/api';

/**
 * Timer bar (docs/design-system/components/timer-bar.html): drains over a flash card's time in
 * the traveller's colour (L2-005). It is a progress bar named "Time to answer", read in whole
 * seconds ("4 seconds left"), and it stops, faded, once the duel is decided.
 */
@Component({
  selector: 'atw-timer-bar',
  templateUrl: './timer-bar.html',
  styleUrl: './timer-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'timer-bar',
    role: 'progressbar',
    'aria-label': 'Time to answer',
    'aria-valuemin': '0',
    '[attr.aria-valuemax]': 'seconds()',
    '[attr.aria-valuenow]': 'secondsLeft()',
    '[attr.aria-valuetext]': 'words()',
    '[attr.data-kid]': 'kid()',
    '[class.timer-bar--paused]': 'stopped()',
    '[style.--value]': 'value()',
  },
})
export class TimerBar {
  /** The card's time to answer, in seconds. */
  readonly seconds = input.required<number>();
  readonly timeLeftMs = input.required<number>();
  /** The traveller's kid, whose colour the bar drains in. */
  readonly kid = input.required<KidId | 'classmate'>();
  readonly stopped = input(false);

  protected readonly secondsLeft = computed(() => Math.ceil(this.timeLeftMs() / 1000));
  protected readonly words = computed(() =>
    this.secondsLeft() === 1 ? '1 second left' : `${this.secondsLeft()} seconds left`,
  );
  protected readonly value = computed(() => {
    const share = this.seconds() > 0 ? this.timeLeftMs() / (this.seconds() * 1000) : 0;
    return `${Math.round(Math.min(1, Math.max(0, share)) * 1000) / 10}%`;
  });
}
