import { type Page } from '@playwright/test';
import { expect, test, type FakeClock, type FakeVoice } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { SettingsDialog } from '../pages/settings.dialog';

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

test.describe('Answering by voice', () => {
  test('a shouted number answers the flash card, and words that are no number cost nothing', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child who passed Mic Check, on Duel with voice, and the clock held
    await device.keeps(ZURI);
    await microphone.grant();
    await clock.hold();
    const duel = await duelByVoice(page, voice);
    const card = await duel.card();

    // Then the flash card shows that the mic listens, and no number pad (L2-009 criterion 4)
    await expect(duel.shout).toHaveText(/Shout it!/);
    await expect(duel.announcement).toHaveText(`New card: ${card.left} × ${card.right}. Shout it!`);
    await expect(duel.numberPad).toHaveCount(0);
    await expect(duel.useNumberPad).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);

    // When the child says something that is not a number
    await voice.say('um, hang on');

    // Then no answer is given and the child is not frozen (L2-009 criterion 2)
    await expect(duel.shout).toBeVisible();
    await expect(duel.result).toHaveCount(0);

    // When the child shouts the answer in words
    await voice.say(inWords(card.answer));

    // Then the child wins the duel, and recognition stops (L2-009 criteria 1 and 5)
    await expect(duel.result).toHaveText(`= ${card.answer} You got it!`);
    await expect(duel.shout).toHaveCount(0);
    await expect.poll(() => voice.listening()).toBe(0);
  });

  test('a wrong number freezes the child, and listening stops until the freeze ends', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child on Duel with voice, and the clock held
    await device.keeps(ZURI);
    await microphone.grant();
    await clock.hold();
    const duel = await duelByVoice(page, voice);
    const card = await duel.card();
    const wrong = card.answer + 1;

    // When the child shouts a wrong number
    await voice.say(String(wrong));

    // Then the child is frozen and recognition is not running (L2-009 criteria 3 and 5)
    await expect(duel.result).toHaveText(`Not ${wrong}! Frozen for a sec…`);
    await expect(duel.shout).toHaveCount(0);
    await expect.poll(() => voice.listening()).toBe(0);
    await expect(duel.useNumberPad).toBeVisible();

    // When the freeze ends, the card listens again
    await clock.pass(1000);
    await expect(duel.shout).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);
  });
});

