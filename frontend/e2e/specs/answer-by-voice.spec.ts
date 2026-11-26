import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { MicCheckPage } from '../pages/mic-check.page';

/**
 * Journey 07: shout answers after the Mic Check (L2-009, L2-011, L2-012, L2-040). The fixture's
 * fake recognizer and microphone stand in for the browser's (docs/adr/0006), and the game's
 * clock is held so a flash card waits for the spec (docs/adr/0020). How voice is decided is in
 * docs/adr/0025-answering-by-voice.md.
 */

/** A child who picked Zuri and never changed the way of answering: voice, the default. */
const ZURI = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };

test.describe('Mic Check', () => {
  test('@critical asks for the mic, hears "Ready!", and "Let’s go!" opens the first card', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child who has not passed Mic Check, a microphone that will be allowed, the clock held
    await device.keeps(ZURI);
    await microphone.grant();
    await clock.hold();

    // When the child chooses "Go!" on Game Setup
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then Mic Check asks to turn on the mic and says the voice is never saved or sent
    const mic = new MicCheckPage(page);
    await expect(page).toHaveURL(/\/mic$/);
    await expect(mic.heading).toHaveText('Mic check');
    await expect(mic.status).toContainText('You answer by shouting!');
    await expect(mic.body).toHaveText(
      'Bolt listens for your answer. Your voice is never saved or sent to anyone.',
    );
    await expect(mic.picture).toBeVisible();
    expect(await mic.choices()).toEqual(['Turn on mic', 'Too noisy? Tap answers instead']);

    // When the child chooses "Turn on mic" and allows it
    await mic.turnOnMic.click();

    // Then Mic Check listens: "Shout “Ready!”", with rings and a level meter
    await expect(mic.title).toHaveText('Shout “Ready!”');
    await expect(mic.body).toHaveText('As loud as you like. Bolt is listening.');
    await expect(mic.rings).toHaveCount(2);
    await expect(mic.levelMeter).toBeVisible();
    expect(await mic.choices()).toEqual(['Too noisy? Tap answers instead']);
    await expect.poll(() => voice.listening()).toBe(1);

    // When the child shouts "Ready!"
    await voice.say('Ready!');

    // Then Mic Check shows it heard them, and offers "Let’s go!"
    await expect(mic.title).toHaveText('Bolt heard you!');
    await expect(mic.body).toHaveText('Your mic works. When a card flips, shout the answer.');
    await expect(mic.heard).toHaveText('“Ready!”');
    expect(await mic.choices()).toEqual(['Let’s go!']);

    // And the microphone is released (L2-040 criterion 2)
    expect(await voice.listening()).toBe(0);
    expect(await microphone.openStreams()).toBe(0);

    // When time passes on Mic Check and the child chooses "Let’s go!"
    await clock.pass(10_000);
    await mic.letsGo.click();

    // Then Duel shows the first flash card, whose time starts now (L2-012 criterion 8)
    const duel = new DuelPage(page);
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.sum).toHaveText(/\d+ × \d+/);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '6 seconds left');

    // And voice is kept on the device as the way of answering
    expect((await device.kept())?.wayOfAnswering).toBe('voice');
  });

  test('while the browser asks, says to choose “Allow”, with the button busy and the pad offered', async ({
    page,
    device,
    microphone,
    voice,
  }) => {
    // Given a child on Mic Check, whose browser keeps its question about the mic open
    await device.keeps(ZURI);
    await microphone.ask();
    const mic = await openMicCheck(page);

    // When the child chooses "Turn on mic"
    await mic.turnOnMic.click();

    // Then Mic Check tells the child to choose "Allow", the button busy (L2-012 criterion 10)
    await expect(mic.title).toHaveText('Say yes to the mic');
    await expect(mic.body).toHaveText('Your browser is asking if Bolt can listen. Choose “Allow”.');
    await expect(mic.waiting).toHaveAttribute('aria-busy', 'true');
    expect(await mic.choices()).toEqual(['Waiting for the mic…', 'Too noisy? Tap answers instead']);

    // When the child allows the mic
    await microphone.grant();

    // Then Mic Check listens
    await expect(mic.title).toHaveText('Shout “Ready!”');
    await expect.poll(() => voice.listening()).toBe(1);
  });

  test('when nothing is heard, says so and "Try again" listens again', async ({
    page,
    device,
    microphone,
    voice,
  }) => {
    // Given a child on Mic Check who allowed the mic, and is listened to
    await device.keeps(ZURI);
    await microphone.grant();
    const mic = await openMicCheck(page);
    await mic.turnOnMic.click();
    await expect.poll(() => voice.listening()).toBe(1);

    // When the browser hears no speech for a while
    await voice.silence();

    // Then Mic Check says Bolt didn't catch that, and stops listening (L2-012 criterion 11)
    await expect(mic.title).toHaveText('Bolt didn’t catch that');
    await expect(mic.body).toHaveText('Try once more, a bit louder and closer to the screen.');
    expect(await mic.choices()).toEqual(['Try again', 'Too noisy? Tap answers instead']);
    await expect.poll(() => voice.listening()).toBe(0);

    // When the child chooses "Try again" and shouts
    await mic.tryAgain.click();
    await expect(mic.title).toHaveText('Shout “Ready!”');
    await expect.poll(() => voice.listening()).toBe(1);
    await voice.say('Ready');

    // Then Mic Check heard them
    await expect(mic.title).toHaveText('Bolt heard you!');
  });

  test('a refused mic offers only "Use number pad", which starts the game with the pad', async ({
    page,
    device,
    microphone,
  }) => {
    // Given a child on Mic Check whose mic will be refused
    await device.keeps(ZURI);
    await microphone.deny();
    const mic = await openMicCheck(page);

    // When the child chooses "Turn on mic"
    await mic.turnOnMic.click();

    // Then Mic Check says the mic is off, as an alert, and to ask a grown-up (L2-012 3 and 7)
    await expect(mic.alert).toContainText('Bolt can’t hear you');
    await expect(mic.body).toHaveText(
      'The mic is turned off. Ask a grown-up to allow it in the browser, or play with the number pad.',
    );
    await expect(mic.badge).toHaveClass(/listener__badge--off/);
    expect(await mic.choices()).toEqual(['Use number pad']);
    await expect(mic.back).toBeVisible();

    // When the child chooses "Use number pad"
    await mic.useNumberPad.click();

    // Then Duel shows the first card with the number pad, and nothing kept changes
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText(/\d+ × \d+/);
    await expect(duel.numberPad).toBeVisible();
    expect((await device.kept())?.wayOfAnswering).toBeUndefined();
  });

  test('when speech recognition fails on the device, says so and offers only the pad', async ({
    page,
    device,
    microphone,
    voice,
  }) => {
    // Given a child listened to on Mic Check
    await device.keeps(ZURI);
    await microphone.grant();
    const mic = await openMicCheck(page);
    await mic.turnOnMic.click();
    await expect.poll(() => voice.listening()).toBe(1);

    // When speech recognition fails on the device
    await voice.fail('network');

    // Then Mic Check says so as an alert, with only "Use number pad" (L2-012 criterion 12)
    await expect(mic.alert).toContainText('Bolt’s ears aren’t working');
    await expect(mic.body).toHaveText(
      'Listening stopped working on this device. You can still play by tapping your answers.',
    );
    expect(await mic.choices()).toEqual(['Use number pad']);

    // When the child chooses it, Duel shows the number pad
    await mic.useNumberPad.click();
    await expect(new DuelPage(page).numberPad).toBeVisible();
  });

  test('"Too noisy? Tap answers instead" keeps the pad, and a later visit skips Mic Check', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Mic Check, who has not turned on the mic, and the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const mic = await openMicCheck(page);

    // When the child chooses "Too noisy? Tap answers instead"
    await mic.tapInstead.click();

    // Then Duel shows the first card with the number pad, and the pad is kept (L2-012 4)
    const duel = new DuelPage(page);
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.numberPad).toBeVisible();
    expect((await device.kept())?.wayOfAnswering).toBe('numberPad');

    // When the child comes back in a later visit and chooses "Go!"
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then Mic Check is skipped (L2-012 criterion 13)
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.numberPad).toBeVisible();
  });

  test('is skipped where the browser has no speech recognition', async ({
    page,
    device,
    voice,
  }) => {
    // Given a browser with no speech recognition
    await device.keeps(ZURI);
    await voice.unsupported();

    // When the child chooses "Go!"
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then Duel opens with the number pad (L2-012 criterion 5)
    await expect(page).toHaveURL(/\/duel$/);
    await expect(new DuelPage(page).numberPad).toBeVisible();
  });

  test('Back returns to Game Setup, and Mic Check cannot be opened on its own', async ({
    page,
    device,
  }) => {
    // Given a child on Mic Check
    await device.keeps(ZURI);
    const mic = await openMicCheck(page);

    // When the child chooses Back
    await mic.back.click();

    // Then Game Setup shows (L2-030 criterion 8)
    await expect(page).toHaveURL(/\/setup$/);

    // When the child opens Mic Check's address with no game
    await page.goto('/mic');

    // Then Home opens
    await expect(page).toHaveURL(/\/$/);
  });
});

/** Opens Game Setup and chooses "Go!", which opens Mic Check. */
async function openMicCheck(page: Page): Promise<MicCheckPage> {
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const mic = new MicCheckPage(page);
  await expect(mic.heading).toHaveText('Mic check');
  return mic;
}
