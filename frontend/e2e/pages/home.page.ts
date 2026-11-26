import { type Locator, type Page } from '@playwright/test';

/** Home (docs/mocks/pages/home/): the classroom, the game's name, Play and the kid chip. */
export class HomePage {
  readonly title: Locator;
  readonly play: Locator;
  readonly picture: Locator;
  readonly pictureSkeleton: Locator;
  readonly kidChip: Locator;
  readonly kidChipName: Locator;
  readonly kidChipSkeleton: Locator;
  readonly changeKid: Locator;
  readonly noNamesLine: Locator;
  readonly status: Locator;

  constructor(private readonly page: Page) {
    this.title = page.locator('h1.home__title');
    this.play = page.locator('.home__play');
    this.picture = page.locator('img.home__picture');
    this.pictureSkeleton = page.locator('.home__scene .skeleton');
    this.kidChip = page.locator('a.kid-chip');
    this.kidChipName = this.kidChip.locator('.kid-chip__name');
    this.kidChipSkeleton = page.locator('.kid-chip[aria-hidden="true"]');
    this.changeKid = this.kidChip.locator('.kid-chip__action');
    this.noNamesLine = page.getByText('No names, no sign-up. You pick a kid and get a game name.');
    this.status = page.getByRole('status');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async choosePlay(): Promise<void> {
    await this.play.click();
  }

  async chooseChangeKid(): Promise<void> {
    await this.kidChip.click();
  }
}
