import { type Locator, type Page } from '@playwright/test';

/** Duel (docs/mocks/pages/duel/): until journey 04 deals the first flash card, its loading state. */
export class DuelPage {
  readonly flashCard: Locator;
  readonly status: Locator;
  readonly getReady: Locator;
  readonly hudSkeleton: Locator;

  constructor(private readonly page: Page) {
    this.flashCard = page.locator('.flash-card');
    this.status = this.flashCard.getByRole('status');
    this.getReady = this.flashCard.locator('.flash-card__result');
    this.hudSkeleton = page.locator('.duel-hud .skeleton');
  }

  async open(): Promise<void> {
    await this.page.goto('/duel');
  }
}
