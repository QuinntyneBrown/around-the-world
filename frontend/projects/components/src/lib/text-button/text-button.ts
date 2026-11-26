import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Text button (docs/design-system/components/text-button.html): a quiet action that is not
 * the screen's one big action. It sits on the native `<button>` (docs/adr/0012).
 */
@Component({
  selector: 'button[atw-text-button]',
  imports: [Icon],
  templateUrl: './text-button.html',
  styleUrl: './text-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'text-btn',
    '[class.text-btn--pill]': 'pill()',
    '[class.text-btn--sunken]': 'sunken()',
  },
})
export class TextButton {
  /** An icon before the label. */
  readonly icon = input<IconName>();
  readonly pill = input(false);
  /** On a white card, the pill sits on the canvas colour so it reads as a pill. */
  readonly sunken = input(false);
}
