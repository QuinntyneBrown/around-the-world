import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Field message (docs/design-system/components/field-message.html): the line under the code
 * field that says what is happening, as a status, or what went wrong, as an alert with an icon
 * so colour is not its only sign. It keeps its height when empty. It sits on the native `<p>`
 * (docs/adr/0012); the field points at it with `aria-describedby`.
 */
@Component({
  selector: 'p[atw-field-message]',
  imports: [Icon],
  templateUrl: './field-message.html',
  styleUrl: './field-message.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'field-message',
    '[class.field-message--error]': 'error() !== null',
    '[attr.role]': "error() === null ? 'status' : 'alert'",
  },
})
export class FieldMessage {
  /** The icon of what went wrong, or null for a status. */
  readonly error = input<IconName | null>(null);
}
