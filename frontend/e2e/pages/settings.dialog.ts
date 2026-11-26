import { type Locator, type Page } from '@playwright/test';

/** Settings (docs/mocks/dialogs/settings/): the switches, Close and Done, opened from Home. */
export class SettingsDialog {
  readonly dialog: Locator;
  readonly title: Locator;
  readonly close: Locator;
  readonly done: Locator;
  readonly note: Locator;
  readonly sound: Locator;
  readonly soundState: Locator;
  readonly soundHelp: Locator;
  readonly answerByShouting: Locator;
  readonly answerByShoutingState: Locator;
  readonly answerByShoutingHelp: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Settings' });
    this.title = this.dialog.locator('.dialog__title');
    this.close = this.dialog.getByRole('button', { name: 'Close' });
    this.done = this.dialog.getByRole('button', { name: 'Done' });
    this.note = this.dialog.locator('.dialog__footer p');
    this.sound = this.dialog.getByRole('switch', { name: 'Sound', exact: true });
    this.soundState = this.sound.locator('.switch__state');
    this.soundHelp = this.dialog
      .locator('.setting')
      .filter({ has: page.getByRole('switch', { name: 'Sound', exact: true }) })
      .locator('.setting__help');
    this.answerByShouting = this.dialog.getByRole('switch', { name: 'Answer by shouting' });
    this.answerByShoutingState = this.answerByShouting.locator('.switch__state');
    const setting = this.dialog.locator('.setting').filter({ hasText: 'Answer by shouting' });
    this.answerByShoutingHelp = setting.locator('.setting__help');
  }
}
