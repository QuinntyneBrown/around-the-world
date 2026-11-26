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

/**
 * Duel (docs/mocks/pages/duel/): the classroom behind a scrim, the duel strip, the flash card
 * and the number pad.
 */
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
  /** The timer bar while a dialog over Duel hides the screen from assistive technology. */
  readonly timerBarBehindDialog: Locator;
  readonly ring: Locator;
  readonly ringLabel: Locator;
  readonly ringRacers: Locator;
  readonly progress: Locator;
  readonly hudDesk: Locator;
  readonly numberPad: Locator;
  readonly padKeys: Locator;
  readonly go: Locator;
  readonly deleteKey: Locator;
  readonly stamp: Locator;
  readonly stampCountry: Locator;
  readonly stampLandmark: Locator;
  readonly stampHop: Locator;
  readonly sitPill: Locator;
  readonly shout: Locator;
  readonly useNumberPad: Locator;
  readonly shoutInstead: Locator;
  readonly switchWay: Locator;
  readonly voiceFailed: Locator;
  readonly pause: Locator;
  readonly scene: Locator;
  readonly scrim: Locator;
  readonly classroom: Locator;
  readonly classroomDrawn: Locator;

  constructor(private readonly page: Page) {
    this.scene = page.locator('img.duel__scene');
    this.scrim = page.locator('.duel__scrim');
    this.classroom = page.locator('canvas.duel__canvas');
    this.classroomDrawn = page.locator('canvas.duel__canvas--drawn');
    this.pause = page.locator('.duel__hud').getByRole('button', { name: 'Pause' });
    this.stamp = page.locator('.stamp-card');
    this.stampCountry = this.stamp.locator('.stamp-card__country');
    this.stampLandmark = this.stamp.locator('.stamp-card__landmark');
    this.stampHop = this.stamp.locator('.pill');
    this.sitPill = page.locator('.flash-card .text-btn--pill');
    this.shout = page.locator('.flash-card .shout');
    this.switchWay = page.locator('.duel__foot').getByRole('button');
    this.useNumberPad = this.switchWay.filter({ hasText: 'Use number pad' });
    this.shoutInstead = this.switchWay.filter({ hasText: 'Shout instead' });
    this.voiceFailed = page
      .locator('.flash-card')
      .getByRole('status')
      .filter({ hasText: 'Bolt stopped hearing' });
    this.heading = page.getByRole('heading', { level: 1 });
    this.announcement = page.locator('.duel__stage > [role="status"]');
    this.flashCard = page.locator('.flash-card');
    this.sum = this.flashCard.locator('.flash-card__sum');
    this.answerBox = this.flashCard.locator('.answer-box');
    this.result = this.flashCard.locator('.flash-card__result');
    this.traveller = page.locator('.duelist').first();
    this.deskHolder = page.locator('.duelist--flip');
    this.timerBar = page.getByRole('progressbar', { name: 'Time to answer' });
    this.timerBarBehindDialog = page.getByRole('progressbar', {
      name: 'Time to answer',
      includeHidden: true,
    });
    this.ring = page.locator('.world-ring');
    this.ringLabel = this.ring.locator('.world-ring__label');
    this.ringRacers = this.ring.locator('.world-ring__racer');
    this.progress = page.locator('.duel__progress .pill');
    this.hudDesk = page.locator('.duel-hud__desk');
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

  /** The kids on the world ring, in the order drawn, the device's own player marked "(you)". */
  racerKids(): Promise<string[]> {
    return this.ringRacers.evaluateAll((racers) =>
      racers.map((racer) => {
        const kid = racer.getAttribute('data-kid') ?? '';
        return racer.classList.contains('world-ring__racer--me') ? `${kid} (you)` : kid;
      }),
    );
  }

  /** Whether the number pad sits under the flash card or beside it. */
  async padPlacement(): Promise<'under' | 'beside'> {
    const card = await this.flashCard.boundingBox();
    const pad = await this.numberPad.boundingBox();
    if (!card || !pad) throw new Error('The flash card or the pad is not shown');
    return pad.y >= card.y + card.height - 1 ? 'under' : 'beside';
  }

  /**
   * Whether the flash card is the largest thing on the screen, as the mocks draw it: its sum is
   * the largest type, and nothing on the stage is wider than the card.
   */
  async cardIsLargest(): Promise<boolean> {
    const card = await this.flashCard.boundingBox();
    const pad = await this.numberPad.boundingBox();
    if (!card || !pad) throw new Error('The flash card or the pad is not shown');
    const largestType = await this.page.evaluate(() => {
      const sum = document.querySelector('.flash-card__sum');
      let largestOther = 0;
      for (const element of document.querySelectorAll('.duel *')) {
        if (element === sum || !element.textContent?.trim()) continue;
        largestOther = Math.max(largestOther, parseFloat(getComputedStyle(element).fontSize));
      }
      return sum !== null && parseFloat(getComputedStyle(sum).fontSize) > largestOther;
    });
    return largestType && card.width >= pad.width;
  }

  /** Whether the element's content fits it, with nothing cut off. */
  fits(locator: Locator): Promise<boolean> {
    return locator.evaluate((element) => element.scrollWidth <= element.clientWidth);
  }

  /** Whether the element is wholly inside the window. */
  async inView(locator: Locator): Promise<boolean> {
    const box = await locator.boundingBox();
    const size = this.page.viewportSize();
    if (!box || !size) return false;
    return (
      box.y >= 0 &&
      box.x >= 0 &&
      box.y + box.height <= size.height &&
      box.x + box.width <= size.width
    );
  }

  /** Whether the page scrolls either way. */
  scrolls(): Promise<boolean> {
    return this.page.evaluate(() => {
      const page = document.scrollingElement ?? document.documentElement;
      return page.scrollHeight > page.clientHeight || page.scrollWidth > page.clientWidth;
    });
  }
}
