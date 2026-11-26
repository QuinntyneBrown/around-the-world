import { type Locator, type Page } from '@playwright/test';

/**
 * Mic Check (docs/mocks/pages/mic-check/): Milo and Bolt in the listener, the words of the
 * step, and its choices.
 */
export class MicCheckPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly listener: Locator;
  readonly picture: Locator;
  readonly badge: Locator;
  readonly rings: Locator;
  readonly levelMeter: Locator;
  readonly status: Locator;
  readonly alert: Locator;
  readonly title: Locator;
  readonly body: Locator;
  readonly heard: Locator;
  readonly actions: Locator;
  readonly turnOnMic: Locator;
  readonly waiting: Locator;
  readonly tryAgain: Locator;
  readonly letsGo: Locator;
  readonly useNumberPad: Locator;
  readonly tapInstead: Locator;

  constructor(page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.listener = page.locator('.listener');
    this.picture = this.listener.getByRole('img', { name: 'Milo and his robot Bolt' });
    this.badge = this.listener.locator('.listener__badge');
    this.rings = this.listener.locator('.listener__ring');
    this.levelMeter = page.locator('.mic-check .level-meter');
    this.status = page.locator('.mic-check__text [role="status"]');
    this.alert = page.locator('.mic-check__text [role="alert"]');
    this.title = page.locator('.mic-check__title');
    this.body = page.locator('.mic-check__body');
    this.heard = page.locator('.mic-check__heard');
    this.actions = page.locator('.mic-check__actions').locator('a, button');
    this.turnOnMic = page.getByRole('button', { name: 'Turn on mic' });
    this.waiting = page.getByRole('button', { name: 'Waiting for the mic…' });
    this.tryAgain = page.getByRole('button', { name: 'Try again' });
    this.letsGo = page.getByRole('button', { name: 'Let’s go!' });
    this.useNumberPad = page.getByRole('button', { name: 'Use number pad' });
    this.tapInstead = page.getByRole('button', { name: 'Too noisy? Tap answers instead' });
  }

  /** The words of every choice the step offers, Back aside. */
  async choices(): Promise<string[]> {
    return (await this.actions.allTextContents()).map((words) => words.trim());
  }
}
