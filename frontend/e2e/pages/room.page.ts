import { type Locator, type Page } from '@playwright/test';

/** Room (docs/mocks/pages/room/): the four code boxes, the message line and "Join". */
export class RoomPage {
  readonly heading: Locator;
  readonly back: Locator;
  readonly question: Locator;
  readonly field: Locator;
  readonly boxes: Locator;
  readonly waitingBox: Locator;
  readonly message: Locator;
  readonly alert: Locator;
  readonly join: Locator;
  readonly playSolo: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.locator('.topbar__title');
    this.back = page.locator('.topbar').getByRole('link', { name: 'Back' });
    this.question = page.getByRole('heading', { name: 'What’s the code?' });
    this.field = page.getByRole('textbox', { name: 'Room code' });
    this.boxes = page.locator('.code-field__box');
    this.waitingBox = page.locator('.code-field__box[data-active="true"]');
    this.message = page.locator('#code-msg');
    this.alert = page.locator('.field-message').and(page.getByRole('alert'));
    this.join = page.locator('.toy-btn--friends');
    this.playSolo = page.getByRole('link', { name: 'Play solo instead' });
  }

  async open(code?: string): Promise<void> {
    await this.page.goto(code ? `/room/${code}` : '/room');
  }

  /** Types into the field as a child would, key by key. */
  async type(text: string): Promise<void> {
    await this.field.pressSequentially(text);
  }

  async erase(letters: number): Promise<void> {
    for (let i = 0; i < letters; i++) await this.field.press('Backspace');
  }

  async chooseJoin(): Promise<void> {
    await this.join.click();
  }

  async goBack(): Promise<void> {
    await this.back.click();
  }
}
