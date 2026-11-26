import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { named } from '../support/motion';

/**
 * Journey 10: feel the hop with motion and sound (L2-038, L2-039, L2-015). Motion is read from
 * what the browser plays, with and without the device's reduced motion, which the spec
 * emulates (docs/adr/0029-motion-and-sound.md). The game's clock is held, so each moment stays
 * until the spec moves the clock on.
 */

// A child who answers with the number pad, so Mic Check is skipped (L2-012 criterion 13).
const ZURI = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  wayOfAnswering: 'numberPad' as const,
};

test.describe('Motion', () => {
  test('@critical a new flash card flips in, a wrong answer shakes it once, and the stamp lands tilted', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child at the first duel, the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // Then the new flash card flips in within 300 ms
    const flip = named(await duel.cardMotion(), 'flip-in');
    expect(flip?.ms).toBeGreaterThan(0);
    expect(flip?.ms).toBeLessThanOrEqual(300);
    expect(flip?.times).toBe(1);

    // When the child gives a wrong answer
    await duel.answerWithPad(answer + 1);

    // Then the card shakes once, for about 300 ms
    await expect(duel.result).toHaveText(`Not ${answer + 1}! Frozen for a sec…`);
    const shake = named(await duel.cardMotion(), 'shake');
    expect(shake?.times).toBe(1);
    expect(shake?.ms).toBeGreaterThanOrEqual(250);
    expect(shake?.ms).toBeLessThanOrEqual(350);

    // When the freeze is over and the child answers right, and "You got it!" has shown 1 second
    await clock.pass(1000);
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
    await clock.pass(1000);

    // Then the passport stamp lands tilted, in about 250 ms
    await expect(duel.stampCountry).toHaveText('Japan');
    const stamp = await duel.stampMotion();
    expect(stamp.rotate).not.toBe('none');
    expect(named(stamp, 'stamp-in')?.ms).toBeLessThanOrEqual(300);
  });

  test('with reduced motion the card, the shake and the stamp are quick fades', async ({
    page,
    device,
    clock,
  }) => {
    // Given a device that asks for reduced motion, and a child at the first duel
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // Then the new flash card fades in within 200 ms, with no flip
    const card = await duel.cardMotion();
    expect(named(card, 'flip-in')).toBeUndefined();
    expect(named(card, 'fade-in')?.ms).toBeGreaterThan(0);
    expect(named(card, 'fade-in')?.ms).toBeLessThanOrEqual(200);

    // When the child gives a wrong answer
    await duel.answerWithPad(answer + 1);

    // Then the card does not shake: it fades back within 200 ms
    await expect(duel.result).toHaveText(`Not ${answer + 1}! Frozen for a sec…`);
    const frozen = await duel.cardMotion();
    expect(named(frozen, 'shake')).toBeUndefined();
    expect(named(frozen, 'fade-back')?.ms).toBeGreaterThan(0);
    expect(named(frozen, 'fade-back')?.ms).toBeLessThanOrEqual(200);

    // When the child answers right and "You got it!" has shown 1 second
    await clock.pass(1000);
    await duel.answerWithPad(answer);
    await clock.pass(1000);

    // Then the stamp stands upright and fades in within 200 ms
    await expect(duel.stampCountry).toHaveText('Japan');
    const stamp = await duel.stampMotion();
    expect(stamp.rotate).toBe('none');
    expect(named(stamp, 'stamp-in')).toBeUndefined();
    expect(named(stamp, 'fade-in')?.ms).toBeGreaterThan(0);
    expect(named(stamp, 'fade-in')?.ms).toBeLessThanOrEqual(200);
  });
});
