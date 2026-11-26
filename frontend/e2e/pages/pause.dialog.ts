import { type Locator, type Page } from '@playwright/test';

/** Pause (docs/mocks/dialogs/pause/): "Keep playing" and "Go home", opened from Duel. */
export class PauseDialog {
  readonly dialog: Locator;
  readonly text: Locator;
  readonly close: Locator;
  readonly keepPlaying: Locator;
  readonly goHome: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Paused' });
    this.text = this.dialog.locator('.dialog__body p');
    this.close = this.dialog
      .locator('.dialog__header')
      .getByRole('button', { name: 'Keep playing' });
    this.keepPlaying = this.dialog
      .locator('.dialog__footer')
      .getByRole('button', { name: 'Keep playing' });
    this.goHome = this.dialog.getByRole('button', { name: 'Go home' });
  }
}
