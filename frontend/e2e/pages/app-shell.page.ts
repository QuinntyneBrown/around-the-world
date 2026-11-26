import { type Locator, type Page } from '@playwright/test';

/** The `game` app shell: the frame every screen opens in. */
export class AppShellPage {
  readonly skipLink: Locator;
  /** Any canvas the 3D classroom could be drawn on, whichever screen is shown. */
  readonly classroomCanvases: Locator;

  constructor(private readonly page: Page) {
    this.skipLink = page.locator('.skip-link');
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

  async pressTab(): Promise<void> {
    await this.page.keyboard.press('Tab');
  }
}
