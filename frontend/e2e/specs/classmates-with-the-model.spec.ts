import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { PauseDialog } from '../pages/pause.dialog';
import { PodiumPage } from '../pages/podium.page';

/**
 * Journey 11: let the on-device model drive the classmates (L2-020, L2-021, L2-042). The
 * fixture's fake `LanguageModel` answers as each spec tells it to; the game's clock is held, and
 * `Math.random` is fixed so the classmate's profile answers in a known way
 * (docs/adr/0030-classmates-with-the-on-device-model.md). With `random.always(0.999)` Kenji's
 * profile answers wrong after about 3.3 seconds; with `random.always(0)` it answers right after
 * 1,786 ms.
 */

/** A child playing as Zuri with the number pad, so Mic Check is skipped (L2-012 13). */
const zuriWith = (tourLength: 6 | 12 = 12) => ({
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  setup: { kinds: ['times'], tables: [2, 3, 4, 5], tourLength, cardSpeed: 'normal' },
  wayOfAnswering: 'numberPad' as const,
});
/** The nickname of `nickname: { adjective: 0, animal: 0 }`. */
const NICKNAME = ['Speedy', 'Otter'];
/** When Kenji's profile answers right, with `random.always(0)`. */
const KENJI_PROFILE_MS = 1786;
/** The waits after a duel the child wins as the traveller: "You got it!", the stamp, the message. */
const HOP_MS = 1000 + 1200;
const MESSAGE_MS = 1600;

async function startDuel(page: Page): Promise<DuelPage> {
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  await expect(duel.answerBox).toHaveText('?');
  return duel;
}

