import { type Locator, type Page } from '@playwright/test';

/** The Lobby (docs/mocks/pages/lobby/): the code, the game's setup, the start and the players. */
export class LobbyPage {
  readonly heading: Locator;
  readonly leave: Locator;
  readonly code: Locator;
  readonly codeHint: Locator;
  readonly setupTerms: Locator;
  readonly setupValues: Locator;
  readonly startRace: Locator;
  readonly startHint: Locator;
  readonly classHeading: Locator;
  readonly count: Locator;
  readonly players: Locator;
  readonly emptyDesks: Locator;
  readonly host: Locator;

  constructor(page: Page) {
    this.heading = page.locator('.topbar__title');
    this.leave = page.locator('.topbar').getByRole('button', { name: 'Leave the room' });
    this.code = page.locator('.room-code__value');
    this.codeHint = page.locator('.room-code__hint');
    this.setupTerms = page.locator('.summary__term');
    this.setupValues = page.locator('.summary__value');
    this.startRace = page.getByRole('button', { name: 'Start the race' });
    this.startHint = page.locator('#start-hint');
    this.classHeading = page.getByRole('heading', { name: 'In the classroom' });
    this.count = page.getByRole('img', { name: / of 8 players$/ });
    this.players = page.locator('.player-card:not(.player-card--empty)');
    this.emptyDesks = page.locator('.player-card--empty');
    this.host = this.players.filter({ has: page.locator('.player-card__badge') });
  }

  /** A player's card by the words it shows: "Cosmic Gecko (you)" and "as Nia". */
  player(index: number): { name: Locator; kid: Locator; badge: Locator } {
    const card = this.players.nth(index);
    return {
      name: card.locator('.player-card__name'),
      kid: card.locator('.player-card__kid'),
      badge: card.locator('.player-card__badge'),
    };
  }

  async chooseLeave(): Promise<void> {
    await this.leave.click();
  }
}
