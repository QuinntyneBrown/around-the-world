import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  type OnInit,
  output,
} from '@angular/core';
import { Icon, type IconName } from '../icon/icon';
import { PausableTimer } from './pausable-timer';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/** How long a passing message stays (L2-024 criterion 6). */
export const TOAST_LASTS_MS = 4000;

const ICONS: Record<ToastTone, IconName> = {
  info: 'person',
  success: 'check',
  warning: 'crown',
  danger: 'alert',
};

/**
 * Toast (docs/design-system/components/toast.html): a short message about something that just
 * happened, with its title, one line and "Dismiss". It is a status; a failure (`danger`) is an
 * alert and stays until it is dismissed. Any other leaves by itself after 4 seconds, waiting
 * while it is pointed at or focused, and emits `dismissed` as when "Dismiss" is pressed. It
 * sits in a `ToastRegion`.
 */
@Component({
  selector: 'atw-toast',
  imports: [Icon],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'toast',
    '[class.toast--info]': "tone() === 'info'",
    '[class.toast--success]': "tone() === 'success'",
    '[class.toast--warning]': "tone() === 'warning'",
    '[class.toast--danger]': "tone() === 'danger'",
    '[attr.role]': "tone() === 'danger' ? 'alert' : 'status'",
    '(mouseenter)': 'timer?.pause()',
    '(mouseleave)': 'timer?.resume()',
    '(focusin)': 'timer?.pause()',
    '(focusout)': 'timer?.resume()',
  },
})
export class Toast implements OnInit {
  readonly tone = input<ToastTone>('info');
  /** What happened, in three words: "Link copied". */
  readonly heading = input.required<string>();
  /** One short line. */
  readonly text = input<string>();
  /** The message is gone: dismissed, or left by itself. */
  readonly dismissed = output<void>();

  protected readonly icon = computed(() => ICONS[this.tone()]);
  protected timer: PausableTimer | null = null;
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (this.tone() === 'danger') return;
    const timer = new PausableTimer(TOAST_LASTS_MS, () => this.dismissed.emit());
    this.timer = timer;
    timer.resume();
    this.destroyRef.onDestroy(() => timer.stop());
  }
}
