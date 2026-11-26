import { expect, test } from '../fixtures/test';
import { AppShellPage } from '../pages/app-shell.page';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
import { WorldMapPage } from '../pages/world-map.page';

/**
 * Journey 09: draw the 3D classroom and its cast (L2-036, L2-037, L2-047, L2-048). WebGL is
 * Chromium's own; the fixture's `classroom` holds back or refuses the scenes, takes WebGL away
 * and counts the WebGL contexts still open (docs/adr/0028-drawing-the-classroom.md).
 *
 * Traces to: L2-034, L2-036, L2-037, L2-047, L2-048
 */

/** A child who has picked Zuri before. */
const zuri = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };

/** A child playing as Zuri with the number pad, so Mic Check is skipped (L2-012 13). */
const zuriWithPad = { ...zuri, wayOfAnswering: 'numberPad' as const };

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

test.describe('The 3D classroom in a game', () => {
  test('Duel draws the classroom behind its scrim, and the card still leads (L2-036 6)', async ({
    page,
    device,
    clock,
    classroom,
  }) => {
    // Given a child starting a solo game
    await device.keeps(zuriWithPad);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // When Duel is shown, then the classroom is drawn behind the scrim, hidden from assistive
    // technology, and the flash card can be answered
    const duel = new DuelPage(page);
    await expect(duel.classroomDrawn).toBeVisible();
    await expect(duel.classroom).toHaveAttribute('aria-hidden', 'true');
    await expect(duel.scrim).toBeVisible();
    expect(await classroom.openContexts()).toBe(1);
    const { answer } = await duel.card();
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
  });

  test('@critical World Map draws the room from above under its labels, and each screen lets its classroom go', async ({
    page,
    device,
    clock,
    random,
    classroom,
  }) => {
    // Given a child who loses the first duel to Kenji
    await device.keeps(zuriWithPad);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await expect(duel.classroomDrawn).toBeVisible();
    await clock.pass(5000);

    // When the child chooses the pill and World Map opens
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);

    // Then the room is drawn in 3D from above, with the drawn room's labels over it
    await expect(map.classroomDrawn).toBeVisible();
    expect(await map.roomDrawing()).toBe('labels');
    expect(await map.tags()).toContain('You');
    expect(await map.plaques()).toContain('Egypt');
    await expect(map.room).toHaveAccessibleName(
      'The classroom from above: a ring of 12 desks. You’re sitting at Egypt, Kenji is travelling.',
    );

    // And Duel's classroom was released: only World Map's is open
    expect(await classroom.openContexts()).toBe(1);

    // And when Duel returns, World Map's classroom is released and Duel draws its own
    await map.back.click();
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.classroomDrawn).toBeVisible();
    expect(await classroom.openContexts()).toBe(1);
  });

  test('World Map with no WebGL shows the still picture, says so, and the standings carry on (L2-036 3)', async ({
    page,
    device,
    clock,
    random,
    classroom,
  }) => {
    // Given a browser that gives no WebGL, and a child who loses the first duel to Kenji
    await device.keeps(zuriWithPad);
    await classroom.cannotDraw();
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await expect(duel.scene).toBeVisible();
    await clock.pass(5000);

    // When World Map opens
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);

    // Then the still picture stands in for the room, the map says so, and the standings still
    // give every position
    await expect(map.mapResting).toBeVisible();
    await expect(map.mapResting).toContainText(
      'The standings below still show where everyone is, and the game carries on.',
    );
    await expect(map.stillPicture).toBeVisible();
    await expect(map.where).toHaveText('You’re sitting at Egypt · Kenji is travelling');
    expect(await map.entries()).toHaveLength(5);

    // And the game carries on: "Back to the card" returns to Duel
    await map.back.click();
    await expect(page).toHaveURL(/\/duel$/);
    expect(await classroom.openContexts()).toBe(0);
  });

  test('on a phone, World Map’s 3D room is zoomed to the child’s kid with the labels (L2-034 5)', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a phone, and a child who loses the first duel to Kenji
    await page.setViewportSize({ width: 390, height: 844 });
    await device.keeps(zuriWithPad);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    await clock.pass(5000);
    const duel = new DuelPage(page);
    await duel.sitPill.click();

    // When World Map is drawn, then the zoomed view shows only the labels, over the 3D room
    const map = new WorldMapPage(page);
    await expect(map.classroomDrawn).toBeVisible();
    expect(await map.view()).toBe('zoom');
    expect(await map.roomDrawing()).toBe('labels');
  });

  test('the other screens show no classroom (L2-036 6)', async ({ page, device, classroom }) => {
    // Given a child on Pick Your Kid and then Game Setup
    await device.keeps(zuriWithPad);
    const shell = new AppShellPage(page);
    const pickYourKid = new PickYourKidPage(page);
    await pickYourKid.open();
    await expect(pickYourKid.heading).toBeVisible();

    // Then neither shows a classroom, nor opens a WebGL context
    await expect(shell.classroomCanvases).toHaveCount(0);
    expect(await classroom.openContexts()).toBe(0);
    const setup = new GameSetupPage(page);
    await setup.open();
    await expect(setup.go).toBeVisible();
    await expect(shell.classroomCanvases).toHaveCount(0);
    expect(await classroom.openContexts()).toBe(0);
  });
});
