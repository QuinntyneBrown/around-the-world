import { type Locator, type Page } from '@playwright/test';

/** Solo Or Friends (docs/mocks/pages/solo-or-friends/): until journey 03, its loading state. */
export class SoloOrFriendsPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly status: Locator;

  constructor(page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.status = page.getByRole('status');
  }

  async goBack(): Promise<void> {
    await this.back.click();
  }
}
