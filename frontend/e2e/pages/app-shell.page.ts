import { type Locator, type Page } from '@playwright/test';

/** The `game` app shell: the frame every screen opens in. */
export class AppShellPage {
  readonly skipLink: Locator;
  /** The screen's main part, where the skip link sends the focus. */
  readonly main: Locator;
  /** Any canvas the 3D classroom could be drawn on, whichever screen is shown. */
  readonly classroomCanvases: Locator;

  constructor(private readonly page: Page) {
    this.skipLink = page.locator('.skip-link');
    this.main = page.locator('#main');
    this.classroomCanvases = page.locator('canvas');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  title(): Promise<string> {
    return this.page.title();
  }

  /** The page's background colour, as the browser computed it. */
  background(): Promise<string> {
    return this.page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  }

  /** The value of a design token on the document, as the browser computed it. */
  token(name: string): Promise<string> {
    return this.page.evaluate(
      (token) => getComputedStyle(document.documentElement).getPropertyValue(token).trim(),
      name,
    );
  }

  /**
   * The screen as assistive technology reads it: every heading, field, button and link with its
   * role and its accessible name, one per line (Playwright's ARIA snapshot).
   */
  accessibilityTree(): Promise<string> {
    return this.page.locator('body').ariaSnapshot();
  }

  /** Every word the screen holds, shown or read out, including its live regions. */
  words(): Promise<string> {
    return this.page.evaluate(() => document.body.textContent ?? '');
  }

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }
}
