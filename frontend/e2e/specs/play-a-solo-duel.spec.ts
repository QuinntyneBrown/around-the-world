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

  test('@critical a child answers with the number pad first and wins the duel', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Duel, the clock held so no classmate answers yet
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer, left, sign, right } = await duel.card();

    // When the child presses the answer's digits
    await duel.pressDigits(answer);

    // Then the digits show on the flash card as they are pressed
    await expect(duel.answerBox).toHaveText(String(answer));
    await expect(duel.answerBox).toHaveAccessibleName(`Your answer: ${answer}`);

    // When the child presses Go
    await duel.go.click();

    // Then the child wins: the card shows the answer and "You got it!", and the pad is gone
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
    await expect(duel.announcement).toHaveText(
      `${left} ${sign} ${right} is ${answer}. You got it!`,
    );
    await expect(duel.numberPad).toHaveCount(0);
  });

  test('takes three digits at most, Delete removes the last, and Go with none gives no answer', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Duel, the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await expect(duel.answerBox).toHaveText('?');

    // When the child presses four digits
    await duel.pressDigits('1234');

    // Then the fourth is ignored
    await expect(duel.answerBox).toHaveText('123');

    // When the child presses Delete three times and then Go
    await duel.deleteKey.click();
    await expect(duel.answerBox).toHaveText('12');
    await duel.deleteKey.click();
    await duel.deleteKey.click();
    await duel.go.click();

    // Then no answer is given: the box waits with "?" and the child is not frozen
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.result).toHaveCount(0);
    await expect(duel.go).toBeEnabled();
  });

  test('takes digits, Backspace and Enter from the keyboard as the pad’s keys', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Duel with a keyboard, the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // When the child types a wrong digit, Backspace, the answer and Enter
    await duel.typeKeys('9', 'Backspace');
    await expect(duel.answerBox).toHaveText('?');
    await duel.typeKeys(String(answer));
    await expect(duel.answerBox).toHaveText(String(answer));
    await duel.typeKeys('Enter');

    // Then the answer is given, and the child wins
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
  });

  test('a classmate who answers correctly first wins, gently', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a classmate who always answers right at its fastest, and the clock held
    await device.keeps(ZURI);
    await random.always(0);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();

    // When the child has not answered and 5 of the card's 6 seconds pass
    await clock.pass(5000);

    // Then Kenji wins: the card says who answered first, with no red and no buzzer
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
    await expect(duel.announcement).toHaveText(`Kenji said ${answer} first. You sit at Egypt.`);
    await expect(duel.flashCard).not.toHaveClass(/flash-card--frozen/);
    await expect(duel.numberPad).toHaveCount(0);

    // And a correct answer from the child afterwards changes nothing
    await duel.typeKeys(String(answer), 'Enter');
    await expect(duel.result).toHaveText(`Kenji said ${answer} first. So close!`);
  });

  test('a wrong answer freezes the child for one second, then the entry is empty', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child on Duel, the clock held
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const { answer } = await duel.card();
    const wrong = answer + 2;

    // When the child gives a wrong answer
    await duel.answerWithPad(wrong);

    // Then the card names it and says the child is frozen, outlined, and the pad is disabled
    await expect(duel.result).toHaveText(`Not ${wrong}! Frozen for a sec…`);
    await expect(duel.announcement).toHaveText(`Not ${wrong}. Frozen for one second.`);
    await expect(duel.flashCard).toHaveClass(/flash-card--frozen/);
    await expect(duel.answerBox).toHaveText(String(wrong));
    await expect(duel.go).toBeDisabled();

    // And nothing the child types is entered while frozen
    await duel.typeKeys(String(answer), 'Enter');
    await expect(duel.result).toHaveText(`Not ${wrong}! Frozen for a sec…`);

    // When one second passes on the clock
    await clock.pass(1000);

    // Then the child can answer the same card again, with an empty entry
    await expect(duel.go).toBeEnabled();
    await expect(duel.answerBox).toHaveText('?');
    await expect(duel.result).toHaveCount(0);
    await duel.answerWithPad(answer);
    await expect(duel.result).toHaveText(`= ${answer} You got it!`);
  });

  test('a card nobody answers in time shows its answer, then a new card for the same two', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given a classmate who always answers wrong, Lightning cards, and the clock held
    await device.keeps({
      ...ZURI,
      setup: {
        kinds: ['times'],
        tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        tourLength: 12,
        cardSpeed: 'lightning',
      },
    });
    await random.always(0.999);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    const first = await duel.card();
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '3 seconds left');

    // When 2 seconds pass, the timer bar drains
    await clock.pass(2000);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '1 second left');

    // When the card's 3 seconds have passed with no correct answer
    await clock.pass(1000);

    // Then the card says time is up and gives its answer, and nobody wins
    await expect(duel.result).toHaveText(
      `Time’s up! It was ${first.answer}. Here comes a new card…`,
    );
    await expect(duel.announcement).toHaveText(
      `Time is up. It was ${first.answer}. A new card is coming.`,
    );

    // When 2 more seconds pass
    await clock.pass(2000);

    // Then the same two players duel over a new card, with nobody frozen
    await expect(duel.answerBox).toHaveText('?');
    const next = await duel.card();
    expect(`${next.left} ${next.sign} ${next.right}`).not.toBe(
      `${first.left} ${first.sign} ${first.right}`,
    );
    expect(await duel.named(duel.deskHolder)).toEqual(['Kenji', 'Holds Egypt']);
    await expect(duel.go).toBeEnabled();
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '3 seconds left');
  });

  test('the kids nobody picked are among the classmates, round a ring of the chosen length', async ({
    page,
    device,
    clock,
  }) => {
    // Given a child who picked Nia and a tour of 6 desks, the clock held
    await device.keeps({
      ...ZURI,
      kid: 'nia',
      setup: {
        kinds: ['times'],
        tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        tourLength: 6,
        cardSpeed: 'normal',
      },
    });
    await clock.hold();

    // When the child chooses "Go!"
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();

    // Then the child travels, and Zuri, the first kid not picked, holds desk 2
    const duel = new DuelPage(page);
    expect(await duel.named(duel.traveller)).toEqual(['You', 'Travelling']);
    expect(await duel.named(duel.deskHolder)).toEqual(['Zuri', 'Holds Egypt']);
    await expect(duel.timerBar).toHaveAttribute('data-kid', 'nia');

    // And the ring of 6 desks holds the five kids, the child's own dot marked
    await expect(duel.ringLabel).toHaveText('Desk 2 of 6');
    expect(await duel.racerKids()).toEqual(['zuri', 'kenji', 'milo', 'pip', 'nia (you)']);
  });

  test('under 768px a line of text replaces the ring, and the pad sits under the card', async ({
    page,
    device,
    clock,
  }) => {
    // Given a phone held upright, and a child on Duel
    await page.setViewportSize({ width: 375, height: 740 });
    await device.keeps(ZURI);
    await clock.hold();
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);

    // Then the world ring gives way to "Egypt · desk 2 of 12", the pad is under the card,
    // the card is the largest thing, and the screen does not scroll
    await expect(duel.progress).toHaveText('Egypt · desk 2 of 12');
    await expect(duel.ring).toBeHidden();
    expect(await duel.padPlacement()).toBe('under');
    expect(await duel.cardIsLargest()).toBe(true);
    expect(await duel.scrolls()).toBe(false);

    // When the screen is a tablet's
    await page.setViewportSize({ width: 820, height: 1180 });

    // Then the ring shows, the line of text goes, and the pad sits beside the card
    await expect(duel.ring).toBeVisible();
    await expect(duel.progress).toBeHidden();
    expect(await duel.padPlacement()).toBe('beside');
    expect(await duel.scrolls()).toBe(false);

    // When a phone is turned on its side
    await page.setViewportSize({ width: 740, height: 375 });

    // Then the desk goes beside the names, and the card and the pad are both whole
    await expect(duel.hudDesk).toHaveText('Desk 2 of 12');
    await expect(duel.hudDesk).toBeVisible();
    expect(await duel.scrolls()).toBe(false);
    expect(await duel.inView(duel.go)).toBe(true);
  });

  test('a three-digit sum and a 24-desk tour fit the narrowest phone', async ({
    page,
    device,
    clock,
    random,
  }) => {
    // Given the narrowest phone, a tour of 24 desks with only Divide by 12, and the source of
    // chance at its most, so the card is 144 ÷ 12
    await page.setViewportSize({ width: 320, height: 568 });
    await device.keeps({
      ...ZURI,
      setup: { kinds: ['divide'], tables: [12], tourLength: 24, cardSpeed: 'normal' },
    });
    await random.always(0.999);
    await clock.hold();

    // When the child chooses "Go!" and enters three digits
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.chooseGo();
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveAccessibleName('144 divided by 12');
    await duel.pressDigits('120');

    // Then the sum and the answer are whole, and the screen does not scroll
    await expect(duel.progress).toHaveText('Egypt · desk 2 of 24');
    await expect(duel.answerBox).toHaveText('120');
    expect(await duel.fits(duel.sum)).toBe(true);
    expect(await duel.fits(duel.answerBox)).toBe(true);
    expect(await duel.scrolls()).toBe(false);
    expect(await duel.inView(duel.go)).toBe(true);
  });
});
