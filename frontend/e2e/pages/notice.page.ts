import { type Locator, type Page } from '@playwright/test';

/**
 * A notice page: Not Found (docs/mocks/pages/not-found/) or Something Went Wrong
 * (docs/mocks/pages/something-went-wrong/): one message and the ways on.
 */
export class NoticePage {
  readonly notice: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly actions: Locator;
  readonly home: Locator;
  readonly tryAgain: Locator;

  constructor(private readonly page: Page) {
    this.notice = page.locator('.notice');
    this.title = page.getByRole('heading', { level: 1 });
    this.text = this.notice.locator('.notice__text');
    this.actions = this.notice.locator('.notice__actions').locator('a, button');
    this.home = this.notice.getByRole('link', { name: 'Home' });
    this.tryAgain = this.notice.getByRole('button', { name: 'Try again' });
  }

  /** Opens an address that leads to no screen. */
  async openNowhere(): Promise<void> {
    await this.page.goto('/desk-99');
  }
}
