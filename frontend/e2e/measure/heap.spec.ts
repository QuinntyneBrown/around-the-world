import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
import { WorldMapPage } from '../pages/world-map.page';
import { framesPerSecond } from '../support/timings';
import { growth, grownMost, type Heap, heapAfterGarbageCollection } from '../support/heap';

/**
 * Journey 18: the heap checks of L2-048 criterion 4. A screen with the classroom is entered
 * and left 20 times, and the heap after garbage collection may be no more than 10% above its
 * size after the first time. They run only when a person asks: `npm run e2e:measure`
 * (docs/adr/0038).
 *
 * Duel's frame rate at the 20th duel is measured against the first's (L2-049 criterion 4).
 *
 * Traces to: L2-048, L2-049
 */

const TIMES = 20;
const MOST_GROWTH = 0.1;

// A child who has picked Zuri before and answers with the number pad, so Mic Check is skipped.
const ZURI = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  wayOfAnswering: 'numberPad' as const,
};

test('Home and its classroom, entered and left 20 times, keep a stable heap', async ({
  page,
  device,
  classroom,
}) => {
  // Given a child who opens Home, with its classroom and cast drawn
  await device.keeps(ZURI);
  const home = new HomePage(page);
  const pick = new PickYourKidPage(page);
  await home.open();

  // When Home is entered and left 20 times, its classroom drawn each time
  const heaps: Heap[] = [];
  for (let time = 1; time <= TIMES; time++) {
    await expect(home.classroomDrawn).toBeVisible();
    await home.chooseChangeKid();
    await expect(pick.heading).toHaveText('Pick your kid');
    await expect.poll(() => classroom.openContexts()).toBe(0);
    if (time === 1 || time === TIMES) heaps.push(await heapAfterGarbageCollection(page));
    await pick.goBack();
  }

  // Then the heap is no more than 10% above its size after the first time
  const [first, last] = heaps;
  test.info().annotations.push({
    type: 'heap',
    description: `${first.bytes} bytes after the first time, ${last.bytes} after the 20th (${(growth(first, last) * 100).toFixed(1)}%); grew most: ${grownMost(first, last)}`,
  });
  expect(growth(first, last)).toBeLessThanOrEqual(MOST_GROWTH);
});

test('Duel and World Map with the cast, through 20 duels of a 24-desk tour, keep a stable heap and frame rate', async ({
  page,
  device,
  clock,
  random,
  classroom,
}) => {
  // Given a child on a 24-desk tour whose classmates answer wrong and slowly, the clock held
  await device.keeps(ZURI);
  await random.always(0.999);
  await clock.hold();
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.tourLength(24).click();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  const map = new WorldMapPage(page);

  // When the child wins 20 duels in a row, each leaving Duel for World Map and coming back
  const heaps: Heap[] = [];
  const frameRates: number[] = [];
  for (let time = 1; time <= TIMES; time++) {
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.classroomDrawn).toBeVisible();
    if (time === 1 || time === TIMES) frameRates.push(await framesPerSecond(page));
    const { answer } = await duel.card();
    await duel.answerWithPad(answer);
    await clock.pass(1000);
    await clock.pass(1200);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.classroomDrawn).toBeVisible();
    // Only World Map's classroom is open: Duel's was released when it was left
    expect(await classroom.openContexts()).toBe(1);
    if (time === 1 || time === TIMES) heaps.push(await heapAfterGarbageCollection(page));
    await clock.pass(1600);
    if (time < TIMES) await expect(page).toHaveURL(/\/duel$/);
  }

  // Then the heap is no more than 10% above its size after the first duel
  const [first, last] = heaps;
  test.info().annotations.push({
    type: 'heap',
    description: `${first.bytes} bytes after the first duel, ${last.bytes} after the 20th (${(growth(first, last) * 100).toFixed(1)}%); grew most: ${grownMost(first, last)}`,
  });
  expect(growth(first, last)).toBeLessThanOrEqual(MOST_GROWTH);

  // And Duel draws at the 20th duel at the frame rate of the first, within 10% (L2-049 4)
  const [firstRate, lastRate] = frameRates;
  test.info().annotations.push({
    type: 'frame rate',
    description: `${firstRate.toFixed(1)} frames a second at the first duel, ${lastRate.toFixed(1)} at the 20th`,
  });
  expect(lastRate).toBeGreaterThanOrEqual(firstRate * 0.9);
});
