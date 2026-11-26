import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconButton } from '../icon-button/icon-button';

/**
 * Dialog (docs/design-system/components/dialog.html): the backdrop and the panel of a question
 * over the screen: the title, Close, the body and the actions (`slot="actions"`), the safe one
 * first. A sheet from the bottom under 576px, a centred card from 576px. It is presentation
 * only: the app opens it with CDK Dialog, which traps the focus, closes on Escape, names the
 * dialog by `titleId` and hides the screen behind from assistive technology.
 */
@Component({
  selector: 'atw-dialog',
  imports: [IconButton],
  templateUrl: './dialog.html',
  styleUrl: './dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dialog {
  readonly heading = input.required<string>();
  /** The id of the title, which the dialog is named by. */
  readonly titleId = input.required<string>();
  /** Close, or a press on the backdrop. */
  readonly closed = output();
}
