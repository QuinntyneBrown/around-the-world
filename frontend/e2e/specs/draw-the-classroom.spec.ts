import { expect, test } from '../fixtures/test';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';

/**
 * Journey 09: draw the 3D classroom and its cast (L2-036, L2-037, L2-047, L2-048). WebGL is
 * Chromium's own; the fixture's `classroom` holds back or refuses the scenes, takes WebGL away
 * and counts the WebGL contexts still open (docs/adr/0028-drawing-the-classroom.md).
 *
 * Traces to: L2-036, L2-047, L2-048
 */

/** A child who has picked Zuri before. */
const zuri = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };

test.describe('The 3D classroom on Home', () => {
  test('@critical Home draws the 3D classroom once it arrives, and lets it go on leaving', async ({
    page,
    device,
    classroom,
  }) => {
    // Given a child opening Home
    await device.keeps(zuri);
    const home = new HomePage(page);
    await home.open();

    // When the classroom arrives, then it is drawn behind Home, with no words about a rest
    await expect(home.classroomDrawn).toBeVisible();
    await expect(home.classroom).toHaveAttribute('aria-hidden', 'true');
    await expect(home.classroomResting).toHaveCount(0);
    expect(await classroom.openContexts()).toBe(1);

    // And when the child leaves Home, then its classroom is released
    await home.chooseChangeKid();
    await expect(new PickYourKidPage(page).heading).toBeVisible();
    await expect(home.classroom).toHaveCount(0);
    expect(await classroom.openContexts()).toBe(0);
  });

  test('Play works while the classroom is still arriving (L2-036 2)', async ({
    page,
    device,
    classroom,
  }) => {
    // Given the classroom's scenes are held back
    await device.keeps(zuri);
    const release = classroom.holdBack();
    const home = new HomePage(page);
    await home.open();

    // Then Home shows its still picture and Play can be chosen before the classroom arrives
    await expect(home.picture).toBeVisible();
    await expect(home.classroomDrawn).toHaveCount(0);
    await home.chooseChangeKid();
    await expect(new PickYourKidPage(page).heading).toBeVisible();

    // And the classroom that arrives after Home was left is never drawn, and is released
    release();
    await expect.poll(() => classroom.openContexts()).toBe(0);
  });

  test('a device with no WebGL keeps the still picture and says so (L2-036 3)', async ({
    page,
    device,
    classroom,
  }) => {
    // Given a browser that gives no WebGL
    await device.keeps(zuri);
    await classroom.cannotDraw();
    const home = new HomePage(page);

    // When Home is shown
    await home.open();

    // Then the still picture stands in, Home says so in words, and Play still works
    await expect(home.classroomResting).toBeVisible();
    await expect(home.classroomResting).toContainText(
      'You’re seeing a picture of it instead. The game plays just the same.',
    );
    await expect(home.picture).toBeVisible();
    await expect(home.classroomDrawn).toHaveCount(0);
    await home.choosePlay();
    await expect(page).toHaveURL(/\/play$/);
  });

  test('a classroom whose scenes fail to load keeps the still picture and says so (L2-036 3)', async ({
    page,
    device,
    classroom,
  }) => {
    // Given the classroom's scenes cannot be loaded
    await device.keeps(zuri);
    classroom.refuse();
    const home = new HomePage(page);

    // When Home is shown
    await home.open();

    // Then the still picture stands in and Home says so, and nothing is left drawing
    await expect(home.classroomResting).toBeVisible();
    await expect(home.picture).toBeVisible();
    expect(await classroom.openContexts()).toBe(0);
  });
});
