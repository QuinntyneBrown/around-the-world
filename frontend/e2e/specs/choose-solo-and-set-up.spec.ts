import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';

/**
 * Journey 03: choose solo and set up the game (L2-015, L2-016, L2-017, L2-018, L2-019,
 * L2-030, L2-031).
 */

const ZURI = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };
const KID_PICTURES = /\/img\/kid-\w+\.jpg$/;
const DEFAULT_TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

test.describe('Solo Or Friends', () => {
  test('@critical a child chooses Play solo and Go! with the defaults, and Duel deals a card', async ({
    page,
  }) => {
    // Given a new child picks Zuri from Home
    const home = new HomePage(page);
    await home.open();
    await home.choosePlay();
    await new PickYourKidPage(page).confirmKid();

    // Then Solo Or Friends offers "Just me" and "With friends"
    const solo = new SoloOrFriendsPage(page);
    await expect(solo.heading).toHaveText('Who’s playing?');
    await expect(solo.modeTitles).toHaveText(['Just me', 'With friends']);

    // When the child chooses "Play solo"
    await solo.choosePlaySolo();

    // Then Game Setup opens with the defaults
    const setup = new GameSetupPage(page);
    await expect(setup.heading).toHaveText('Set up your game');
    await expect(page).toHaveURL(/\/setup$/);
    await expect(setup.go).toHaveText('Go!');

    // When the child chooses "Go!" with no changes
    await setup.chooseGo();

    // Then Duel opens with the first flash card, with no request to a backend
    // (its loading state stands only until then: docs/adr/0020, and the page's unit test)
    const duel = new DuelPage(page);
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.sum).toHaveText(/\d+ × \d+/);
  });

  test('shows both ways to play, with the classmates the child did not pick', async ({
    page,
    device,
  }) => {
    // Given a child who picked Zuri
    await device.keeps(ZURI);

    // When Solo Or Friends opens
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // Then "Just me" pictures the four kids the child did not pick, as classmates
    await expect(solo.classmates).toHaveCount(4);
    expect(await solo.classmateNames()).toEqual(['Kenji', 'Nia', 'Milo', 'Pip']);
    await expect(solo.playSolo).toHaveText('Play solo');
    await expect(
      page.getByText('Race the class. Your classmates are played by the computer.'),
    ).toBeVisible();

    // And "With friends" shows what a code looks like, "Make a room" and "Join a room"
    await expect(
      page.getByText('Play live with up to 8 friends. Share a 4-letter code to get them in.'),
    ).toBeVisible();
    await expect(solo.codeLetters).toBeVisible();
    await expect(solo.makeRoom).toHaveText('Make a room');
    await expect(solo.joinRoom).toHaveText('Join a room');
  });

  test('Play solo opens Game Setup, and Back returns to Solo Or Friends', async ({
    page,
    device,
  }) => {
    // Given a child who picked Nia is on Solo Or Friends
    await device.keeps({ ...ZURI, kid: 'nia' });
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await expect(solo.classmates).toHaveCount(4);
    expect(await solo.classmateNames()).toEqual(['Zuri', 'Kenji', 'Milo', 'Pip']);

    // When the child chooses "Play solo"
    await solo.choosePlaySolo();

    // Then Game Setup opens
    const setup = new GameSetupPage(page);
    await expect(setup.heading).toHaveText('Set up your game');

    // And Back returns to Solo Or Friends
    await setup.goBack();
    await expect(solo.heading).toHaveText('Who’s playing?');
    await expect(page).toHaveURL(/\/play$/);
  });

  test('shows skeletons and "Getting ready…" while the classmates’ pictures arrive', async ({
    page,
    device,
    pictures,
  }) => {
    // Given a child who picked Zuri, and pictures slow to arrive
    await device.keeps(ZURI);
    const release = pictures.holdBack(KID_PICTURES);

    // When Solo Or Friends opens
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // Then skeletons in the shape of the two ways to play stand in, with a status
    await expect(solo.status).toHaveText('Getting ready…');
    await expect(solo.classmatesSkeleton.first()).toBeVisible();
    await expect(solo.playSolo).toHaveCount(0);

    // When the pictures arrive
    release();

    // Then the two ways to play are offered
    await expect(solo.classmates).toHaveCount(4);
    await expect(solo.playSolo).toBeVisible();
  });

  test('classmates whose pictures cannot load are drawn, and Play solo still works', async ({
    page,
    device,
    pictures,
  }) => {
    // Given a child who picked Zuri, and pictures that cannot load
    await device.keeps(ZURI);
    pictures.refuse(KID_PICTURES);

    // When Solo Or Friends opens
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // Then the classmates are drawn, and "Play solo" opens Game Setup
    await expect(solo.classmates).toHaveCount(4);
    expect(await solo.classmateNames()).toEqual(['Kenji', 'Nia', 'Milo', 'Pip']);
    await solo.choosePlaySolo();
    await expect(new GameSetupPage(page).heading).toHaveText('Set up your game');
  });
});

