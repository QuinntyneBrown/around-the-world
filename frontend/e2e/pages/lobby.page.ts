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
  readonly copyLink: Locator;
  readonly change: Locator;
  /** The panel a player who is not the host sees in place of "Start the race". */
  readonly guestPanel: Locator;
  /** The hidden status while the room is arriving. */
  readonly arriving: Locator;
  readonly main: Locator;
  readonly skeletons: Locator;
  readonly lostAlert: Locator;
  readonly tryAgain: Locator;
  readonly goHome: Locator;
  readonly messages: Locator;
  readonly toasts: Locator;

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
    this.copyLink = page.getByRole('button', { name: 'Copy room link' });
    this.change = page.getByRole('link', { name: 'Change' });
    this.guestPanel = page.locator('.panel--tint');
    this.arriving = page.getByRole('status').filter({ hasText: 'Getting the room…' });
    this.main = page.locator('main');
    this.skeletons = page.locator('main .skeleton');
    this.lostAlert = page.locator('.alert--danger');
    this.tryAgain = this.lostAlert.getByRole('button', { name: 'Try again' });
    this.goHome = this.lostAlert.getByRole('link', { name: 'Go home' });
    this.messages = page.getByRole('region', { name: 'Messages' });
    this.toasts = this.messages.locator('.toast');
  }

  /** A passing message by its place, from the top: its title, its text and its dismiss button. */
  toast(index: number): { title: Locator; text: Locator; dismiss: Locator; box: Locator } {
    const box = this.toasts.nth(index);
    return {
      box,
      title: box.locator('.toast__title'),
      text: box.locator('.toast__text'),
      dismiss: box.getByRole('button', { name: 'Dismiss' }),
    };
  }

  async chooseCopyLink(): Promise<void> {
    await this.copyLink.click();
  }

  async chooseTryAgain(): Promise<void> {
    await this.tryAgain.click();
  }

  async chooseGoHome(): Promise<void> {
    await this.goHome.click();
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
