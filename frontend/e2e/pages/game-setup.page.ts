import { type Locator, type Page } from '@playwright/test';

/** Game Setup (docs/mocks/pages/game-setup/): the maths, the tour length and the card speed. */
export class GameSetupPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly kinds: Locator;
  readonly kindsOn: Locator;
  readonly tables: Locator;
  readonly tablesOn: Locator;
  readonly easy: Locator;
  readonly all: Locator;
  readonly tourLengths: Locator;
  readonly tourLengthChosen: Locator;
  readonly tourHint: Locator;
  readonly speeds: Locator;
  readonly speedChosen: Locator;
  readonly speedHint: Locator;
  readonly lastKindStatus: Locator;
  readonly lastTableStatus: Locator;
  readonly timesOffHint: Locator;
  readonly go: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.kinds = page.getByRole('group', { name: 'Kinds of maths' }).locator('.toggle-chip');
    this.kindsOn = page
      .getByRole('group', { name: 'Kinds of maths' })
      .locator('.toggle-chip[aria-pressed="true"]');
    this.tables = page.getByRole('group', { name: 'Times tables' }).locator('.table-key');
    this.tablesOn = page
      .getByRole('group', { name: 'Times tables' })
      .locator('.table-key[aria-pressed="true"]');
    this.easy = page.getByRole('button', { name: 'Easy', exact: true });
    this.all = page.getByRole('button', { name: 'All', exact: true });
    this.tourLengths = page.getByRole('group', { name: 'How far round?' }).locator('.choice');
    this.tourLengthChosen = page
      .getByRole('group', { name: 'How far round?' })
      .locator('.choice[aria-pressed="true"]');
    this.tourHint = page.locator('.game-setup__tour-hint');
    this.speeds = page.getByRole('group', { name: 'Card speed' }).locator('.segmented__option');
    this.speedChosen = page
      .getByRole('group', { name: 'Card speed' })
      .locator('.segmented__option[aria-pressed="true"]');
    this.speedHint = page.locator('.game-setup__speed-hint');
    this.lastKindStatus = page.getByText('Keep at least one kind of maths on.');
    this.lastTableStatus = page.getByText('Keep at least one times table on.');
    this.timesOffHint = page.getByText('Turn on Times to pick tables.');
    this.go = page.locator('.toy-btn--xl');
  }

  async open(): Promise<void> {
    await this.page.goto('/setup');
  }

  kind(name: 'Times' | 'Plus' | 'Minus' | 'Divide'): Locator {
    return this.kinds.filter({ hasText: name });
  }

  table(n: number): Locator {
    return this.page.getByRole('button', { name: `${n} times table`, exact: true });
  }

  tourLength(desks: 6 | 12 | 24): Locator {
    return this.page
      .getByRole('group', { name: 'How far round?' })
      .getByRole('button', { name: `${desks} desks`, exact: true });
  }

  speed(name: 'Chill' | 'Normal' | 'Lightning'): Locator {
    return this.page
      .getByRole('group', { name: 'Card speed' })
      .getByRole('button', { name, exact: true });
  }

  /** The words of the kinds of maths that are on, in order. */
  kindsOnNames(): Promise<string[]> {
    return this.kindsOn.evaluateAll((chips) =>
      chips.map((chip) => (chip.textContent ?? '').replace(/[×+−÷]/g, '').trim()),
    );
  }

  /** The times tables that are on, in order. */
  tablesOnNumbers(): Promise<number[]> {
    return this.tablesOn.evaluateAll((keys) =>
      keys.map((key) => Number((key.getAttribute('aria-label') ?? '').split(' ')[0])),
    );
  }

  async chooseGo(): Promise<void> {
    await this.go.click();
  }

  async goBack(): Promise<void> {
    await this.back.click();
  }

  /** Whether the maths stand beside the tour (true) or above it (false). */
  async mathsBesideTour(): Promise<boolean> {
    const maths = await this.page.locator('.panel', { hasText: 'Which maths?' }).boundingBox();
    const tour = await this.page.locator('.panel', { hasText: 'How far round?' }).boundingBox();
    if (!maths || !tour) throw new Error('The maths or the tour is not shown');
    return tour.x >= maths.x + maths.width - 1;
  }

  /** Whether the page scrolls sideways. */
  scrollsSideways(): Promise<boolean> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
  }
}
