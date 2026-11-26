import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Icon button (docs/design-system/components/icon-button.html): a corner control whose
 * meaning an icon carries. It sits on the native element (docs/adr/0012): `<a>` for Back,
 * `<button>` for an action. The page sets `aria-label`, which is required: it says what
 * pressing it does.
 */
@Component({
  selector: 'a[atw-icon-button], button[atw-icon-button]',
  imports: [Icon],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'icon-btn', '[class.icon-btn--on-code]': 'onCode()' },
})
export class IconButton {
  readonly icon = input.required<IconName>();
  /** On the room code's colour, as "Copy room link" (docs/mocks/pages/lobby/). */
  readonly onCode = input(false);
}