test.describe('Switching between voice and the number pad', () => {
  test('"Use number pad" shows the pad and stops listening; "Shout instead" listens again', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child on Duel with voice, and the clock held
    await device.keeps(ZURI);
    await microphone.grant();
    await clock.hold();
    const duel = await duelByVoice(page, voice);
    const card = await duel.card();

    // When the child chooses "Use number pad"
    await duel.useNumberPad.click();

    // Then the pad shows for the same card, recognition stops, and the pad is kept (L2-011 1)
    await expect(duel.numberPad).toBeVisible();
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.shout).toHaveCount(0);
    expect(await duel.card()).toEqual(card);
    await expect.poll(() => voice.listening()).toBe(0);
    expect((await device.kept())?.wayOfAnswering).toBe('numberPad');

    // When the child chooses "Shout instead"
    await duel.shoutInstead.click();

    // Then the pad hides and recognition starts, for the same card (L2-011 criterion 2)
    await expect(duel.numberPad).toHaveCount(0);
    await expect(duel.shout).toBeVisible();
    expect(await duel.card()).toEqual(card);
    await expect.poll(() => voice.listening()).toBe(1);
    expect((await device.kept())?.wayOfAnswering).toBe('voice');

    // And a shouted answer wins
    await voice.say(String(card.answer));
    await expect(duel.result).toHaveText(`= ${card.answer} You got it!`);

    // And once the duel is decided, the switch is not offered (L2-011 criterion 5)
    await expect(duel.switchWay).toHaveCount(0);
  });

  test('where the browser has no speech recognition, the pad shows and "Shout instead" is not offered', async ({
    page,
    device,
    voice,
  }) => {
    // Given a browser with no speech recognition
    await device.keeps(ZURI);
    await voice.unsupported();

    // When the child reaches a duel
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then the number pad is the way of answering, and nothing switches it (L2-011 criterion 3)
    const duel = new DuelPage(page);
    await expect(duel.numberPad).toBeVisible();
    await expect(duel.switchWay).toHaveCount(0);
  });

  test('when recognition fails during a duel, the pad shows for that duel only', async ({
    page,
    device,
    clock,
    microphone,
    voice,
  }) => {
    // Given a child on Duel with voice, and the clock held
    await device.keeps(ZURI);
    await microphone.grant();
    await clock.hold();
    const duel = await duelByVoice(page, voice);
    const card = await duel.card();
    await expect.poll(() => voice.listening()).toBe(1);

    // When speech recognition fails during the duel
    await voice.fail('network');

    // Then the pad shows for the same card, the screen says so, and no switch is offered
    await expect(duel.numberPad).toBeVisible();
    expect(await duel.card()).toEqual(card);
    await expect(duel.voiceFailed).toHaveText(
      'Bolt stopped hearing, so tap your answer for this one.',
    );
    await expect(duel.switchWay).toHaveCount(0);
    await expect(duel.announcement).toHaveText(`New card: ${card.left} × ${card.right}.`);

    // When the child wins with the pad and the next duel starts
    await duel.answerWithPad(card.answer);
    await nextDuel(page, clock);

    // Then the next duel starts with voice again (docs/adr/0025)
    await expect(duel.shout).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);
    expect((await device.kept())?.wayOfAnswering).toBe('voice');
  });

  test('a refused mic on "Shout instead" gives the pad for the rest of the visit', async ({
    page,
    device,
    clock,
    microphone,
  }) => {
    // Given a child who keeps the number pad, so Mic Check is skipped, and a mic that is refused
    await device.keeps({ ...ZURI, wayOfAnswering: 'numberPad' });
    await microphone.deny();
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const card = await duel.card();

    // When the child chooses "Shout instead" and the browser refuses the mic
    await duel.shoutInstead.click();

    // Then the pad stays for the card, and "Shout instead" is gone (L2-011 criteria 4 and 6)
    await expect(duel.voiceFailed).toBeVisible();
    await expect(duel.numberPad).toBeVisible();
    await expect(duel.switchWay).toHaveCount(0);

    // When the child wins and the next duel starts
    await duel.answerWithPad(card.answer);
    await nextDuel(page, clock);

    // Then the pad is the way of answering and "Shout instead" is not offered (L2-011 6)
    await expect(duel.numberPad).toBeVisible();
    await expect(duel.voiceFailed).toHaveCount(0);
    await expect(duel.switchWay).toHaveCount(0);
  });
});

