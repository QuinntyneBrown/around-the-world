import { type Locator, type Page } from '@playwright/test';

/**
 * Home (docs/mocks/pages/home/): the classroom (the 3D classroom over its still picture), the
 * game's name, Play and the kid chip.
 */
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
  readonly settings: Locator;
  /** The sound button: "Mute sound", or "Turn sound on" while muted (L2-032 criterion 3). */
  readonly sound: Locator;
  readonly classroom: Locator;
  readonly classroomDrawn: Locator;
  readonly classroomResting: Locator;

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
    this.settings = page.locator('.home__corner').getByRole('button', { name: 'Settings' });
    this.sound = page.locator('.home__corner').getByRole('button', { name: /sound/ });
    this.classroom = page.locator('canvas.home__canvas');
    this.classroomDrawn = page.locator('canvas.home__canvas--drawn');
    this.classroomResting = page
      .getByRole('status')
      .filter({ hasText: 'The 3D classroom is having a rest' });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  /** Waits until Home has fetched all it fetches while the child reads it. */
  async settle(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async choosePlay(): Promise<void> {
    await this.play.click();
  }

  async chooseChangeKid(): Promise<void> {
    await this.kidChip.click();
  }
}
