import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Alert (docs/design-system/components/alert.html): a status in the flow of a screen, with a
 * title, a line of words and, optionally, actions (`slot="actions"`). It is a polite status;
 * `urgent` makes it an alert, for a refusal the child just met. As a `banner` it runs across
 * the top of the screen, and may have no title.
 */
@Component({
  selector: 'atw-alert',
  imports: [Icon],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'alert',
    '[attr.role]': "urgent() ? 'alert' : 'status'",
    '[class.alert--success]': "tone() === 'success'",
    '[class.alert--warning]': "tone() === 'warning'",
    '[class.alert--danger]': "tone() === 'danger'",
    '[class.banner]': 'banner()',
  },
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly heading = input<string>();
  readonly icon = input<IconName>('info');
  /** Announced at once, as `role="alert"`: a refusal of what the child just did. */
  readonly urgent = input(false);
  /** Across the top of the screen, as the offline banner. */
  readonly banner = input(false);
}
