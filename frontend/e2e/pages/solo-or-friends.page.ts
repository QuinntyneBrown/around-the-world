import { type Locator, type Page } from '@playwright/test';

/** Solo Or Friends (docs/mocks/pages/solo-or-friends/): "Just me" and "With friends". */
export class SoloOrFriendsPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly status: Locator;
  readonly modes: Locator;
  readonly modeTitles: Locator;
  readonly playSolo: Locator;
  readonly makeRoom: Locator;
  readonly joinRoom: Locator;
  readonly classmates: Locator;
  readonly classmatesSkeleton: Locator;
  readonly codeLetters: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.status = page.getByRole('status');
    this.modes = page.locator('.mode-card');
    this.modeTitles = this.modes.locator('h2');
    this.playSolo = page.locator('.mode-card .toy-btn--solo');
    this.makeRoom = page.locator('.mode-card .toy-btn--friends');
    this.joinRoom = page.locator('.mode-card .toy-btn--paper');
    this.classmates = page.locator('.portrait-stack .portrait');
    this.classmatesSkeleton = page.locator('.mode-card .skeleton');
    this.codeLetters = page.getByRole('img', { name: 'A room code looks like B O L T' });
  }

  async open(): Promise<void> {
    await this.page.goto('/play');
  }

  async choosePlaySolo(): Promise<void> {
    await this.playSolo.click();
  }

  async goBack(): Promise<void> {
    await this.back.click();
  }

  /** The names of the classmates pictured in "Just me", in order. */
  classmateNames(): Promise<string[]> {
    return this.classmates.evaluateAll((portraits) =>
      portraits.map(
        (portrait) => portrait.getAttribute('alt') ?? portrait.getAttribute('aria-label') ?? '',
      ),
    );
  }

  /** Whether the two ways to play stand side by side. */
  async modesSideBySide(): Promise<boolean> {
    const [first, second] = await Promise.all([
      this.modes.nth(0).boundingBox(),
      this.modes.nth(1).boundingBox(),
    ]);
    if (!first || !second) throw new Error('The two ways to play are not shown');
    return Math.abs(first.y - second.y) < 1 && second.x > first.x;
  }
}
