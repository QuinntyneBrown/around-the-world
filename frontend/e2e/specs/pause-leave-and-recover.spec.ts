import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { PauseDialog } from '../pages/pause.dialog';
import { PodiumPage } from '../pages/podium.page';
import { WorldMapPage } from '../pages/world-map.page';

/**
 * Journey 08: pause, leave and find the way back (L2-030, L2-033 criterion 4, L2-054
 * criterion 4). The game's clock is held, so a paused game is proved by moving it on and seeing
 * nothing happen (docs/adr/0027-pausing-leaving-and-recovering.md).
 */

// A child who answers with the number pad, so Mic Check is skipped (L2-012 criterion 13).
const ZURI = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  wayOfAnswering: 'numberPad' as const,
};

/** Opens Game Setup and chooses "Go!" with the defaults: Duel at Egypt, against Kenji. */
async function onDuel(page: Page): Promise<DuelPage> {
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  await expect(duel.sum).toHaveText(/\d+ × \d+/);
  return duel;
}

test.describe('Pause', () => {
  test('@critical Pause stops the clock, and “Keep playing” resumes the same card', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a classmate who always answers right at its fastest, and a child on Duel
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const duel = await onDuel(page);
    const card = await duel.card();
    await clock.pass(1000);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '5 seconds left');

    // When the child chooses Pause
    await duel.pause.click();

    // Then the dialog says the clock is stopped, with the focus on "Keep playing"
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await expect(paused.text).toHaveText('The clock is stopped. Your desk at Egypt is waiting.');
    await expect(paused.keepPlaying).toBeFocused();
    await expect(paused.goHome).toBeVisible();

    // When a whole minute passes on the clock
    await clock.pass(60_000);

    // Then nothing has moved: the classmate has not answered, and the time left is the same
    await expect(duel.result).toHaveCount(0);
    await expect(duel.timerBarBehindDialog).toHaveAttribute('aria-valuetext', '5 seconds left');

    // When the child chooses "Keep playing"
    await paused.keepPlaying.click();

    // Then the same card is back with the same time, and the focus is back on Pause
    await expect(paused.dialog).toHaveCount(0);
    await expect(duel.pause).toBeFocused();
    expect(await duel.card()).toEqual(card);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '5 seconds left');

    // And the game goes on: the classmate answers within the card's time
    await clock.pass(4000);
    await expect(duel.result).toHaveText(`Kenji said ${card.answer} first. So close!`);
  });

  test('Escape and the close button keep playing, and a freeze waits while paused', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child frozen after a wrong answer
    await device.keeps(ZURI);
    await clock.hold();
    const duel = await onDuel(page);
    const { answer } = await duel.card();
    await duel.answerWithPad(answer + 1);
    await expect(duel.go).toBeDisabled();

    // When the child pauses, two seconds pass, and Escape closes the dialog
    await duel.pause.click();
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await clock.pass(2000);
    await page.keyboard.press('Escape');

    // Then the game resumes, with the focus back on Pause
    await expect(paused.dialog).toHaveCount(0);
    await expect(duel.pause).toBeFocused();

    // When the child pauses again, two more seconds pass, and the close button closes it
    await duel.pause.click();
    await expect(paused.dialog).toBeVisible();
    await clock.pass(2000);
    await paused.close.click();

    // Then the child is still frozen: the four seconds paused did not count
    await expect(paused.dialog).toHaveCount(0);
    await expect(duel.go).toBeDisabled();
    await expect(duel.result).toHaveText(/Frozen for a sec/);

    // And the freeze ends one second of play after it began
    await clock.pass(1000);
    await expect(duel.go).toBeEnabled();
  });

  test('“Go home” leaves the game: Home opens, and the game is gone', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Duel who chooses Pause
    await device.keeps(ZURI);
    await clock.hold();
    const duel = await onDuel(page);
    await duel.pause.click();

    // When the child chooses "Go home"
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await paused.goHome.click();

    // Then Home opens
    const home = new HomePage(page);
    await expect(page).toHaveURL(/\/$/);
    await expect(home.play).toHaveText('Play');

    // And the game is gone: Duel's address opens Home
    await duel.open();
    await expect(page).toHaveURL(/\/$/);
  });

  test('while paused the device stops listening, and listens again on “Keep playing”', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child on Duel answering by voice
    await device.keeps({ version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } });
    await microphone.grant();
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const mic = new MicCheckPage(page);
    await mic.turnOnMic.click();
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say('Ready!');
    await mic.letsGo.click();
    const duel = new DuelPage(page);
    await expect(duel.shout).toBeVisible();

    // When the child chooses Pause
    await duel.pause.click();

    // Then nothing listens while the dialog is open
    await expect(new PauseDialog(page).dialog).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(0);

    // When the child chooses "Keep playing", the card listens again
    await new PauseDialog(page).keepPlaying.click();
    await expect(duel.shout).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);
  });
});

