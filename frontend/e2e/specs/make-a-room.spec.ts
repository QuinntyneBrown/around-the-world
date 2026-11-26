import { expect, test } from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { LobbyPage } from '../pages/lobby.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { madeRoom, problem } from '../support/rooms';

/**
 * Journey 12: make a room as host (L2-022, L2-024 criteria 1 and 5, L2-025 criterion 1, L2-040,
 * L2-045, L2-054; docs/adr/0031-making-a-room.md).
 */

// Nia, "Cosmic Gecko" (adjective 8, animal 3), who answers by voice.
const NIA = { version: 1, kid: 'nia', nickname: { adjective: 8, animal: 3 } };
const ROOMS = '/api/rooms';

test.describe('Make a room', () => {
  test('@critical a host makes a room and the Lobby shows its code, the host and seven empty desks', async ({
    page,
    device,
    backend,
  }) => {
    // Given a child who picked Nia, "Cosmic Gecko", and a backend that makes room BOLT
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, madeRoom('BOLT', NIA), 201);
    const release = backend.holdBack('POST', ROOMS);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // When the child chooses "Make a room"
    await solo.chooseMakeRoom();

    // Then, while the room is made, "Make a room" is busy and reads "Making…", and "Join a room"
    // is disabled (L2-022 criterion 5)
    await expect(solo.makeRoom).toHaveText('Making…');
    await expect(solo.makeRoom).toHaveAttribute('aria-busy', 'true');
    await expect(solo.joinRoom).toBeDisabled();
    await expect(solo.playSolo).toBeVisible();

    // And the backend was sent the kid and the nickname's indexes, and nothing else (L2-040 1)
    expect(backend.requests()).toEqual([
      { method: 'POST', path: ROOMS, body: { kid: 'nia', nickname: { adjective: 8, animal: 3 } } },
    ]);

    // When the room is made
    release();

    // Then the Lobby opens with the code in the largest type (L2-022 1, L2-024 1)
    const lobby = new LobbyPage(page);
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    await expect(lobby.heading).toHaveText('Room');
    await expect(lobby.code).toHaveText('BOLT');
    await expect(lobby.code).toHaveAccessibleName('B O L T');
    await expect(lobby.codeHint).toHaveText('Say it out loud so friends can type it in.');

    // And the host is the only player, marked "Host" and "(you)", with seven empty desks
    await expect(lobby.classHeading).toBeVisible();
    await expect(lobby.count).toHaveText('1/8');
    await expect(lobby.count).toHaveAccessibleName('1 of 8 players');
    await expect(lobby.players).toHaveCount(1);
    await expect(lobby.player(0).name).toHaveText('Cosmic Gecko (you)');
    await expect(lobby.player(0).kid).toHaveText('as Nia');
    await expect(lobby.player(0).badge).toHaveText('Host');
    await expect(lobby.emptyDesks).toHaveCount(7);
    await expect(lobby.emptyDesks.first()).toHaveText('Empty desk');

    // And "Start the race" is disabled while the host is alone (L2-025 criterion 1)
    await expect(lobby.startRace).toBeDisabled();
    await expect(lobby.startHint).toHaveText('Waiting for at least one friend…');

    // And the room's setup is shown: the default maths and tour, answered by shouting (L2-024 5)
    await expect(lobby.setupTerms).toHaveText(['Maths', 'Tour', 'Answer by']);
    await expect(lobby.setupValues).toHaveText(['×2 to ×10', '12 desks', 'Shouting it!']);

    // And the connection token is kept nowhere on the device (L2-015 criterion 4)
    expect(JSON.stringify(await device.kept())).not.toContain(madeRoom('BOLT', NIA).token);
  });

  test('a host who answers with the number pad sees it in the Lobby', async ({
    page,
    device,
    backend,
  }) => {
    // Given a child who answers with the number pad
    await device.keeps({ ...NIA, wayOfAnswering: 'numberPad' });
    backend.answer('POST', ROOMS, madeRoom('MOON', NIA), 201);

    // When they make a room
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.chooseMakeRoom();

    // Then the Lobby says so (L2-024 criterion 5, docs/adr/0031)
    const lobby = new LobbyPage(page);
    await expect(lobby.code).toHaveText('MOON');
    await expect(lobby.setupValues).toHaveText(['×2 to ×10', '12 desks', 'The number pad']);
  });

  test('"Leave the room" opens Solo Or Friends, and the room is gone from the visit', async ({
    page,
    device,
    backend,
  }) => {
    // Given a host in the Lobby of room BOLT
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, madeRoom('BOLT', NIA), 201);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.chooseMakeRoom();
    const lobby = new LobbyPage(page);
    await expect(lobby.code).toHaveText('BOLT');

    // When they choose "Leave the room"
    await lobby.chooseLeave();

    // Then Solo Or Friends opens
    await expect(page).toHaveURL(/\/play$/);
    await expect(solo.makeRoom).toHaveText('Make a room');

    // And the browser's Back no longer opens the room, which the visit has dropped: Home opens
    await page.goBack();
    await expect(new HomePage(page).play).toBeVisible();
  });

  test('a reload in the Lobby opens Home, since the room lives only in this visit', async ({
    page,
    device,
    backend,
  }) => {
    // Given a host in the Lobby of room BOLT
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, madeRoom('BOLT', NIA), 201);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.chooseMakeRoom();
    await expect(new LobbyPage(page).code).toHaveText('BOLT');

    // When the page is reloaded
    await page.reload();

    // Then Home opens (L2-030 criterion 7)
    await expect(page).toHaveURL(/\/$/);
    await expect(new HomePage(page).play).toBeVisible();
  });

  test('a rate-limited address is told to wait, "Make a room" stays disabled and Play solo works', async ({
    page,
    device,
    backend,
  }) => {
    // Given a child on Solo Or Friends whose address has made too many rooms
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, problem(429, 'rate_limited'), 429);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // When they choose "Make a room"
    await solo.chooseMakeRoom();

    // Then they stay on Solo Or Friends and are told to wait (L2-022 criterion 4)
    await expect(page).toHaveURL(/\/play$/);
    await expect(solo.roomAlertTitle).toHaveText('Whoa, slow down a moment');
    await expect(solo.roomAlert).toContainText(
      'That’s a lot of rooms! Wait a little, then try again.',
    );

    // And "Make a room" is disabled, and a press asks the backend nothing more
    await expect(solo.makeRoom).toHaveText('Make a room');
    await expect(solo.makeRoom).toBeDisabled();
    expect(backend.requests()).toHaveLength(1);

    // And "Play solo" still works (L2-054 criterion 3)
    await solo.choosePlaySolo();
    await expect(page).toHaveURL(/\/setup$/);

    // And Solo Or Friends opened again offers "Make a room" again (docs/adr/0031)
    await page.goBack();
    await expect(solo.makeRoom).toBeEnabled();
    await expect(solo.roomAlert).toHaveCount(0);
  });

  test('when the backend cannot be reached the child is told, stays, and "Try again" makes the room', async ({
    page,
    device,
    backend,
  }) => {
    // Given a child on Solo Or Friends and a backend that cannot be reached
    await device.keeps(NIA);
    backend.unreachable('POST', ROOMS);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // When they choose "Make a room"
    await solo.chooseMakeRoom();

    // Then they stay and are told the room could not be made (L2-022 criterion 3)
    await expect(solo.roomAlertTitle).toHaveText('We couldn’t make your room');
    await expect(solo.roomAlert).toContainText(
      'Something went wrong on our side. Try again, or play solo while you wait.',
    );
    await expect(page).toHaveURL(/\/play$/);
    await expect(solo.playSolo).toBeVisible();

    // When the backend answers again and they choose "Try again"
    backend.answer('POST', ROOMS, madeRoom('CAKE', NIA), 201);
    await solo.chooseTryAgain();

    // Then the room is made and its Lobby opens
    await expect(new LobbyPage(page).code).toHaveText('CAKE');
    expect(backend.requests()).toHaveLength(2);
  });

  for (const [refusal, status, answer] of [
    ['no free code', 503, problem(503, 'no_free_code', 'No room code is free right now.')],
    ['a code the screen has no words for', 400, problem(400, 'invalid_kid', 'Server detail')],
    ['a failure with no code', 500, { title: 'Internal Server Error', status: 500 }],
  ] as const) {
    test(`${refusal} shows the generic message and none of the backend's words`, async ({
      page,
      device,
      backend,
    }) => {
      // Given the backend refuses to make the room
      await device.keeps(NIA);
      backend.answer('POST', ROOMS, answer, status);
      const solo = new SoloOrFriendsPage(page);
      await solo.open();

      // When the child chooses "Make a room"
      await solo.chooseMakeRoom();

      // Then the generic message is shown, and nothing the backend wrote (L2-054 criterion 2)
      await expect(solo.roomAlertTitle).toHaveText('We couldn’t make your room');
      await expect(solo.tryAgain).toBeVisible();
      await expect(page.getByText(answer.title)).toHaveCount(0);
    });
  }

  test('with no network a banner says so, the friends buttons wait and Play solo works', async ({
    page,
    device,
    network,
  }) => {
    // Given a child on Solo Or Friends who answers with the number pad
    await device.keeps({ ...NIA, wayOfAnswering: 'numberPad' });
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await expect(solo.makeRoom).toBeEnabled();
    await solo.settle();

    // When the device loses its network
    await network.offline();

    // Then a banner says so, as a status (L2-022 criterion 6)
    await expect(solo.offlineBanner).toHaveText('You’re offline. You can still play solo.');
    await expect(solo.offlineBanner).toHaveRole('status');

    // And "Make a room" and "Join a room" are disabled, and the card says why
    await expect(solo.makeRoom).toBeDisabled();
    await expect(solo.joinRoom).toBeDisabled();
    await expect(solo.friendsHint).toHaveText('Playing with friends needs the internet.');

    // When the network comes back
    await network.online();

    // Then the banner goes and "Make a room" is offered again
    await expect(solo.offlineBanner).toHaveCount(0);
    await expect(solo.makeRoom).toBeEnabled();

    // And with no network "Play solo" still opens Game Setup, and "Go!" deals a flash card
    // (L2-054 criterion 3)
    await network.offline();
    await solo.choosePlaySolo();
    await expect(page).toHaveURL(/\/setup$/);
    await new GameSetupPage(page).chooseGo();
    await expect(new DuelPage(page).sum).toHaveText(/\d+ × \d+/);
  });
});
