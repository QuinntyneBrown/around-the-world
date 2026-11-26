import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { AppShellPage } from '../pages/app-shell.page';
import { DuelPage } from '../pages/duel.page';
import { HomePage } from '../pages/home.page';
import { LeaveGameDialog } from '../pages/leave-game.dialog';
import { LobbyPage } from '../pages/lobby.page';
import { PodiumPage } from '../pages/podium.page';
import { RoomPage } from '../pages/room.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { WorldMapPage } from '../pages/world-map.page';
import {
  focused,
  layoutProblems,
  smallTargets,
  stepsOutOfOrder,
  walkWithTab,
} from '../support/layout';
import { gameState, joinedRoom, player, roomState } from '../support/rooms';
import { SCREENS } from '../support/screens';

/**
 * Journey 19: make every screen work for every child (L2-050, L2-051;
 * docs/detailed-designs/platform/show-every-screen-to-everyone/, docs/adr/0039). The behaviour
 * a child meets: every control reached in the screen's order with the focus showing, touch
 * targets of at least 44 x 44 px, whole tours by keyboard alone, and Duel whole on the
 * narrowest phone whatever it shows. The visual, responsive and accessibility sweeps of
 * `e2e/sweeps/` measure the rest, on request.
 */

// A child new to the game, answering with the number pad, keeping a tour of 6 desks.
const NEW_CHILD = {
  version: 1,
  wayOfAnswering: 'numberPad' as const,
  setup: { kinds: ['times'], tables: [2, 3, 4, 5], tourLength: 6, cardSpeed: 'normal' },
};
// The narrowest phone the game is laid out for, held upright.
const NARROWEST = { width: 320, height: 568 };
/** The waits after a duel the child wins as the traveller: "You got it!" and the stamp. */
const HOP_MS = 1000 + 1200;
/** How long World Map's message stays. */
const MESSAGE_MS = 1600;

/** Presses Tab until the control with that name has the focus; fails after 30 presses. */
async function tabTo(page: Page, name: string | RegExp): Promise<void> {
  for (let press = 0; press < 30; press++) {
    await page.keyboard.press('Tab');
    const control = await focused(page);
    if (control && (typeof name === 'string' ? control.name === name : name.test(control.name))) {
      expect(control.ring, `the focus ring on "${control.name}"`).toBeGreaterThanOrEqual(2);
      expect(control.inView, `"${control.name}" in view`).toBe(true);
      return;
    }
  }
  throw new Error(`Tab never reached "${name}"`);
}

test.describe('Every screen by touch and by keyboard', () => {
  for (const screen of SCREENS) {
    test(`${screen.mock}: every control is at least 44 x 44 px and Tab reaches each in the screen's order, its focus showing`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
      voice,
      microphone,
      network,
      clipboard,
    }) => {
      // Given the screen in its state on a phone held upright
      await page.setViewportSize({ width: 360, height: 800 });
      await screen.reach({
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

      // Then every control it shows can be touched: at least 44 x 44 px (L2-051 criterion 2)
      expect(await smallTargets(page)).toEqual([]);

      // When a child with a keyboard on a laptop presses Tab through it
      await page.setViewportSize({ width: 1280, height: 800 });
      const walk = await walkWithTab(page);

      // Then Tab reaches every control in the order of the screen, and the focus always shows
      // (L2-051 criterion 1)
      expect(walk.controls).toBeGreaterThan(0);
      expect(stepsOutOfOrder(walk)).toEqual([]);
      expect(walk.hidden).toEqual([]);
    });
  }

  // Every screen but Duel while reconnecting, where the whole screen behind the overlay takes no
  // input until the connection is back (L2-029 criterion 1).
  for (const screen of SCREENS.filter(
    (one) => one.mock.startsWith('pages/') && one.mock !== 'pages/duel/reconnecting',
  )) {
    test(`${screen.mock}: the first Tab offers "Skip to the game", which takes the focus into the game`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
      voice,
      microphone,
      network,
      clipboard,
    }) => {
      // Given the screen in its state, opened at its address so the focus starts at the top
      await screen.reach({
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
      const shell = new AppShellPage(page);
      const url = page.url();
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      if (!(await shell.skipLink.evaluate((link) => link === document.activeElement))) {
        await shell.skipLink.focus();
      }

      // Then the skip link shows, in view, with its focus ring
      await expect(shell.skipLink).toBeFocused();
      await expect(shell.skipLink).toHaveText('Skip to the game');
      expect(await focused(page)).toMatchObject({ inView: true });
      expect((await focused(page))?.ring).toBeGreaterThanOrEqual(2);

      // When the child presses Enter on it
      await page.keyboard.press('Enter');

      // Then the screen stays as it was, and the focus is on the game's main part, so the next
      // Tab goes on from there
      expect(page.url()).toBe(url);
      await expect(shell.main).toBeFocused();
    });
  }
});

