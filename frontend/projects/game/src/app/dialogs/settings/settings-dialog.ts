import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WAY_OF_ANSWERING } from '@atw/api';
import { Dialog, Switch, ToyButton } from '@atw/components';

/** The id of the dialog's title, which names it. */
export const SETTINGS_TITLE_ID = 'settings-title';

/**
 * Settings (docs/mocks/dialogs/settings/), opened over Home with CDK Dialog: "Answer by
 * shouting", kept on the device the moment it changes, and Done (L2-032 criterion 4). The
 * "Sound" switch joins it with journey 10 (docs/detailed-designs/player/find-way-through-screens/).
 */
@Component({
  selector: 'atw-settings-dialog',
  imports: [Dialog, Switch, ToyButton],
  templateUrl: './settings-dialog.html',
  styleUrl: './settings-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDialog {
  private readonly ref = inject(DialogRef);
  private readonly way = inject(WAY_OF_ANSWERING);

  protected readonly titleId = SETTINGS_TITLE_ID;
  protected readonly available = this.way.available;
  protected readonly shouting = computed(() => this.way.kept() === 'voice');
  protected readonly shoutingHelp = this.available
    ? 'Off means you tap answers on the number pad.'
    : 'This browser can’t listen, so you tap answers.';

  protected answerByShouting(on: boolean): void {
    this.way.use(on ? 'voice' : 'numberPad');
  }

  protected close(): void {
    this.ref.close();
  }
}
