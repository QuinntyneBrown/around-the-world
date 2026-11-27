import { type Locator, type Page } from '@playwright/test';

/** One entry of the standings, as World Map shows it. */
export interface ShownStanding {
  place: string;
  name: string;
  score: string;
  you: boolean;
}

/**
 * World Map (docs/mocks/pages/world-map/): the line at the top, the message, the room from
 * above (the 3D classroom under the drawn room's labels) and the standings.
 */
export class WorldMapPage {
  readonly heading: Locator;
  readonly where: Locator;
  readonly back: Locator;
  readonly message: Locator;
  readonly room: Locator;
  readonly zoom: Locator;
  readonly standings: Locator;
  readonly standingsItems: Locator;
  readonly yourEntry: Locator;
  readonly classroom: Locator;
  readonly classroomDrawn: Locator;
  readonly stillPicture: Locator;
  readonly mapResting: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.where = page.locator('.world-map__where');
    this.back = page.getByRole('button', { name: 'Back to the card' });
    this.message = page.locator('.map-toast-region .map-toast');
    this.room = page.locator('.world-map__view--room');
    this.zoom = page.locator('.world-map__view--zoom');
    this.standings = page.getByRole('list', { name: 'Standings, by desks travelled' });
    this.standingsItems = this.standings.locator('.standings__item');
    this.yourEntry = this.standings.locator('.standings__item[aria-current="true"]');
    this.classroom = page.locator('canvas.world-map__canvas');
    this.classroomDrawn = page.locator('canvas.world-map__canvas--drawn');
    this.stillPicture = page.getByRole('img', { name: 'A picture of the classroom' });
    this.mapResting = page
      .locator('.world-map__room .alert[role="status"]')
      .filter({ hasText: 'The map is having a rest' });
  }

  async open(): Promise<void> {
    await this.page.goto('/map');
  }

  /** The entries of the standings in order. */
  entries(): Promise<ShownStanding[]> {
    return this.standingsItems.evaluateAll((items) =>
      items.map((item) => ({
        place: item.querySelector('.standings__place')?.textContent?.trim() ?? '',
        name: item.querySelector('.standings__name')?.textContent?.trim() ?? '',
        score: item.querySelector('.standings__score')?.textContent?.trim() ?? '',
        you: item.getAttribute('aria-current') === 'true',
      })),
    );
  }

  /** The countries the room labels, in the order drawn. */
  plaques(): Promise<string[]> {
    return this.page
      .locator('.world-map__room .art-plaque-text')
      .evaluateAll((texts) => texts.map((text) => text.textContent?.trim() ?? ''));
  }

  /** The plaque of the first desk and of the next stop, drawn each in its own way. */
  async markedPlaques(): Promise<{ start: string; next: string }> {
    const textOf = (selector: string) =>
      this.page
        .locator(`.world-map__room g:has(> ${selector}) > .art-plaque-text`)
        .first()
        .textContent();
    return {
      start: (await textOf('.art-plaque--start'))?.trim() ?? '',
      next: (await textOf('.art-plaque--next'))?.trim() ?? '',
    };
  }

  /** The name tags over the kids, in the order drawn. */
  tags(): Promise<string[]> {
    return this.page
      .locator('.world-map__room .art-tag-text')
      .evaluateAll((texts) => texts.map((text) => text.textContent?.trim() ?? ''));
  }

  /**
   * Whether the room is the drawn picture in full, or only its labels over the 3D classroom.
   */
  async roomDrawing(): Promise<'full' | 'labels'> {
    const floors = await this.page.locator('.world-map__room .art-floor').count();
    return floors > 0 ? 'full' : 'labels';
  }

  /** Whether the view shows the whole room or zooms to the child's own kid. */
  async view(): Promise<'room' | 'zoom'> {
    if (await this.room.isVisible()) return 'room';
    if (await this.zoom.isVisible()) return 'zoom';
    throw new Error('Neither view of the room is shown');
  }

  /** Sample the name tag on the map at departure and arrival using its browser animation. */
  async travelOfYourTag(): Promise<{ duration: number; distance: number }> {
    return this.page.locator('.art-tag--you').evaluate((tag) => {
      const group = tag.parentElement as unknown as SVGGraphicsElement;
      const walk = group.getAnimations()[0];
      if (!walk) return { duration: 0, distance: 0 };
      walk.pause();
      walk.currentTime = 0;
      const start = group.getCTM()!;
      const duration = Number(walk.effect!.getComputedTiming().duration);
      walk.currentTime = duration;
      const end = group.getCTM()!;
      return { duration, distance: Math.hypot(end.e - start.e, end.f - start.f) };
    });
  }

  /** Whether the page scrolls either way. */
  scrolls(): Promise<boolean> {
    return this.page.evaluate(() => {
      const page = document.scrollingElement ?? document.documentElement;
      return page.scrollHeight > page.clientHeight || page.scrollWidth > page.clientWidth;
    });
  }
}
