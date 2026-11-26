import { type Locator, type Page } from '@playwright/test';

/** Leave the game (docs/mocks/dialogs/leave-game/): "Stay and play" and "Leave", from Duel. */
export class LeaveGameDialog {
  readonly dialog: Locator;
  readonly text: Locator;
  readonly stay: Locator;
  readonly leave: Locator;

  constructor(page: Page) {
    this.dialog = page.getByRole('dialog', { name: 'Leave the game?' });
    this.text = this.dialog.locator('.dialog__body p');
    this.stay = this.dialog
      .locator('.dialog__footer')
      .getByRole('button', { name: 'Stay and play' });
    this.leave = this.dialog.getByRole('button', { name: /^(Leave|Leaving…)$/ });
  }
}
