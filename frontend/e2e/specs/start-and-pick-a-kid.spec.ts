import { expect, test, type FakeDevice } from '../fixtures/test';
import { HomePage } from '../pages/home.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { A_NICKNAME, indexesOf } from '../support/nicknames';

/** Journey 02: start from Home and pick a kid (L2-013, L2-014, L2-015, L2-030, L2-031). */

const KIDS = [
  ['Zuri', 'First to shout it!', 'Bold and loud. Zuri holds her pencil like a sword'],
  ['Kenji', 'Collects every country', 'The planner. Kenji pins a badge on his backpack'],
  ['Nia', 'Fastest feet in class', 'The sprinter. Nia is always mid-jump'],
  ['Milo', 'Quiet. Then BOOM.', 'Shy but brilliant. His robot pal Bolt beeps'],
  ['Pip', 'Flies to every desk', 'The dreamer. Pip throws a paper plane'],
] as const;

const KID_PICTURES = /\/img\/kid-\w+\.jpg$/;

test.describe('Home for a new child', () => {
  test('@critical Play opens Pick Your Kid, and Back returns Home', async ({ page }) => {
    // Given a child who has picked no kid
    const home = new HomePage(page);
    await home.open();

    // Then Home shows the game's name, one Play button and no kid, nickname or "Change kid"
    await expect(home.title).toHaveText('Around the World');
    await expect(home.play).toHaveText('Play');
    await expect(home.noNamesLine).toBeVisible();
    await expect(home.kidChip).toHaveCount(0);

    // When the child chooses Play
    await home.choosePlay();

    // Then Pick Your Kid opens
    const pick = new PickYourKidPage(page);
    await expect(pick.heading).toHaveText('Pick your kid');
    await expect(page).toHaveURL(/\/kid$/);

    // And Back returns Home
    await pick.goBack();
    await expect(home.play).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Picking a kid', () => {
  test('offers the five kids with Zuri chosen, and a chosen kid comes forward', async ({
    page,
  }) => {
    // Given a child with no kid kept opens Pick Your Kid
    const pick = new PickYourKidPage(page);
    await pick.open();

    // Then the five kids are offered in order, with Zuri chosen
    await expect(pick.kids).toHaveText(KIDS.map(([name]) => name));
    await expect(pick.chosenKid).toHaveText('Zuri');
    await expect(pick.stageName).toHaveText('Zuri');
    await expect(pick.confirm).toHaveText('I’m Zuri!');

    for (const [name, tagline, description] of KIDS) {
      // When the child chooses a kid
      await pick.choose(name);

      // Then that kid, and only that kid, is chosen and comes forward
      await expect(pick.kid(name)).toHaveAttribute('aria-pressed', 'true');
      await expect(pick.chosenKid).toHaveCount(1);
      await expect(pick.stageName).toHaveText(name);
      await expect(pick.stageTagline).toHaveText(tagline);
      await expect(pick.stageBio).toContainText(description);
      await expect(pick.stagePicture).toHaveAttribute('alt', name);
      await expect(pick.confirm).toHaveText(`I’m ${name}!`);
    }
  });

  test('shows the full Character Sheet portrait when the stage exceeds thumbnail size', async ({
    page,
  }) => {
    const pick = new PickYourKidPage(page);
    await page.setViewportSize({ width: 1440, height: 960 });
    await pick.open();
    for (const [name] of KIDS) {
      await pick.choose(name);
      await expect(pick.stagePicture).toHaveJSProperty(
        'currentSrc',
        new URL('/img/kid-' + name.toLowerCase() + '-stage.jpg', page.url()).href,
      );
    }
  });

  test('gives a nickname from the lists, rolls a different one, and has no field to type in', async ({
    page,
  }) => {
    // Given Pick Your Kid for a child with no nickname
    const pick = new PickYourKidPage(page);
    await pick.open();

    // Then a nickname of one adjective and one animal is shown
    await expect(pick.nickname).toHaveText(A_NICKNAME);
    // And nothing on the screen takes typing
    await expect(pick.typingFields).toHaveCount(0);

    for (let roll = 0; roll < 5; roll += 1) {
      const before = (await pick.nickname.textContent())?.trim() ?? '';

      // When the child chooses "New name"
      await pick.chooseNewName();

      // Then a different nickname from the same lists is shown
      await expect(pick.nickname).toHaveText(A_NICKNAME);
      await expect(pick.nickname).not.toHaveText(before);
    }
  });

  test('confirming keeps the kid and nickname on the device and opens Solo Or Friends', async ({
    page,
    device,
  }) => {
    // Given a child picks Milo on Pick Your Kid
    const home = new HomePage(page);
    await home.open();
    await home.choosePlay();
    const pick = new PickYourKidPage(page);
    await pick.choose('Milo');
    const nickname = (await pick.nickname.textContent())?.trim() ?? '';

    // When the child confirms
    await pick.confirmKid();

    // Then Solo Or Friends opens
    const solo = new SoloOrFriendsPage(page);
    await expect(solo.heading).toHaveText('Who’s playing?');
    await expect(page).toHaveURL(/\/play$/);

    // And the device keeps the kid and the nickname, as list indexes, and nothing else
    expect(await device.kept()).toEqual({ version: 1, kid: 'milo', nickname: indexesOf(nickname) });
    expect(await device.keys()).toEqual(['atw.player']);

    // And Back from Solo Or Friends opens Pick Your Kid with Milo still chosen
    await solo.goBack();
    await expect(pick.chosenKid).toHaveText('Milo');
    await expect(pick.nickname).toHaveText(nickname);
  });

  test('a kid chosen and a name rolled, then left, keep nothing', async ({ page, device }) => {
    // Given a child who has picked no kid chooses Pip and rolls a name, then goes Back
    const pick = new PickYourKidPage(page);
    await pick.open();
    await pick.choose('Pip');
    await pick.chooseNewName();
    await pick.goBack();

    // Then nothing is kept and Home still offers no kid
    const home = new HomePage(page);
    await expect(home.noNamesLine).toBeVisible();
    expect(await device.kept()).toBeNull();
  });
});

test.describe('Coming back', () => {
  test('Home shows the kept kid and nickname; Play skips Pick Your Kid and Change kid opens it', async ({
    page,
    device,
  }) => {
    // Given a child picked Kenji and confirmed, then closed the game
    const home = new HomePage(page);
    await home.open();
    await home.choosePlay();
    const pick = new PickYourKidPage(page);
    await pick.choose('Kenji');
    const nickname = (await pick.nickname.textContent())?.trim() ?? '';
    await pick.confirmKid();
    await expect(page).toHaveURL(/\/play$/);

    // When they open the game again
    await page.reload();
    await home.open();

    // Then Home shows their nickname and kid, with "Change kid"
    await expect(home.kidChipName).toHaveText(`${nickname} as Kenji`);
    await expect(home.changeKid).toHaveText('Change kid');
    await expect(home.noNamesLine).toHaveCount(0);
    await expect(home.play).toHaveText('Play');

    // And Play leads straight on to Solo Or Friends
    await home.choosePlay();
    await expect(new SoloOrFriendsPage(page).heading).toHaveText('Who’s playing?');

    // And "Change kid" opens Pick Your Kid with Kenji chosen and the same nickname
    await home.open();
    await home.chooseChangeKid();
    await expect(pick.chosenKid).toHaveText('Kenji');
    await expect(pick.nickname).toHaveText(nickname);
    expect((await device.kept())?.kid).toBe('kenji');
  });

  test('a kept nickname that is not from the lists is replaced with a new one', async ({
    page,
    device,
  }) => {
    // Given the device keeps Nia with a nickname that is not one adjective and one animal
    await device.keeps({ version: 1, kid: 'nia', nickname: { adjective: 42, animal: 3 } });

    // When the game opens
    const home = new HomePage(page);
    await home.open();

    // Then Home shows Nia with a newly generated nickname, and keeps it
    await expect(home.kidChipName).toHaveText(/ as Nia$/);
    const shown = (await home.kidChipName.textContent())?.replace(/ as Nia$/, '').trim() ?? '';
    expect(shown).toMatch(A_NICKNAME);
    expect(await device.kept()).toEqual({ version: 1, kid: 'nia', nickname: indexesOf(shown) });
  });

  for (const [what, setUp] of [
    ['unreadable', (device) => device.keeps('{this is not a record')],
    ['unavailable', (device) => device.storageUnavailable()],
  ] as const satisfies readonly (readonly [string, (device: FakeDevice) => Promise<void>])[]) {
    test(`a storage that is ${what} starts with the defaults and shows no error`, async ({
      page,
      device,
    }) => {
      // Given the device's storage is unavailable or its content unreadable
      await setUp(device);

      // When the game opens
      const home = new HomePage(page);
      await home.open();

      // Then Home starts as for a new child, with no error
      await expect(home.noNamesLine).toBeVisible();
      await home.choosePlay();
      const pick = new PickYourKidPage(page);
      await expect(pick.chosenKid).toHaveText('Zuri');
      await expect(pick.picturesAlert).toHaveCount(0);

      // And the child can still pick a kid and play
      await pick.confirmKid();
      await expect(new SoloOrFriendsPage(page).heading).toHaveText('Who’s playing?');
    });
  }
});

test.describe('While the pictures arrive, and when they cannot', () => {
  test('Pick Your Kid shows skeletons and "Getting the kids…" until the pictures arrive', async ({
    page,
    pictures,
  }) => {
    // Given the kids' pictures are slow to arrive
    const release = pictures.holdBack(KID_PICTURES);
    const pick = new PickYourKidPage(page);
    await pick.open();

    // Then a status says so, and the confirm button waits
    await expect(pick.status).toHaveText('Getting the kids…');
    await expect(pick.confirm).toHaveText('I’m ready!');
    await expect(pick.confirm).toBeDisabled();
    await expect(pick.roster).toHaveCount(0);

    // When the pictures arrive
    release();

    // Then the kids are offered
    await expect(pick.chosenKid).toHaveText('Zuri');
    await expect(pick.confirm).toHaveText('I’m Zuri!');
    await expect(pick.kidPictures).toHaveCount(5);
  });

  test('Home shows "Getting your kid…" while the kid arrives, and Play can be chosen meanwhile', async ({
    page,
    device,
    pictures,
  }) => {
    // Given a child who has picked Pip before, and pictures slow to arrive
    await device.keeps({ version: 1, kid: 'pip', nickname: { adjective: 0, animal: 0 } });
    pictures.holdBack(/\/img\/.+\.jpg$/);

    // When Home opens
    const home = new HomePage(page);
    await home.open();

    // Then skeletons in the shape of the kid and the classroom stand in, with a status
    await expect(home.status).toHaveText('Getting your kid…');
    await expect(home.kidChipSkeleton).toBeVisible();
    await expect(home.pictureSkeleton).toBeVisible();

    // And Play can be chosen meanwhile
    await home.choosePlay();
    await expect(new SoloOrFriendsPage(page).heading).toHaveText('Who’s playing?');
  });

  test('pictures that cannot load are drawn instead, and a kid can still be picked', async ({
    page,
    pictures,
    device,
  }) => {
    // Given the kids' pictures cannot load
    const allow = pictures.refuse(KID_PICTURES);
    const pick = new PickYourKidPage(page);
    await pick.open();

    // Then a status says so, and drawn kids stand in
    await expect(pick.picturesAlert).toContainText('The kids’ pictures didn’t load');
    await expect(pick.picturesAlert).toContainText(
      'These little drawings stand in. You can still pick and play.',
    );
    await expect(pick.drawnKids).toHaveCount(5);

    // When the pictures can load again and the child tries again
    allow();
    await pick.tryPicturesAgain.click();

    // Then the pictures are shown and the status goes
    await expect(pick.kidPictures).toHaveCount(5);
    await expect(pick.picturesAlert).toHaveCount(0);

    // And a kid can be picked and confirmed
    await pick.choose('Nia');
    await pick.confirmKid();
    expect((await device.kept())?.kid).toBe('nia');
  });

  test('with the pictures refused, a kid can still be picked and confirmed', async ({
    page,
    pictures,
    device,
  }) => {
    // Given the kids' pictures cannot load, and drawn kids stand in
    pictures.refuse(KID_PICTURES);
    const pick = new PickYourKidPage(page);
    await pick.open();
    await expect(pick.drawnKids).toHaveCount(5);

    // When the child chooses Milo and confirms, without trying the pictures again
    await pick.choose('Milo');
    await expect(pick.stageName).toHaveText('Milo');
    await pick.confirmKid();

    // Then Solo Or Friends opens and Milo is kept
    await expect(new SoloOrFriendsPage(page).heading).toHaveText('Who’s playing?');
    expect((await device.kept())?.kid).toBe('milo');
  });
});

test.describe('At every width', () => {
  for (const [form, width, height, beside] of [
    ['a phone', 360, 780, false],
    ['a tablet', 768, 1024, false],
    ['a laptop', 1280, 800, true],
    ['a large desktop', 1920, 1080, true],
  ] as const) {
    test(`on ${form} the five kids share one row and nothing scrolls sideways`, async ({
      page,
    }) => {
      // Given Pick Your Kid on the form factor
      await page.setViewportSize({ width, height });
      const pick = new PickYourKidPage(page);
      await pick.open();
      await expect(pick.chosenKid).toHaveText('Zuri');

      // Then the kids share one row, the chosen kid is beside them from 992px, and the page
      // does not scroll sideways
      expect(await pick.kidsInOneRow()).toBe(true);
      expect(await pick.stageBesideRoster()).toBe(beside);
      expect(await pick.scrollsSideways()).toBe(false);
    });
  }
});