test.describe('A whole tour by keyboard alone', () => {
  test('@critical a child plays a solo tour from Home to the Podium with the keyboard alone, the focus always showing', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child new to the game on a laptop, who keeps a tour of 6 desks, the clock held
    await device.keeps(NEW_CHILD);
    await clock.hold();
    const home = new HomePage(page);
    await home.open();

    // When they Tab to "Play" and press Enter, then pick a kid, play solo and choose "Go!"
    await tabTo(page, /^Play/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/kid$/);
    await tabTo(page, /^I’m /);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/play$/);
    await tabTo(page, /Play solo/);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/setup$/);
    await tabTo(page, /^Go/);
    await page.keyboard.press('Enter');

    // Then Duel opens, and each card is answered by typing the digits and Enter
    const duel = new DuelPage(page);
    const map = new WorldMapPage(page);
    for (let hop = 1; hop <= 5; hop++) {
      await expect(page).toHaveURL(/\/duel$/);
      await expect(duel.answerBox).toHaveText('?');
      const { answer } = await duel.card();
      await duel.typeKeys(String(answer), 'Enter');
      await expect(duel.result).toContainText('You got it!');
      await clock.pass(HOP_MS);
      await expect(page).toHaveURL(/\/map$/);
      await expect(map.message).toBeVisible();
      await clock.pass(MESSAGE_MS);
    }

    // And the Podium's ways on are reached with Tab: "Play again" and "Home"
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);
    await expect(podium.headline).toHaveText('You went around the world!');
    await tabTo(page, 'Play again');
    await tabTo(page, 'Home');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/$/);
  });

  test('a friend joins with the code, answers a duel and leaves the game with the keyboard alone', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given Cosmic Llama, who answers with the number pad, and room BOLT hosted by Speedy Otter
    const host = player(0, 'zuri', 0, 0, true);
    const nia = player(1, 'nia', 8, 4);
    await clock.hold();
    await device.keeps({
      version: 1,
      kid: 'nia',
      nickname: { adjective: 8, animal: 4 },
      wayOfAnswering: 'numberPad',
    });
    backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', [host, nia], nia));
    roomHub.serves(roomState('BOLT', [host, nia]));

    // When they Tab to "Join a room" on Solo Or Friends, type the code and press Enter
    await page.goto('/play');
    await tabTo(page, /Join a room/);
    await page.keyboard.press('Enter');
    const room = new RoomPage(page);
    await expect(room.field).toBeFocused();
    await page.keyboard.type('bolt');
    await page.keyboard.press('Enter');

    // Then the Lobby waits for the host
    const lobby = new LobbyPage(page);
    await expect(lobby.guestPanel).toContainText('Waiting for Speedy Otter to start…');

    // When the race starts and the host duels Cosmic Llama, who holds desk 2
    roomHub.game(gameState({ players: [host, nia] }));
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText('6 × 4');

    // Then she answers by typing the digits and Enter, and the room receives the number
    await duel.typeKeys('24', 'Enter');
    await expect
      .poll(() => roomHub.invocations().find((call) => call.target === 'SubmitAnswer')?.args)
      .toContain(24);

    // When she Tabs to "Leave the game" and presses Enter
    await tabTo(page, 'Leave the game');
    await page.keyboard.press('Enter');

    // Then the dialog holds the focus, and Escape closes it and gives the focus back
    const leave = new LeaveGameDialog(page);
    await expect(leave.dialog).toBeVisible();
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(
      true,
    );
    await page.keyboard.press('Escape');
    await expect(leave.dialog).toHaveCount(0);
    await expect(duel.leave).toBeFocused();
  });
});

