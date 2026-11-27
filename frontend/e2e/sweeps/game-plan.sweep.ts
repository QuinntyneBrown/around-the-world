import { test, expect } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { WorldMapPage } from '../pages/world-map.page';

/** Films the real renderer while the fixture holds the tour clock at each teaching moment. */
test('film a wrong answer, a stamp and a walk to Japan', async ({ page, device, clock }, info) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await device.keeps({
    version: 1,
    kid: 'zuri',
    nickname: { adjective: 0, animal: 0 },
    wayOfAnswering: 'numberPad',
  });
  await clock.hold();
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  const map = new WorldMapPage(page);
  await expect(duel.classroomDrawn).toBeVisible();
  const { answer } = await duel.card();
  // Record in real time, including two seconds at either end for editing.
  const holdShot = (ms: number) =>
    page.evaluate(
      (ms) =>
        new Promise<void>((resolve) => {
          const start = performance.now();
          const frame = () =>
            performance.now() - start >= ms ? resolve() : requestAnimationFrame(frame);
          requestAnimationFrame(frame);
        }),
      ms,
    );
  const capture = async (name: string, action: () => Promise<void>) => {
    await page.screencast.start({
      path: info.outputPath(name + '.webm'),
      size: { width: 1280, height: 900 },
    });
    try {
      await action();
    } finally {
      await page.screencast.stop();
    }
  };
  await capture('duel', async () => {
    await holdShot(900);
    await duel.answerWithPad(answer + 1);
    await expect(duel.result).toContainText('Frozen');
    await holdShot(1000);
    await clock.pass(1000);
    await duel.answerWithPad(answer);
    await expect(duel.result).toContainText('You got it!');
    await holdShot(1000);
    await clock.pass(1000);
    await expect(duel.stampCountry).toHaveText('Japan');
    await holdShot(1200);
  });
  await capture('walk', async () => {
    await clock.pass(1200);
    await expect(map.classroomDrawn).toBeVisible();
    await expect(map.message).toHaveText('You walk on to Japan!');
    await holdShot(1650);
    await clock.pass(1600);
    await expect(duel.heading).toHaveText('Duel at Japan');
    await holdShot(900);
  });
});
