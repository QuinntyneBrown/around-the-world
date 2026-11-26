import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';

/**
 * Journey 04: play a solo duel with the number pad (L2-001, L2-004, L2-005, L2-007, L2-008,
 * L2-010, L2-019, L2-020, L2-033). The game's clock is held, so nothing happens until the spec
 * moves it on, and `Math.random` is fixed where a classmate must answer in a set way
 * (docs/adr/0020-solo-duel-clock-and-states.md).
 */

const ZURI = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };

test.describe('A solo duel', () => {
  test('shows a flash card from the chosen maths, the duel strip, the timer bar and the pad', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child who picked Zuri, with Times and tables 2 to 10, and the clock held
    await device.keeps(ZURI);
    await clock.hold();

    // When the child chooses "Go!" on Game Setup
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then Duel shows a Times card with one factor a chosen table and the other 1 to 12
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText(/^\s*\d+ × \d+\s*$/);
    const card = await duel.card();
    const [table, other] =
      card.left >= 2 && card.left <= 10 ? [card.left, card.right] : [card.right, card.left];
    expect(table).toBeGreaterThanOrEqual(2);
    expect(table).toBeLessThanOrEqual(10);
    expect(other).toBeGreaterThanOrEqual(1);
    expect(other).toBeLessThanOrEqual(12);
    await expect(duel.sum).toHaveAccessibleName(`${card.left} times ${card.right}`);
    await expect(duel.announcement).toHaveText(`New card: ${card.left} × ${card.right}.`);

    // And the duel strip names the child as the traveller and Kenji as the desk holder of desk 2
    expect(await duel.named(duel.traveller)).toEqual(['You', 'Travelling']);
    expect(await duel.named(duel.deskHolder)).toEqual(['Kenji', 'Holds Egypt']);
    await expect(duel.heading).toHaveText('Duel at Egypt');

    // And the timer bar has the card's 6 seconds, in the traveller's colour
    await expect(duel.timerBar).toHaveAttribute('aria-valuemax', '6');
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '6 seconds left');
    await expect(duel.timerBar).toHaveAttribute('data-kid', 'zuri');

    // And the world ring places the child at desk 2 of 12
    await expect(duel.ringLabel).toHaveText('Desk 2 of 12');
    await expect(duel.ring.getByRole('img')).toHaveAccessibleName(
      'The ring of 12 desks: you are at desk 2',
    );

    // And the answer box waits with "?" above a pad of 12 keys
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.answerBox).toHaveAccessibleName('Your answer: nothing yet');
    await expect(duel.padKeys).toHaveCount(12);
  });
});