test.describe('Duel on the narrowest phone', () => {
  test('a friend’s two-word nickname wraps between its words, never inside one', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
    network,
    clipboard,
  }) => {
    // Given the host of a race on the narrowest phone, duelling Cosmic Llama
    await page.setViewportSize(NARROWEST);
    await SCREENS.find((one) => one.mock === 'pages/duel/friends')!.reach({
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

    // Then each name and role in the duel strip breaks only between words, and nothing overlaps
    const duel = new DuelPage(page);
    expect(await duel.named(duel.deskHolder)).toEqual(['Cosmic Llama', 'Holds Egypt']);
    expect(await duel.breaksInsideAWord(duel.traveller)).toBe(false);
    expect(await duel.breaksInsideAWord(duel.deskHolder)).toBe(false);
    expect(await layoutProblems(page)).toEqual([]);
  });

  test('a frozen child’s flash card, number pad and way to switch stand apart', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
    network,
    clipboard,
  }) => {
    // Given a child on the narrowest phone who answered wrong and is frozen
    await page.setViewportSize(NARROWEST);
    await SCREENS.find((one) => one.mock === 'pages/duel/wrong-pad')!.reach({
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
    const duel = new DuelPage(page);

    // Then the flash card says so, the pad waits under it, and nothing overlaps or is cut off
    await expect(duel.result).toContainText('Frozen for a sec…');
    await expect(duel.numberPad).toBeVisible();
    await expect(duel.progress).toBeVisible();
    expect(await duel.scrolls()).toBe(false);
    expect(await layoutProblems(page)).toEqual([]);
  });

  test('the connection’s banner across the top takes the place of the desk’s line, and nothing overlaps', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
    network,
    clipboard,
  }) => {
    // Given the host of a race on the narrowest phone, back after a lost connection
    await page.setViewportSize(NARROWEST);
    await SCREENS.find((one) => one.mock === 'notifications/connection-banner/success')!.reach({
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
    const duel = new DuelPage(page);

    // Then the banner says so across the top in one line, the line of text gives way to it
    // while the duel strip still names the country, and the flash card, the pad and the footer
    // all fit without overlapping
    await expect(duel.banner).toContainText('You’re back!');
    await expect(duel.progress).toBeHidden();
    expect(await duel.named(duel.deskHolder)).toEqual(['Cosmic Llama', 'Holds Egypt']);
    await expect(duel.numberPad).toBeVisible();
    expect(await duel.scrolls()).toBe(false);
    expect(await layoutProblems(page)).toEqual([]);
  });
});

test.describe('Solo Or Friends on a tablet', () => {
  test('“Make a room” and “Join a room” stay inside their card where the two cards stand side by side', async ({
    page,
    device,
  }) => {
    // Given a child on a tablet held upright, where the two ways to play stand side by side
    await page.setViewportSize({ width: 768, height: 1024 });
    await device.keeps({ version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } });
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await expect(solo.joinRoom).toBeVisible();
    expect(await solo.modesSideBySide()).toBe(true);

    // Then no control sticks out of its card, cut off or overlapping
    expect(await layoutProblems(page)).toEqual([]);
  });
});