test.describe('Game Setup', () => {
  test('opens with the defaults: Times, tables 2 to 10, 12 desks and Normal', async ({ page }) => {
    // Given Game Setup opens for the first time
    const setup = new GameSetupPage(page);
    await setup.open();

    // Then Times is on, tables 2 to 10 are on, and Plus, Minus and Divide are off
    await expect(setup.kinds).toHaveText(['× Times', '+ Plus', '− Minus', '÷ Divide']);
    expect(await setup.kindsOnNames()).toEqual(['Times']);
    await expect(setup.tables).toHaveCount(11);
    expect(await setup.tablesOnNumbers()).toEqual(DEFAULT_TABLES);

    // And the tour is 12 desks, Round the world, and the card speed is Normal, 6 seconds
    await expect(setup.tourLengthChosen).toHaveText('12 desks');
    await expect(setup.tourHint).toHaveText('Round the world · about 5 minutes');
    await expect(setup.speedChosen).toHaveText('Normal');
    await expect(setup.speedHint).toHaveText('6 seconds per card');
  });

  test('a web address of Duel opens Home when no game has started', async ({ page }) => {
    // Given no game has started
    // When the child opens Duel's web address
    await new DuelPage(page).open();

    // Then Home opens
    await expect(new HomePage(page).play).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('toggles the kinds of maths and the times tables, each exposed as pressed', async ({
    page,
  }) => {
    // Given Game Setup with the defaults
    const setup = new GameSetupPage(page);
    await setup.open();

    // When the child turns on Plus, Minus and Divide
    for (const kind of ['Plus', 'Minus', 'Divide'] as const) await setup.kind(kind).click();

    // Then every kind of maths is on and pressed
    expect(await setup.kindsOnNames()).toEqual(['Times', 'Plus', 'Minus', 'Divide']);
    await expect(setup.kind('Divide')).toHaveAttribute('aria-pressed', 'true');

    // When the child turns 11 on and 2 off
    await setup.table(11).click();
    await setup.table(2).click();

    // Then each table says whether it is pressed
    await expect(setup.table(11)).toHaveAttribute('aria-pressed', 'true');
    await expect(setup.table(2)).toHaveAttribute('aria-pressed', 'false');
    expect(await setup.tablesOnNumbers()).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11]);

    // When the child turns Plus off again
    await setup.kind('Plus').click();

    // Then Plus is off and not pressed
    await expect(setup.kind('Plus')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Easy turns on 2, 3, 4, 5 and 10, and All turns on 2 to 12', async ({ page }) => {
    // Given Game Setup with the defaults
    const setup = new GameSetupPage(page);
    await setup.open();

    // When the child chooses Easy
    await setup.easy.click();

    // Then tables 2, 3, 4, 5 and 10 are on
    expect(await setup.tablesOnNumbers()).toEqual([2, 3, 4, 5, 10]);

    // When the child chooses All
    await setup.all.click();

    // Then tables 2 to 12 are on
    await expect(setup.tablesOn).toHaveCount(11);
  });

  test('the last kind of maths stays on and Game Setup says why', async ({ page }) => {
    // Given only Times is on
    const setup = new GameSetupPage(page);
    await setup.open();

    // When the child turns Times off
    await setup.kind('Times').click();

    // Then it stays on and a status says why
    await expect(setup.kind('Times')).toHaveAttribute('aria-pressed', 'true');
    await expect(setup.lastKindStatus).toBeVisible();
    await expect(page.getByRole('status')).toContainText(
      'Keep at least one kind of maths on. Turn another on first.',
    );

    // When the child turns another on
    await setup.kind('Minus').click();

    // Then the line goes, and Times can be turned off
    await expect(setup.lastKindStatus).toHaveCount(0);
    await setup.kind('Times').click();
    expect(await setup.kindsOnNames()).toEqual(['Minus']);
  });

  test('the last times table stays on and Game Setup says why', async ({ page }) => {
    // Given only the 7 times table is on
    const setup = new GameSetupPage(page);
    await setup.open();
    for (const table of [2, 3, 4, 5, 6, 8, 9, 10]) await setup.table(table).click();
    expect(await setup.tablesOnNumbers()).toEqual([7]);

    // When the child turns it off
    await setup.table(7).click();

    // Then it stays on and a status says why
    await expect(setup.table(7)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('status')).toContainText(
      'Keep at least one times table on. Turn another on first.',
    );
  });

  test('with Times off the tables cannot be changed, and they return with Times', async ({
    page,
  }) => {
    // Given Game Setup with Plus on beside Times, and Easy chosen
    const setup = new GameSetupPage(page);
    await setup.open();
    await setup.kind('Plus').click();
    await setup.easy.click();

    // When the child turns Times off
    await setup.kind('Times').click();

    // Then no table is pressed and none can be changed, Easy and All are not offered, and
    // Game Setup says why
    await expect(setup.tablesOn).toHaveCount(0);
    for (const table of [2, 7, 12]) await expect(setup.table(table)).toBeDisabled();
    await expect(setup.easy).toHaveCount(0);
    await expect(setup.all).toHaveCount(0);
    await expect(setup.timesOffHint).toBeVisible();

    // When the child turns Times on again
    await setup.kind('Times').click();

    // Then the tables that were on are on again
    expect(await setup.tablesOnNumbers()).toEqual([2, 3, 4, 5, 10]);
    await expect(setup.timesOffHint).toHaveCount(0);
  });

  test('shows each tour length’s name and time, and each speed’s seconds per card', async ({
    page,
  }) => {
    // Given Game Setup
    const setup = new GameSetupPage(page);
    await setup.open();

    for (const [desks, words] of [
      [6, 'Quick hop · about 2 minutes'],
      [24, 'Grand tour · about 10 minutes'],
      [12, 'Round the world · about 5 minutes'],
    ] as const) {
      // When the child chooses a tour length
      await setup.tourLength(desks).click();

      // Then only it is chosen, and its name and about how long it takes are shown
      await expect(setup.tourLength(desks)).toHaveAttribute('aria-pressed', 'true');
      await expect(setup.tourLengthChosen).toHaveCount(1);
      await expect(setup.tourHint).toHaveText(words);
    }

    for (const [speed, words] of [
      ['Chill', '10 seconds per card'],
      ['Lightning', '3 seconds per card. Good luck!'],
      ['Normal', '6 seconds per card'],
    ] as const) {
      // When the child chooses a card speed
      await setup.speed(speed).click();

      // Then only it is chosen, and the time per card is shown
      await expect(setup.speed(speed)).toHaveAttribute('aria-pressed', 'true');
      await expect(setup.speedChosen).toHaveCount(1);
      await expect(setup.speedHint).toHaveText(words);
    }
  });

  test('a changed setup is kept: after Back, and when the child returns', async ({
    page,
    device,
  }) => {
    // Given a child who picked Zuri changes the setup
    await device.keeps(ZURI);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.choosePlaySolo();
    const setup = new GameSetupPage(page);
    await setup.kind('Minus').click();
    await setup.easy.click();
    await setup.tourLength(24).click();
    await setup.speed('Chill').click();

    // Then the device keeps the setup beside the kid and nickname
    expect(await device.kept()).toEqual({
      ...ZURI,
      setup: {
        kinds: ['times', 'minus'],
        tables: [2, 3, 4, 5, 10],
        tourLength: 24,
        cardSpeed: 'chill',
      },
    });

    // When the child goes Back and chooses Play solo again
    await setup.goBack();
    await solo.choosePlaySolo();

    // Then Game Setup is as they left it
    expect(await setup.kindsOnNames()).toEqual(['Times', 'Minus']);
    expect(await setup.tablesOnNumbers()).toEqual([2, 3, 4, 5, 10]);
    await expect(setup.tourLengthChosen).toHaveText('24 desks');
    await expect(setup.speedChosen).toHaveText('Chill');

    // And when they close the game and open Game Setup again, it is as they left it
    await page.reload();
    await expect(setup.tourLengthChosen).toHaveText('24 desks');
    expect(await setup.kindsOnNames()).toEqual(['Times', 'Minus']);
  });
});

test.describe('At every width', () => {
  for (const [form, width, height, beside] of [
    ['a phone', 360, 780, false],
    ['a tablet', 768, 1024, false],
    ['a laptop', 1280, 800, true],
    ['a large desktop', 1920, 1080, true],
  ] as const) {
    test(`on ${form} Solo Or Friends and Game Setup fit without scrolling sideways`, async ({
      page,
    }) => {
      // Given the form factor
      await page.setViewportSize({ width, height });

      // Then the two ways to play stand side by side from 768px
      const solo = new SoloOrFriendsPage(page);
      await solo.open();
      await expect(solo.playSolo).toBeVisible();
      expect(await solo.modesSideBySide()).toBe(width >= 768);

      // And Game Setup puts the tour beside the maths from 992px, and nothing scrolls sideways
      await solo.choosePlaySolo();
      const setup = new GameSetupPage(page);
      await expect(setup.go).toBeVisible();
      expect(await setup.mathsBesideTour()).toBe(beside);
      expect(await setup.scrollsSideways()).toBe(false);
    });
  }
});
