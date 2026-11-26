import { expect, test } from '../fixtures/test';
import { HomePage } from '../pages/home.page';
import { LobbyPage } from '../pages/lobby.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { madeRoom } from '../support/rooms';

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
});
