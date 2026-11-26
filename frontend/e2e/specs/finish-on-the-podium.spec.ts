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

  test('when time runs out the tour ends with the current duel, and the furthest travelled wins', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child on a tour of 12 desks who hopped once, then duels the holder of Japan,
    // a classmate who answers right and fast
    await device.keeps(zuriWith(12));
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    await winAndHop(page, clock);
    await clock.pass(MESSAGE_MS);
    const duel = new DuelPage(page);
    await expect(duel.heading).toHaveText('Duel at Japan');

    // When the tour's 6 minutes pass and the classmate then wins the duel
    await clock.pass(6 * 60_000);
    await expect(duel.sitPill).toHaveText('You sit at Japan · Classmate travels on');

    // Then the tour ends with that duel: World Map shows it, then the Podium opens
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(map.message).toHaveText('So close! You sit down at Japan');
    await clock.pass(MESSAGE_MS);
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);

    // And the headline says time is up and the child travelled furthest
    await expect(podium.headline).toHaveText('Time’s up! You travelled furthest!');
    await expect(podium.cheer).toHaveText(
      '2 desks out of 12. Zuri raises her pencil like a knight.',
    );
    expect((await podium.places())[0]).toEqual({ place: '1st place', name: 'You' });

    // And the passport has France, where the tour started, and Japan, reached by the hop
    await expect(podium.passportLine).toHaveText('2 of 12 countries · 1st place');
    const tiles = await podium.tiles();
    expect(tiles).toHaveLength(12);
    expect(tiles.slice(0, 4)).toEqual(['France', 'Not reached', 'Japan', 'Not reached']);
  });

  test('a child who came second stands on the second step, and the headline names the winner', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child on a tour of 6 desks who sat down at Egypt, the classmates answering right
    // and fast, and the classmates' duels played out until a traveller reaches the child
    await device.keeps(zuriWith(6));
    await random.always(0);
    await clock.hold();
    await sitDownAtEgyptAndWait(page, clock);
    const duel = new DuelPage(page);
    await expect(duel.heading).toHaveText('Duel at Egypt');

    // When the tour's 3 minutes pass and the traveller beats the child, who keeps the desk
    await clock.pass(3 * 60_000);
    await expect(duel.sitPill).toHaveText('You keep Egypt · Nia hops on');
    await duel.sitPill.click();
    await clock.pass(MESSAGE_MS);

    // Then the Podium names Nia, who travelled furthest, and the child is second
    const podium = new PodiumPage(page);
    await expect(podium.headline).toHaveText('Time’s up! Nia travelled furthest!');
    await expect(podium.cheer).toHaveText('5 desks out of 6. Nia does a star jump.');
    expect(await podium.places()).toEqual([
      { place: '1st place', name: 'Nia' },
      { place: '2nd place', name: 'You' },
      { place: '3rd place', name: 'Kenji' },
    ]);
    expect(await podium.drawnOrder()).toEqual(['You', 'Nia', 'Kenji']);
    await expect(podium.passportLine).toHaveText('1 of 6 countries · 2nd place');
    expect(await podium.tiles()).toEqual([
      'France',
      'Not reached',
      'Not reached',
      'Not reached',
      'Not reached',
      'Not reached',
    ]);
  });

  test('after a Grand tour the passport has a tile for each of the 24 desks', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child on a tour of 24 desks who sat down at Egypt and holds it against a traveller
    await device.keeps(zuriWith(24));
    await random.always(0);
    await clock.hold();
    await sitDownAtEgyptAndWait(page, clock);
    const duel = new DuelPage(page);
    await expect(duel.heading).toHaveText('Duel at Egypt');

    // When the tour's 12 minutes pass and the duel ends
    await clock.pass(12 * 60_000);
    await duel.sitPill.click();
    await clock.pass(MESSAGE_MS);

    // Then the passport has 24 tiles, six across on a laptop, with France stamped
    const podium = new PodiumPage(page);
    await expect(podium.passportLine).toHaveText(/^1 of 24 countries · \d+(st|nd|rd|th) place$/);
    const tiles = await podium.tiles();
    expect(tiles).toHaveLength(24);
    expect(tiles[0]).toBe('France');
    expect(tiles.slice(1).every((tile) => tile === 'Not reached')).toBe(true);
    expect(await podium.columns()).toBe(6);

    // And four across on a phone
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await podium.columns()).toBe(4);
  });
});

/**
 * The child loses the first duel to Kenji and sits down at Egypt; World Map then plays the
 * classmates' duels until a traveller reaches the child's desk and Duel returns.
 */
async function sitDownAtEgyptAndWait(
  page: Page,
  clock: { pass(ms: number): Promise<void> },
): Promise<void> {
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  await clock.pass(5000);
  await duel.sitPill.click();
  const map = new WorldMapPage(page);
  await expect(map.message).toHaveText('So close! You sit down at Egypt');
  await map.back.click();
}