test.describe('Settings', () => {
  test('"Answer by shouting" switches the way of answering, kept on the device at once', async ({
    page,
    device,
  }) => {
    // Given a child on Home who answers by voice
    await device.keeps(ZURI);
    const home = new HomePage(page);
    await home.open();

    // When the child chooses the settings button
    await home.settings.click();

    // Then Settings opens with "Answer by shouting" on, and Done takes the focus (L2-032 4)
    const settings = new SettingsDialog(page);
    await expect(settings.dialog).toBeVisible();
    await expect(settings.title).toHaveText('Settings');
    await expect(settings.answerByShouting).toHaveAttribute('aria-checked', 'true');
    await expect(settings.answerByShoutingState).toHaveText('On');
    await expect(settings.answerByShouting).toHaveAccessibleDescription(
      'Off means you tap answers on the number pad.',
    );
    await expect(settings.note).toHaveText('Kept on this device only. No account, ever.');
    await expect(settings.done).toBeFocused();

    // When the child turns it off
    await settings.answerByShouting.click();

    // Then it reads Off, and the number pad is kept on the device the moment it changes
    await expect(settings.answerByShouting).toHaveAttribute('aria-checked', 'false');
    await expect(settings.answerByShoutingState).toHaveText('Off');
    expect((await device.kept())?.wayOfAnswering).toBe('numberPad');

    // When the child chooses Done
    await settings.done.click();

    // Then the dialog closes and the focus returns to the settings button
    await expect(settings.dialog).toHaveCount(0);
    await expect(home.settings).toBeFocused();

    // And the next game skips Mic Check and plays with the pad (L2-012 criterion 13)
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    await expect(page).toHaveURL(/\/duel$/);
    await expect(new DuelPage(page).numberPad).toBeVisible();

    // When the child turns it back on in a later visit
    await home.open();
    await home.settings.click();
    await settings.answerByShouting.press('Space');
    await expect(settings.answerByShouting).toHaveAttribute('aria-checked', 'true');
    expect((await device.kept())?.wayOfAnswering).toBe('voice');

    // And closes the dialog with Escape
    await page.keyboard.press('Escape');
    await expect(settings.dialog).toHaveCount(0);

    // Then the next game shows Mic Check again
    await setup.open();
    await setup.chooseGo();
    await expect(new MicCheckPage(page).heading).toHaveText('Mic check');
  });

  test('where the browser has no speech recognition, "Answer by shouting" is off and cannot be turned on', async ({
    page,
    device,
    voice,
  }) => {
    // Given a browser with no speech recognition
    await device.keeps(ZURI);
    await voice.unsupported();
    const home = new HomePage(page);
    await home.open();

    // When the child opens Settings
    await home.settings.click();

    // Then "Answer by shouting" is off, disabled, and says why (L2-032 criterion 4)
    const settings = new SettingsDialog(page);
    await expect(settings.answerByShouting).toHaveAttribute('aria-checked', 'false');
    await expect(settings.answerByShouting).toBeDisabled();
    await expect(settings.answerByShoutingHelp).toHaveText(
      'This browser can’t listen, so you tap answers.',
    );

    // When the child chooses Close
    await settings.close.click();

    // Then the dialog closes
    await expect(settings.dialog).toHaveCount(0);
  });
});

/** After a won duel at desk 2: the stamp, World Map, then the duel at desk 3 (ADR 0022). */
async function nextDuel(page: Page, clock: FakeClock): Promise<void> {
  const duel = new DuelPage(page);
  await expect(duel.result).toContainText('You got it!');
  await clock.pass(1000);
  await expect(duel.stamp).toBeVisible();
  await clock.pass(1200);
  await expect(page).toHaveURL(/\/map$/);
  await clock.pass(1600);
  await expect(duel.heading).toHaveText('Duel at Japan');
}

/** The words of a whole number under 1000, as a child says them: "twenty-four". */
function inWords(value: number): string {
  const units = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen'];
  const moreTeens = ['seventeen', 'eighteen', 'nineteen'];
  const tens = [
    '',
    '',
    'twenty',
    'thirty',
    'forty',
    'fifty',
    'sixty',
    'seventy',
    'eighty',
    'ninety',
  ];
  const under100 = (n: number): string => {
    if (n < 10) return units[n];
    if (n < 20) return [...teens, ...moreTeens][n - 10];
    return n % 10 === 0 ? tens[n / 10] : `${tens[Math.floor(n / 10)]}-${units[n % 10]}`;
  };
  if (value < 100) return under100(value);
  const rest = value % 100;
  const hundreds = `${units[Math.floor(value / 100)]} hundred`;
  return rest === 0 ? hundreds : `${hundreds} and ${under100(rest)}`;
}

/** Passes Mic Check with voice: "Turn on mic", "Ready!" and "Let’s go!". Duel listens. */
async function duelByVoice(page: Page, voice: FakeVoice): Promise<DuelPage> {
  const mic = await openMicCheck(page);
  await mic.turnOnMic.click();
  await expect.poll(() => voice.listening()).toBe(1);
  await voice.say('Ready!');
  await mic.letsGo.click();
  const duel = new DuelPage(page);
  await expect(duel.sum).toHaveText(/\d+ × \d+/);
  return duel;
}

/** Opens Game Setup and chooses "Go!", which opens Mic Check. */
async function openMicCheck(page: Page): Promise<MicCheckPage> {
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const mic = new MicCheckPage(page);
  await expect(mic.heading).toHaveText('Mic check');
  return mic;
}