test.describe('Back during a game', () => {
  test('the browser’s Back on Duel pauses the game, and the duel stays', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a classmate who always answers right at its fastest, and a child on Duel
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const duel = await onDuel(page);
    const card = await duel.card();

    // When the child chooses the browser's Back
    await page.goBack();

    // Then the game pauses as Pause does, and Duel stays (L2-030 criterion 10)
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await expect(paused.text).toHaveText('The clock is stopped. Your desk at Egypt is waiting.');
    await expect(page).toHaveURL(/\/duel$/);
    await clock.pass(60_000);
    await expect(duel.result).toHaveCount(0);

    // When the child chooses "Keep playing"
    await paused.keepPlaying.click();

    // Then the same card goes on, and the browser's Back pauses it again
    await expect(paused.dialog).toHaveCount(0);
    expect(await duel.card()).toEqual(card);
    await page.goBack();
    await expect(paused.dialog).toBeVisible();
    await expect(page).toHaveURL(/\/duel$/);
  });

  test('the browser’s Back on World Map pauses the game, and the map waits', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a child who lost to Kenji and sits down at Egypt, on World Map
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const duel = await onDuel(page);
    await clock.pass(5000);
    await duel.sitPill.click();
    const map = new WorldMapPage(page);
    await expect(map.message).toHaveText('So close! You sit down at Egypt');

    // When the child chooses the browser's Back
    await page.goBack();

    // Then the game pauses, and World Map stays however long it is paused
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await expect(paused.text).toHaveText('The clock is stopped. Your desk at Egypt is waiting.');
    await clock.pass(60_000);
    await expect(page).toHaveURL(/\/map$/);

    // When the child chooses "Go home"
    await paused.goHome.click();

    // Then Home opens, and the game is gone
    await expect(page).toHaveURL(/\/$/);
    await map.open();
    await expect(page).toHaveURL(/\/$/);
  });

  test('the browser’s Back on the Podium opens Game Setup, where “Go!” starts a new game', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given the Podium after a tour that ran out of time
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const duel = await onDuel(page);
    await clock.pass(5000);
    await clock.pass(6 * 60_000);
    await duel.sitPill.click();
    await expect(page).toHaveURL(/\/map$/);
    await clock.pass(1600);
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);
    await expect(podium.playAgain).toBeVisible();

    // When the child chooses the browser's Back
    await page.goBack();

    // Then Game Setup opens, with no dialog
    const setup = new GameSetupPage(page);
    await expect(page).toHaveURL(/\/setup$/);
    await expect(setup.go).toBeVisible();
    await expect(new PauseDialog(page).dialog).toHaveCount(0);

    // When the child chooses "Go!"
    await setup.chooseGo();

    // Then a new game starts at Duel, at the first desk's duel with a card open
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.heading).toHaveText('Duel at Egypt');
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.result).toHaveCount(0);
  });

  for (const [screen, open] of [
    ['World Map', (page: Page) => new WorldMapPage(page).open()],
    ['the Podium', (page: Page) => new PodiumPage(page).open()],
    ['Mic Check', (page: Page) => new MicCheckPage(page).open()],
  ] as const) {
    test(`a web address of ${screen} opens Home when no game has started`, async ({ page }) => {
      // Given no game has started
      // When the child opens the screen's web address
      await open(page);

      // Then Home opens (L2-030 criterion 7)
      await expect(page).toHaveURL(/\/$/);
      await expect(new HomePage(page).play).toBeVisible();
    });
  }
});
