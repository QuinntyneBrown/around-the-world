import { type Locator, type Page } from '@playwright/test';

/** Pick Your Kid (docs/mocks/pages/pick-your-kid/): the five kids, the nickname and confirm. */
export class PickYourKidPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly roster: Locator;
  readonly kids: Locator;
  readonly chosenKid: Locator;
  readonly stageName: Locator;
  readonly stageTagline: Locator;
  readonly stageBio: Locator;
  readonly stagePicture: Locator;
  readonly nickname: Locator;
  readonly newName: Locator;
  readonly confirm: Locator;
  readonly typingFields: Locator;
  readonly status: Locator;
  readonly picturesAlert: Locator;
  readonly tryPicturesAgain: Locator;
  readonly drawnKids: Locator;
  readonly kidPictures: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.roster = page.getByRole('group', { name: 'Choose a kid' });
    this.kids = this.roster.locator('.kid-picker__option');
    this.chosenKid = this.roster.locator('.kid-picker__option[aria-pressed="true"]');
    this.stageName = page.locator('.kid-stage__name');
    this.stageTagline = page.locator('.kid-stage__tagline');
    this.stageBio = page.locator('.kid-stage__bio');
    this.stagePicture = page.locator('.kid-stage .portrait--hero');
    this.nickname = page.locator('.nickname__value');
    this.newName = page.getByRole('button', { name: 'New name' });
    this.confirm = page.locator('.toy-btn--block');
    this.typingFields = page.locator('input, textarea, select, [contenteditable="true"]');
    this.status = page.getByRole('status');
    this.picturesAlert = page.locator('.alert');
    this.tryPicturesAgain = page.getByRole('button', { name: 'Try the pictures again' });
    this.drawnKids = page.locator('.kid-picker .portrait .bean-icon');
    this.kidPictures = page.locator('.kid-picker img.portrait');
  }

  async open(): Promise<void> {
    await this.page.goto('/kid');
  }

  kid(name: string): Locator {
    return this.roster.getByRole('button', { name });
  }

  async choose(name: string): Promise<void> {
    await this.kid(name).click();
  }

  async chooseNewName(): Promise<void> {
    await this.newName.click();
  }

  async confirmKid(): Promise<void> {
    await this.confirm.click();
  }

  async goBack(): Promise<void> {
    await this.back.click();
  }

  /** Whether the chosen kid stands beside the roster (true) or above it (false). */
  async stageBesideRoster(): Promise<boolean> {
    const stage = await this.page.locator('.kid-stage').boundingBox();
    const roster = await this.roster.boundingBox();
    if (!stage || !roster) throw new Error('The stage or the roster is not shown');
    return roster.x >= stage.x + stage.width - 1;
  }

  /** Whether the five kids share one row. */
  async kidsInOneRow(): Promise<boolean> {
    const tops = await this.kids.evaluateAll((options) =>
      options.map((option) => Math.round(option.getBoundingClientRect().top)),
    );
    return tops.length === 5 && new Set(tops).size === 1;
  }

  /** Whether the page scrolls sideways. */
  scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
