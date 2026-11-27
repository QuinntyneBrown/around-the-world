import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { MID_RANGE_PHONE_SLOWDOWN, PHONE_ON_4G, SCHOOL_CONNECTION } from '../support/connections';
import {
  forgetResponses,
  largestContentfulPaint,
  recordResponses,
  slowestResponse,
} from '../support/timings';

/**
 * Journey 18: open fast and stay smooth on any device (L2-031, L2-047, L2-049). The connections are
 * Chrome's network emulation through the DevTools protocol (docs/adr/0038). The heap checks
 * of L2-048 criterion 4 run only when a person asks: `npm run e2e:measure`.
 *
 * Traces to: L2-031, L2-047, L2-049
 */

test.describe('Playing within 20 seconds', () => {
  test('@critical a new child on a school connection sees the first flash card within 20 seconds (L2-031 1, 2)', async ({
    page,
    network,
  }) => {
    // Given a new child on a laptop with a typical school connection
    await network.like(SCHOOL_CONNECTION);
    const opened = Date.now();

    // When they open the game and choose Play, the kid offered, "Play solo", "Go!" and the
    // number pad: five choices and no typing
    const home = new HomePage(page);
    await home.open();
    await home.choosePlay();
    await new PickYourKidPage(page).confirmKid();
    await new SoloOrFriendsPage(page).choosePlaySolo();
    await new GameSetupPage(page).chooseGo();
    await new MicCheckPage(page).tapInstead.click();

    // Then the first flash card is showing within 20 seconds of opening
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText(/\d+ × \d+/, { timeout: 20_000 });
    const tookMs = Date.now() - opened;
    test.info().annotations.push({ type: 'first flash card', description: `${tookMs} ms` });
    expect(tookMs).toBeLessThanOrEqual(20_000);
  });

  test('Home fetches the way on while the child reads it, so Play and the kid offered need no network', async ({
    page,
    network,
  }) => {
    // Given a new child reading Home, once it has fetched all it fetches
    const home = new HomePage(page);
    await home.open();
    await expect(home.play).toBeVisible();
    await home.settle();

    // When the network goes and the child chooses Play and the kid offered
    await network.offline();
    await home.choosePlay();
    const pick = new PickYourKidPage(page);
    await expect(pick.heading).toHaveText('Pick your kid');
    await pick.confirmKid();

    // Then Solo Or Friends opens: the code of both screens was already on the device
    const solo = new SoloOrFriendsPage(page);
    await expect(solo.heading).toHaveText('Who’s playing?');
    await expect(solo.playSolo).toBeVisible();
  });
});

test.describe('Home on a mid-range phone on 4G', () => {
  test.use({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
  });

  test('draws its largest content within 2.5 seconds and Play responds within 200 ms (L2-047 4)', async ({
    page,
    device,
    network,
    processor,
    classroom,
  }) => {
    // Given a child who has played before, on a mid-range phone on a 4G connection, with the
    // classroom's still picture: the machine running the specs draws WebGL in software, which
    // no phone does, and Home's largest content is the picture (docs/adr/0038)
    await classroom.cannotDraw();
    await device.keeps({ version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } });
    await network.like(PHONE_ON_4G);
    await processor.slowedBy(MID_RANGE_PHONE_SLOWDOWN);
    await recordResponses(page);

    // When Home is opened
    const home = new HomePage(page);
    await home.open();
    await expect(home.picture).toBeVisible();

    // Then its Largest Contentful Paint is within 2.5 seconds
    const paintMs = await largestContentfulPaint(page);
    test
      .info()
      .annotations.push({ type: 'largest contentful paint', description: `${paintMs} ms` });
    expect(paintMs).toBeLessThanOrEqual(2_500);

    // And its "Play" button responds within 200 ms
    await home.choosePlay();
    await expect(new SoloOrFriendsPage(page).heading).toHaveText('Who’s playing?');
    const responseMs = await slowestResponse(page);
    test.info().annotations.push({ type: 'Play responds', description: `${responseMs} ms` });
    expect(responseMs).toBeLessThanOrEqual(200);
  });
});

test.describe('A duel', () => {
  test('shows a pressed digit within 100 ms (L2-049 1)', async ({ page, device, classroom }) => {
    // Given a child in a duel, answering with the number pad, in front of the classroom's still
    // picture: the machine running the specs draws WebGL in software, at about 10 frames a
    // second, which no child's device does (docs/adr/0038)
    await classroom.cannotDraw();
    await device.keeps({
      version: 1,
      kid: 'zuri',
      nickname: { adjective: 0, animal: 0 },
      wayOfAnswering: 'numberPad',
    });
    await recordResponses(page);
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await expect(duel.answerBox).toHaveText('?');
    await forgetResponses(page);

    // When a key of the number pad is pressed
    await duel.pressDigits(7);

    // Then the digit shows, within 100 ms of the press
    await expect(duel.answerBox).toHaveText('7');
    const responseMs = await slowestResponse(page);
    test.info().annotations.push({ type: 'digit shows', description: `${responseMs} ms` });
    expect(responseMs).toBeLessThanOrEqual(100);
  });
});
