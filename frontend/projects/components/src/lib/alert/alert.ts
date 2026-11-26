import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';

export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Alert (docs/design-system/components/alert.html): a status in the flow of a screen, with a
 * title, a line of words and, optionally, actions (`slot="actions"`). It is a polite status.
 */
@Component({
  selector: 'atw-alert',
  imports: [Icon],
  templateUrl: './alert.html',
  styleUrl: './alert.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'alert',
    role: 'status',
    '[class.alert--success]': "tone() === 'success'",
    '[class.alert--warning]': "tone() === 'warning'",
    '[class.alert--danger]': "tone() === 'danger'",
  },
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly heading = input.required<string>();
}
