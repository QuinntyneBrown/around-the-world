import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Badge (docs/design-system/components/badge.html): a small label on a picture, such as "Host"
 * with a crown. It sits on the native `<span>` (docs/adr/0012); the words are projected, so the
 * mark is never carried by the icon alone.
 */
@Component({
  selector: 'span[atw-badge]',
  imports: [Icon],
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'badge', '[class.badge--you]': 'you()' },
})
export class Badge {
  readonly icon = input<IconName>();
  /** Navy, for the child's own entry. */
  readonly you = input(false);
}
