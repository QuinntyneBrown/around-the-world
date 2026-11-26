import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { PodiumPage } from '../pages/podium.page';
import { WorldMapPage } from '../pages/world-map.page';

/**
 * Journey 06: finish the tour on the Podium (L2-006, L2-030, L2-032, L2-035). The game's clock
 * is held, so every wait between screens and the tour's time limit pass only when the spec
 * moves the clock on (docs/adr/0024-ending-a-tour.md).
 */

/** A child playing as Zuri who keeps a tour of the given length. */
const zuriWith = (tourLength: 6 | 12 | 24) => ({
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  setup: { kinds: ['times'], tables: [2, 3, 4, 5], tourLength, cardSpeed: 'normal' },
});

/** The waits after a duel the child wins as the traveller: "You got it!", the stamp, the message. */
const HOP_MS = 1000 + 1200;
const MESSAGE_MS = 1600;

/** The child answers the flash card first and hops on; World Map then shows the hop. */
async function winAndHop(page: Page, clock: { pass(ms: number): Promise<void> }): Promise<void> {
  const duel = new DuelPage(page);
  await expect(duel.answerBox).toHaveText('?');
  const { answer } = await duel.card();
  await duel.answerWithPad(answer);
  await expect(duel.result).toHaveText(`= ${answer} You got it!`);
  await clock.pass(HOP_MS);
  await expect(page).toHaveURL(/\/map$/);
}

test.describe('Finishing a tour', () => {
  test('@critical the child who goes all the way round wins and the Podium shows them first', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child travelling a tour of 6 desks who wins every duel
    await device.keeps(zuriWith(6));
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const map = new WorldMapPage(page);
    for (let hop = 1; hop < 5; hop++) {
      await winAndHop(page, clock);
      await clock.pass(MESSAGE_MS);
      await expect(page).toHaveURL(/\/duel$/);
    }

    // When the child hops past the last desk and so has gone all the way round
    await winAndHop(page, clock);

    // Then World Map shows the last hop, and the Podium opens once its message has stayed
    await expect(map.message).toHaveText('You walk on to Egypt!');
    await clock.pass(MESSAGE_MS);
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);

    // And the headline says the child went round the world, with Zuri's cheer under it
    await expect(podium.headline).toHaveText('You went around the world!');
    await expect(podium.cheer).toHaveText('Zuri raises her pencil like a knight.');

    // And the top three stand on their steps, read 1st to 3rd and drawn 2nd, 1st, 3rd
    await expect(podium.steps).toHaveAccessibleName('The top 3');
    expect(await podium.places()).toEqual([
      { place: '1st place', name: 'You' },
      { place: '2nd place', name: 'Kenji' },
      { place: '3rd place', name: 'Nia' },
    ]);
    expect(await podium.drawnOrder()).toEqual(['Kenji', 'You', 'Nia']);

    // And the passport has a stamp for every country, with the count and the child's place
    await expect(podium.passportTitle).toHaveText('Your passport');
    await expect(podium.passportLine).toHaveText('6 of 6 countries · 1st place');
    expect(await podium.tiles()).toEqual(['France', 'Egypt', 'Japan', 'UK', 'Italy', 'USA']);
    await expect(podium.playAgain).toBeVisible();
    await expect(podium.home).toBeVisible();
  });
});
