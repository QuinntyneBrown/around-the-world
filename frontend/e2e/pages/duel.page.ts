import { type Locator, type Page } from '@playwright/test';

/** How each sign of a flash card works out its answer. */
const OPERATIONS: Record<string, (left: number, right: number) => number> = {
  '×': (left, right) => left * right,
  '+': (left, right) => left + right,
  '−': (left, right) => left - right,
  '÷': (left, right) => left / right,
};

/** A flash card read from the screen: its two numbers, its sign and its answer. */
export interface ShownCard {
  left: number;
  sign: string;
  right: number;
  answer: number;
}

/** Duel (docs/mocks/pages/duel/): the duel strip, the flash card and the number pad. */
export class DuelPage {
  readonly heading: Locator;
  readonly announcement: Locator;
  readonly flashCard: Locator;
  readonly sum: Locator;
  readonly answerBox: Locator;
  readonly result: Locator;
  readonly traveller: Locator;
  readonly deskHolder: Locator;
  readonly timerBar: Locator;
  readonly ring: Locator;
  readonly ringLabel: Locator;
  readonly ringRacers: Locator;
  readonly progress: Locator;
  readonly numberPad: Locator;
  readonly padKeys: Locator;
  readonly go: Locator;
  readonly deleteKey: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.announcement = page.locator('.duel__stage > [role="status"]');
    this.flashCard = page.locator('.flash-card');
    this.sum = this.flashCard.locator('.flash-card__sum');
    this.answerBox = this.flashCard.locator('.answer-box');
    this.result = this.flashCard.locator('.flash-card__result');
    this.traveller = page.locator('.duelist').first();
    this.deskHolder = page.locator('.duelist--flip');
    this.timerBar = page.getByRole('progressbar', { name: 'Time to answer' });
    this.ring = page.locator('.world-ring');
    this.ringLabel = this.ring.locator('.world-ring__label');
    this.ringRacers = this.ring.locator('.world-ring__racer');
    this.progress = page.locator('.duel__progress .pill');
    this.numberPad = page.getByRole('group', { name: 'Number pad' });
    this.padKeys = this.numberPad.getByRole('button');
    this.go = this.numberPad.getByRole('button', { name: 'Go', exact: true });
    this.deleteKey = this.numberPad.getByRole('button', { name: 'Delete', exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto('/duel');
  }

  /** A duellist's name and role, as the duel strip shows them. */
  async named(duellist: Locator): Promise<[string, string]> {
    return [
      (await duellist.locator('.duelist__name').textContent())?.trim() ?? '',
      (await duellist.locator('.duelist__role').textContent())?.trim() ?? '',
    ];
  }

  /** The flash card showing, and its answer. */
  async card(): Promise<ShownCard> {
    const text = (await this.sum.textContent())?.trim() ?? '';
    const match = /^(\d+) ([×+−÷]) (\d+)$/.exec(text);
    if (!match) throw new Error(`Not a flash card: "${text}"`);
    const [left, sign, right] = [Number(match[1]), match[2], Number(match[3])];
    return { left, sign, right, answer: OPERATIONS[sign](left, right) };
  }

  /** Presses each digit of the number on the pad. */
  async pressDigits(digits: string | number): Promise<void> {
    for (const digit of String(digits)) {
      await this.numberPad.getByRole('button', { name: digit, exact: true }).click();
    }
  }

  /** Presses the digits of the answer and Go on the pad. */
  async answerWithPad(answer: number): Promise<void> {
    await this.pressDigits(answer);
    await this.go.click();
  }

  /** Types the keys on the keyboard: digits, "Backspace" and "Enter". */
  async typeKeys(...keys: string[]): Promise<void> {
    for (const key of keys) {
      if (/^\d+$/.test(key)) for (const digit of key) await this.page.keyboard.press(digit);
      else await this.page.keyboard.press(key);
    }
  }

  /** Whether the page scrolls either way. */
  scrolls(): Promise<boolean> {
    return this.page.evaluate(() => {
      const page = document.scrollingElement ?? document.documentElement;
      return page.scrollHeight > page.clientHeight || page.scrollWidth > page.clientWidth;
    });
  }
}
