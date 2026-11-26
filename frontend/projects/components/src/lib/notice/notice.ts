import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Notice (docs/design-system/components/notice.html): a whole screen with one message and one
 * way on, for an address that leads nowhere or the game tripping over. It sits on the native
 * element that holds the screen's content (`<main atw-notice>`, docs/adr/0012): the art, the
 * title (the page's h1), the text, and the actions the page projects, Home always among them.
 */
@Component({
  selector: 'main[atw-notice], div[atw-notice]',
  imports: [Icon],
  templateUrl: './notice.html',
  styleUrl: './notice.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'notice' },
})
export class Notice {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