test.describe('Classmates with the on-device model', () => {
  test('@critical with the model ready, the classmate answers what the model decides, when it decides', async ({
    page,
    device,
    clock,
    random,
    model,
  }) => {
    // Given a browser whose on-device model is ready and slow, and a profile that would answer
    // wrong after about 3.3 seconds
    await device.keeps(zuriWith());
    await random.always(0.999);
    await clock.hold();
    await model.holds();

    // When the child starts a solo tour, the first flash card shows at once
    const duel = await startDuel(page);
    const { answer } = await duel.card();

    // Then Kenji's model session is asked about that card
    await expect.poll(() => model.waiting()).toBe(1);

    // When the model decides the right answer after 1 second
    expect(await model.reply(JSON.stringify({ answer, afterMs: 1000 }))).toBe(1);
    await clock.pass(1000);

    // Then Kenji gives the model's answer at the model's time, and wins the duel
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
  });

  test('each classmate has its own session, primed with its profile; no prompt holds the child', async ({
    page,
    device,
    clock,
    model,
  }) => {
    // Given a browser whose on-device model is ready, and a tour of 12 desks
    await device.keeps(zuriWith(12));
    await clock.hold();
    await model.holds();

    // When the tour starts
    const duel = await startDuel(page);
    const card = await duel.card();

    // Then each of the 11 classmates has its own session
    await expect.poll(async () => (await model.sessions()).created).toBe(11);

    // And each was primed with a profile only, and the card prompt is the flash card only
    await expect.poll(() => model.waiting()).toBe(1);
    const asked = await model.asked();
    const primings = asked.filter((text) => text.includes('Skill level'));
    expect(primings).toHaveLength(11);
    expect(primings[0]).toContain('Skill level: 3 of 5. Characteristics: planner.');
    expect(asked).toContain(`${card.left} ${card.sign} ${card.right} = ?`);
    for (const text of asked) {
      for (const word of [...NICKNAME, 'Zuri']) expect(text).not.toContain(word);
    }
  });

  test('the sessions stay while World Map shows, and go when the child goes home from Pause', async ({
    page,
    device,
    clock,
    model,
  }) => {
    // Given a tour of 6 desks with the model ready, and its 5 sessions open
    await device.keeps(zuriWith(6));
    await clock.hold();
    await model.holds();
    let duel = await startDuel(page);
    await expect.poll(async () => (await model.sessions()).created).toBe(5);

    // When the child wins the duel and World Map shows the hop
    const { answer } = await duel.card();
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
    await clock.pass(HOP_MS);
    await expect(page).toHaveURL(/\/map$/);

    // Then every session is kept, and the abandoned prompt is let go
    expect(await model.sessions()).toEqual({ created: 5, destroyed: 0, open: 5 });
    expect(await model.waiting()).toBe(0);

    // When the next duel opens and the child goes home from Pause
    await clock.pass(MESSAGE_MS);
    duel = new DuelPage(page);
    await expect(duel.heading).toHaveText('Duel at Japan');
    await duel.pause.click();
    const paused = new PauseDialog(page);
    await expect(paused.dialog).toBeVisible();
    await paused.goHome.click();
    await expect(new HomePage(page).play).toHaveText('Play');

    // Then every session is destroyed
    expect(await model.sessions()).toEqual({ created: 5, destroyed: 5, open: 0 });
  });

  test('the sessions go when the tour ends on the Podium', async ({
    page,
    device,
    clock,
    model,
  }) => {
    // Given a tour of 6 desks with the model ready
    await device.keeps(zuriWith(6));
    await clock.hold();
    await model.holds();
    await startDuel(page);
    await expect.poll(async () => (await model.sessions()).created).toBe(5);

    // When the child wins every duel and goes all the way round
    for (let hop = 1; hop <= 5; hop++) {
      const duel = new DuelPage(page);
      await expect(duel.answerBox).toHaveText('?');
      const { answer } = await duel.card();
      await duel.answerWithPad(answer);
      await expect(duel.result).toHaveText(`= ${answer} You got it!`);
      await clock.pass(HOP_MS);
      await expect(page).toHaveURL(/\/map$/);
      await clock.pass(MESSAGE_MS);
    }

    // Then the Podium opens and every session is destroyed
    await expect(page).toHaveURL(/\/podium$/);
    await expect(new PodiumPage(page).headline).toBeVisible();
    expect(await model.sessions()).toEqual({ created: 5, destroyed: 5, open: 0 });
  });

  for (const browser of ['missing', 'downloadable'] as const) {
    test(`with ${browser === 'missing' ? 'no on-device model' : 'a model not downloaded'}, the classmates play from their profiles and nothing is downloaded`, async ({
      page,
      device,
      clock,
      random,
      model,
    }) => {
      // Given a browser with no model, or one whose model is not downloaded, and a profile that
      // answers right after 1,786 ms
      await device.keeps(zuriWith());
      await random.always(0);
      await clock.hold();
      await (browser === 'missing' ? model.missing() : model.downloadable());

      // When the tour starts and Kenji's profile time comes
      const duel = await startDuel(page);
      const { answer } = await duel.card();
      await clock.pass(KENJI_PROFILE_MS);

      // Then Kenji answers from the profile, and no session was created, so nothing was
      // downloaded (the fixture fails a spec whose game starts a download)
      await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
      expect(await model.sessions()).toEqual({ created: 0, destroyed: 0, open: 0 });
    });
  }

  test('a slow model is let go at the profile’s time, and the classmate answers from its profile', async ({
    page,
    device,
    clock,
    random,
    model,
  }) => {
    // Given a model that never answers in time, and a profile that answers right after 1,786 ms
    await device.keeps(zuriWith());
    await random.always(0);
    await clock.hold();
    await model.holds();
    const duel = await startDuel(page);
    const { answer } = await duel.card();
    await expect.poll(() => model.waiting()).toBe(1);

    // When the profile's time comes with no decision from the model
    await clock.pass(KENJI_PROFILE_MS);

    // Then Kenji answers from the profile and the waiting prompt is aborted
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
    expect(await model.waiting()).toBe(0);
    expect(await model.aborted()).toBe(1);
  });

  test('a failing model leaves the classmate to answer from its profile', async ({
    page,
    device,
    clock,
    random,
    model,
  }) => {
    // Given a model whose every prompt fails, and a profile that answers right after 1,786 ms
    await device.keeps(zuriWith());
    await random.always(0);
    await clock.hold();
    await model.fails();
    const duel = await startDuel(page);
    const { answer } = await duel.card();
    await expect
      .poll(async () => (await model.asked()).some((text) => text.endsWith('= ?')))
      .toBe(true);

    // When the profile's time comes
    await clock.pass(KENJI_PROFILE_MS);

    // Then Kenji answers from the profile
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
  });

  for (const reply of [
    'Kenji says 7!',
    '{"answer":1000,"afterMs":900}',
    '{"answer":4,"afterMs":0}',
  ]) {
    test(`a model reply that is not an answer and a time is ignored: ${reply}`, async ({
      page,
      device,
      clock,
      random,
      model,
    }) => {
      // Given a model ready, and a profile that answers right after 1,786 ms
      await device.keeps(zuriWith());
      await random.always(0);
      await clock.hold();
      await model.holds();
      const duel = await startDuel(page);
      const { answer } = await duel.card();
      await expect.poll(() => model.waiting()).toBe(1);

      // When the model replies with something that is not a whole-number answer and a time
      await model.reply(reply);
      await clock.pass(1000);

      // Then the reply is discarded: Kenji answers from the profile at the profile's time
      await clock.pass(KENJI_PROFILE_MS - 1000);
      await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);

      // And no text of the reply is shown
      await expect(page.getByText('Kenji says')).toHaveCount(0);
    });
  }
});
