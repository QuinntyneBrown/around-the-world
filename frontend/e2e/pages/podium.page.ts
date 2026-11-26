import { type Locator, type Page } from '@playwright/test';
import { motionOf, type Motion } from '../support/motion';

/** One place on the steps, as the Podium shows it. */
export interface ShownPlace {
  place: string;
  name: string;
}

/** One tile of the passport: a stamped country, or "Not reached". */
export type ShownStamp = string;

/**
 * Podium (docs/mocks/pages/podium/): the headline and the cheer, the top three on their steps,
 * the passport, and "Play again" and "Home".
 */
export class PodiumPage {
  readonly headline: Locator;
  readonly cheer: Locator;
  readonly steps: Locator;
  readonly passport: Locator;
  readonly passportTitle: Locator;
  readonly passportLine: Locator;
  readonly stamps: Locator;
  readonly stampTiles: Locator;
  readonly playAgain: Locator;
  readonly home: Locator;
  /** In a game with friends: "Everyone goes back to room {code}.", the lost room, and its way on. */
  readonly backToRoom: Locator;
  readonly lostRoom: Locator;
  readonly playWithFriends: Locator;

  constructor(private readonly page: Page) {
    this.headline = page.locator('.podium__headline');
    this.cheer = page.locator('.podium__cheer');
    this.steps = page.locator('.podium__steps');
    this.passport = page.locator('.passport');
    this.passportTitle = this.passport.getByRole('heading', { level: 2 });
    this.passportLine = this.passport.locator('.passport__head p');
    this.stamps = page.getByRole('list', { name: 'Stamps' });
    this.stampTiles = this.stamps.locator('.stamp');
    this.playAgain = page.getByRole('button', { name: 'Play again' });
    this.home = page.getByRole('link', { name: 'Home' });
    this.backToRoom = page.locator('.podium-page__hint');
    this.lostRoom = page.locator('.alert--warning');
    this.playWithFriends = page.getByRole('link', { name: 'Play with friends' });
  }

  async open(): Promise<void> {
    await this.page.goto('/podium');
  }

  /** How each place rises, or fades in under reduced motion, in place order (L2-038 6). */
  async placeMotions(): Promise<Motion[]> {
    const places = await this.steps.locator('.podium__place').all();
    return Promise.all(places.map((place) => motionOf(place)));
  }

  /** The places on the steps in place order (1st, 2nd, 3rd), as a screen reader reads them. */
  places(): Promise<ShownPlace[]> {
    return this.steps.locator('.podium__place').evaluateAll((places) =>
      places.map((place) => ({
        place: place.querySelector('.podium__rank')?.getAttribute('aria-label') ?? '',
        name: place.querySelector('.podium__name')?.textContent?.trim() ?? '',
      })),
    );
  }

  /** The places as drawn from left to right: 2nd, 1st, 3rd. */
  drawnOrder(): Promise<string[]> {
    return this.steps.locator('.podium__place').evaluateAll((places) =>
      [...places]
        .map((place) => ({
          name: place.querySelector('.podium__name')?.textContent?.trim() ?? '',
          left: place.getBoundingClientRect().left,
        }))
        .sort((one, other) => one.left - other.left)
        .map(({ name }) => name),
    );
  }

  /** Each tile of the passport: the country's name, or "Not reached". */
  tiles(): Promise<ShownStamp[]> {
    return this.stampTiles.evaluateAll((tiles) =>
      tiles.map((tile) =>
        tile.classList.contains('stamp--missing')
          ? (tile.querySelector('.visually-hidden')?.textContent?.trim() ?? '')
          : (tile.textContent?.trim() ?? ''),
      ),
    );
  }

  /** How many tiles the passport sets in one row. */
  columns(): Promise<number> {
    return this.stampTiles.evaluateAll((tiles) => {
      // The stamps are tilted, so a row is the tiles whose middles are level with the first's.
      const middle = (tile: Element) => {
        const box = tile.getBoundingClientRect();
        return box.top + box.height / 2;
      };
      const first = tiles[0];
      if (!first) return 0;
      const half = first.getBoundingClientRect().height / 2;
      return tiles.filter((tile) => Math.abs(middle(tile) - middle(first)) < half).length;
    });
  }
}
