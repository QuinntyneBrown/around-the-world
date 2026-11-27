import { test, expect } from '../fixtures/test';
import { PodiumPage } from '../pages/podium.page';
import { HomePage } from '../pages/home.page';
import { DuelPage } from '../pages/duel.page';
import { WorldMapPage } from '../pages/world-map.page';
import { SCREENS } from '../support/screens';

const frames = {
  home: 'home/default',
  pick: 'pick-your-kid/default',
  solo: 'solo-or-friends/default',
  room: 'room/empty',
  lobby: 'lobby/default',
  setup: 'game-setup/default',
  mic: 'mic-check/default',
  duel: 'duel/default',
  map: 'world-map/default',
  podium: 'podium/default',
};

for (const [name, state] of Object.entries(frames)) {
  for (const [form, size] of Object.entries({
    mobile: { width: 390, height: 844 },
    desktop: { width: 1280, height: 900 },
  })) {
    test(`${name} · ${form}`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
      voice,
      microphone,
      network,
      clipboard,
    }, info) => {
      await page.setViewportSize(size);
      await SCREENS.find((screen) => screen.mock === 'pages/' + state)!.reach({
        page,
        device,
        backend,
        roomHub,
        clock,
        voice,
        microphone,
        network,
        clipboard,
      });
      const drawn =
        name === 'home'
          ? new HomePage(page).classroomDrawn
          : name === 'duel'
            ? new DuelPage(page).classroomDrawn
            : name === 'map'
              ? new WorldMapPage(page).classroomDrawn
              : null;
      if (drawn) await expect(drawn).toBeVisible();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images, (img) => img.decode().catch(() => undefined)),
        );
        await Promise.allSettled(
          document
            .getAnimations()
            .filter((animation) => Number(animation.effect?.getComputedTiming().endTime) < 1500)
            .map((animation) => animation.finished),
        );
      });
      if (name === 'podium' && form === 'desktop') {
        const podium = new PodiumPage(page);
        const steps = await podium.steps.boundingBox();
        const home = await podium.home.boundingBox();
        expect(steps && home).toBeTruthy();
        expect(Math.abs(steps!.y + steps!.height - home!.y - home!.height)).toBeLessThan(12);
      }
      await page.screenshot({ path: info.outputPath(`${name}-${form}.png`) });
    });
  }
}
