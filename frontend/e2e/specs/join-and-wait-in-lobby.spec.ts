import { type Page } from '@playwright/test';
import {
  expect,
  test,
  type FakeBackend,
  type FakeDevice,
  type FakeRoomHub,
} from '../fixtures/test';
import { HomePage } from '../pages/home.page';
import { LobbyPage } from '../pages/lobby.page';
import { RoomPage } from '../pages/room.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { joinedRoom, madeRoom, player, problem, roomState } from '../support/rooms';

/**
 * Journey 13: join a room and wait in the Lobby (L2-023, L2-024, L2-025 criteria 3 and 5,
 * L2-029 criterion 6, L2-031 criterion 4, L2-038 criterion 4, L2-040, L2-045 criterion 2,
 * L2-048 criterion 2, L2-054; docs/adr/0032-joining-a-room-and-the-lobby.md).
 */

// Kenji, "Turbo Panda" (adjective 9, animal 1), who answers by voice.
const KENJI = { version: 1, kid: 'kenji', nickname: { adjective: 9, animal: 1 } };
const JOIN = '/api/rooms/join';
// The host, "Speedy Otter" as Zuri, and the child joining, "Turbo Panda" as Kenji.
const HOST = player(0, 'zuri', 0, 0, true);
const ME = player(1, 'kenji', 9, 1);

test.describe('Join a room', () => {
  test('@critical a friend types the code read aloud, joins, and waits in the Lobby for the host', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a child who picked Kenji, a room BOLT whose host is Speedy Otter, and a slow join
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('BOLT', [HOST, ME], ME));
    const releaseJoin = backend.holdBack('POST', JOIN);
    roomHub.serves(roomState('BOLT', [HOST, ME]));
    const releaseRoom = roomHub.holdBack();

    // When they choose "Join a room" on Solo Or Friends
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.joinRoom.click();

    // Then Room opens with four empty boxes, the first waiting, and "Join" disabled (L2-023 2)
    const room = new RoomPage(page);
    await expect(page).toHaveURL(/\/room$/);
    await expect(room.heading).toHaveText('Join a room');
    await expect(room.question).toBeVisible();
    await expect(room.field).toBeFocused();
    await expect(room.boxes).toHaveText(['', '', '', '']);
    await expect(room.boxes.nth(0)).toHaveAttribute('data-active', 'true');
    await expect(room.join).toBeDisabled();

    // When they type three letters in lower case
    await room.type('bol');

    // Then the boxes show them as capitals, the fourth is waiting, and "Join" is still disabled
    await expect(room.boxes).toHaveText(['B', 'O', 'L', '']);
    await expect(room.boxes.nth(3)).toHaveAttribute('data-active', 'true');
    await expect(room.join).toBeDisabled();

    // When they type the fourth and choose "Join"
    await room.type('t');
    await expect(room.join).toBeEnabled();
    await room.chooseJoin();

    // Then, while the join is in progress, "Join" is busy and reads "Joining…", the field waits,
    // and Room says it is finding the friends (L2-023 criterion 7)
    await expect(room.join).toHaveText('Joining…');
    await expect(room.join).toHaveAttribute('aria-busy', 'true');
    await expect(room.join).toBeDisabled();
    await expect(room.field).toBeDisabled();
    await expect(room.message).toHaveText('Finding your friends…');
    await expect(room.message).toHaveRole('status');

    // And the backend was sent the code, the kid and the nickname's indexes, nothing else (L2-040 1)
    expect(backend.requests()).toEqual([
      {
        method: 'POST',
        path: JOIN,
        body: { code: 'BOLT', kid: 'kenji', nickname: { adjective: 9, animal: 1 } },
      },
    ]);

    // When the backend admits them
    releaseJoin();

    // Then the Lobby opens while the room arrives over its connection (L2-031 criterion 4)
    const lobby = new LobbyPage(page);
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    await expect(lobby.arriving).toBeAttached();
    await expect(lobby.main).toHaveAttribute('aria-busy', 'true');
    await expect(lobby.skeletons.first()).toBeVisible();

    // When the room arrives
    releaseRoom();

    // Then they see the code, the host and themselves, marked "(you)" (L2-024 criterion 1)
    await expect(lobby.code).toHaveText('BOLT');
    await expect(lobby.count).toHaveText('2/8');
    await expect(lobby.player(0).name).toHaveText('Speedy Otter');
    await expect(lobby.player(0).badge).toHaveText('Host');
    await expect(lobby.player(1).name).toHaveText('Turbo Panda (you)');
    await expect(lobby.player(1).kid).toHaveText('as Kenji');
    await expect(lobby.emptyDesks).toHaveCount(6);

    // And, not being the host, they wait for the host to start, with no start and no change
    // (L2-025 criterion 3)
    await expect(lobby.guestPanel).toContainText('You’re in!');
    await expect(lobby.guestPanel).toContainText('Waiting for Speedy Otter to start…');
    await expect(lobby.startRace).toHaveCount(0);
    await expect(lobby.change).toHaveCount(0);

    // And their connection presented the token the backend gave them, and only that (L2-043 1)
    expect(roomHub.tokens()).toEqual([joinedRoom('BOLT', [HOST, ME], ME).token]);
  });

  test('the code takes letters only, four at most, shown as capitals', async ({ page, device }) => {
    // Given Room
    await device.keeps(KENJI);
    const room = new RoomPage(page);
    await room.open();

    // When the child types digits, signs and more than four letters
    await room.type('b0-o!lTz9');

    // Then only the first four letters are taken, as capitals (L2-023 criterion 1)
    await expect(room.boxes).toHaveText(['B', 'O', 'L', 'T']);
    await expect(room.field).toHaveValue('BOLT');

    // When they rub one out
    await room.erase(1);

    // Then three are left and "Join" is disabled again (L2-023 criterion 2)
    await expect(room.boxes).toHaveText(['B', 'O', 'L', '']);
    await expect(room.join).toBeDisabled();
  });

  test('Back on Room opens Solo Or Friends', async ({ page, device }) => {
    await device.keeps(KENJI);
    const room = new RoomPage(page);
    await room.open();

    await room.goBack();

    // L2-030 criterion 8
    await expect(page).toHaveURL(/\/play$/);
  });

  test('a room’s link opens Room with the code filled in, and Enter joins', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a child who opens the link a friend copied: the Lobby's address
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('MOON', [HOST, ME], ME));
    roomHub.serves(roomState('MOON', [HOST, ME]));
    const room = new RoomPage(page);
    await room.open('MOON');

    // Then Room opens with the code filled in and "Join" ready (L2-024 criterion 4)
    await expect(room.heading).toHaveText('Join a room');
    await expect(room.boxes).toHaveText(['M', 'O', 'O', 'N']);
    await expect(room.join).toBeEnabled();

    // When they press Enter in the field
    await room.field.press('Enter');

    // Then they join and the Lobby opens
    await expect(new LobbyPage(page).code).toHaveText('MOON');
  });
});

test.describe('A code that cannot be joined', () => {
  for (const [refusal, status, code, words] of [
    ['no room has it', 404, 'room_not_found', 'Hmm, no room with that code. Check the letters?'],
    ['the room is full', 409, 'room_full', 'That room is full (8 kids max).'],
    [
      'the game has started',
      409,
      'game_started',
      'That game already started. Ask for the next one!',
    ],
  ] as const) {
    test(`when ${refusal} Room says so, marks the boxes, and the code can be changed`, async ({
      page,
      device,
      backend,
    }) => {
      // Given a code the backend refuses
      await device.keeps(KENJI);
      backend.answer('POST', JOIN, problem(status, code, 'Server words'), status);
      const room = new RoomPage(page);
      await room.open();
      await room.type('BOLD');

      // When the child chooses "Join"
      await room.chooseJoin();

      // Then Room says why as an alert, in its own words and none of the backend's (L2-023 4 to 6)
      await expect(room.alert).toHaveText(words);
      await expect(page.getByText('Server words')).toHaveCount(0);
      await expect(page).toHaveURL(/\/room$/);

      // And the boxes are marked invalid, and the code can still be changed (L2-051 criterion 5)
      await expect(room.field).toHaveAttribute('aria-invalid', 'true');
      await expect(room.field).toBeEnabled();
      await expect(room.join).toBeEnabled();

      // When the child changes the code
      await room.erase(1);
      await room.type('t');

      // Then the refusal is gone
      await expect(room.alert).toHaveCount(0);
      await expect(room.field).not.toHaveAttribute('aria-invalid', 'true');
    });
  }

  test('too many tries tells the child to wait, and "Join" stays disabled', async ({
    page,
    device,
    backend,
  }) => {
    // Given an address that has tried too many codes
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, problem(429, 'rate_limited'), 429);
    const room = new RoomPage(page);
    await room.open();
    await room.type('BOLT');

    // When the child chooses "Join"
    await room.chooseJoin();

    // Then Room tells them to wait a moment, and "Join" is disabled (L2-045 criterion 2)
    await expect(room.alert).toHaveText('That’s a lot of tries! Wait a moment, then try again.');
    await expect(room.join).toBeDisabled();

    // And a new code does not let them try again until Room is opened again (docs/adr/0032)
    await room.erase(1);
    await room.type('D');
    await expect(room.join).toBeDisabled();
    expect(backend.requests()).toHaveLength(1);
  });

  test('when the backend cannot be reached Room says so, the code can be sent again, and Play solo instead opens Game Setup', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a backend that cannot be reached
    await device.keeps(KENJI);
    backend.unreachable('POST', JOIN);
    const room = new RoomPage(page);
    await room.open();
    await room.type('BOLT');

    // When the child chooses "Join"
    await room.chooseJoin();

    // Then Room says so as an alert and offers "Play solo instead" (L2-023 criterion 9)
    await expect(room.alert).toHaveText(
      'We can’t reach the game right now. Check the internet and try again.',
    );
    await expect(room.join).toBeEnabled();
    await expect(room.playSolo).toBeVisible();

    // When the backend is back and the child sends the code again
    backend.answer('POST', JOIN, joinedRoom('BOLT', [HOST, ME], ME));
    roomHub.serves(roomState('BOLT', [HOST, ME]));
    await room.chooseJoin();

    // Then they join
    await expect(new LobbyPage(page).code).toHaveText('BOLT');
  });

  test('"Play solo instead" opens Game Setup', async ({ page, device, backend }) => {
    await device.keeps(KENJI);
    backend.unreachable('POST', JOIN);
    const room = new RoomPage(page);
    await room.open();
    await room.type('BOLT');
    await room.chooseJoin();

    await room.playSolo.click();

    await expect(page).toHaveURL(/\/setup$/);
  });

  for (const [refusal, status, answer] of [
    ['a code Room has no words for', 400, problem(400, 'invalid_code', 'Server detail')],
    ['a failure with no code', 500, { title: 'Internal Server Error', status: 500 }],
  ] as const) {
    test(`${refusal} shows the generic message and none of the backend's words`, async ({
      page,
      device,
      backend,
    }) => {
      await device.keeps(KENJI);
      backend.answer('POST', JOIN, answer, status);
      const room = new RoomPage(page);
      await room.open();
      await room.type('BOLT');

      await room.chooseJoin();

      // L2-054 criterion 2, docs/adr/0032
      await expect(room.alert).toHaveText(
        'Something went wrong on our side. Try again in a moment.',
      );
      await expect(page.getByText(answer.title)).toHaveCount(0);
      await expect(room.join).toBeEnabled();
    });
  }
});

// The host of the Lobby specs: Nia, "Cosmic Gecko", who made room BOLT.
const NIA = { version: 1, kid: 'nia', nickname: { adjective: 8, animal: 3 } };
const NIA_HOST = { ...madeRoom('BOLT', NIA).room.players[0] };
const NARWHAL = player(1, 'pip', 5, 5);
const LLAMA = player(2, 'milo', 8, 4);
const KOALA = player(3, 'kenji', 2, 6);

test.describe('Wait in the Lobby', () => {
  /** Makes room BOLT as Nia and waits in its Lobby, alone. */
  async function hostTheLobby(
    page: Page,
    device: FakeDevice,
    backend: FakeBackend,
    roomHub: FakeRoomHub,
  ): Promise<LobbyPage> {
    await device.keeps(NIA);
    backend.answer('POST', '/api/rooms', madeRoom('BOLT', NIA), 201);
    roomHub.serves(roomState('BOLT', [NIA_HOST]));
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.chooseMakeRoom();
    const lobby = new LobbyPage(page);
    await expect(lobby.count).toHaveText('1/8');
    return lobby;
  }

  test('@critical a friend who joins appears in the Lobby at once, and a passing message says so', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a host alone in the Lobby
    const lobby = await hostTheLobby(page, device, backend, roomHub);
    await expect(lobby.startHint).toHaveText('Waiting for at least one friend…');
    await expect(lobby.toasts).toHaveCount(0);

    // When a friend joins, "Brave Narwhal" as Pip
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL]));

    // Then the Lobby shows them without a reload (L2-024 criterion 2)
    await expect(lobby.count).toHaveText('2/8');
    await expect(lobby.player(1).name).toHaveText('Brave Narwhal');
    await expect(lobby.player(1).kid).toHaveText('as Pip');
    await expect(lobby.emptyDesks).toHaveCount(6);
    await expect(lobby.startHint).toHaveText('2 kids ready');

    // And a passing message says so once, in the messages region (L2-024 criterion 6)
    await expect(lobby.messages).toHaveAttribute('aria-live', 'polite');
    await expect(lobby.toasts).toHaveCount(1);
    await expect(lobby.toast(0).title).toHaveText('Brave Narwhal joined');
    await expect(lobby.toast(0).text).toHaveText('as Pip');
    await expect(lobby.toast(0).box).toHaveRole('status');

    // And it leaves by itself after 4 seconds
    await expect(lobby.toasts).toHaveCount(0, { timeout: 6_000 });
  });

  test('a passing message can be dismissed, and only a join is announced', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a host whose friend just joined
    const lobby = await hostTheLobby(page, device, backend, roomHub);
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL]));
    await expect(lobby.toast(0).title).toHaveText('Brave Narwhal joined');

    // When the host dismisses the message
    await lobby.toast(0).dismiss.click();

    // Then it is gone
    await expect(lobby.toasts).toHaveCount(0);

    // When the friend leaves
    roomHub.changes(roomState('BOLT', [NIA_HOST]));

    // Then the Lobby shows the host alone again, with no message (L2-024 criteria 2 and 6)
    await expect(lobby.count).toHaveText('1/8');
    await expect(lobby.emptyDesks).toHaveCount(7);
    await expect(lobby.startHint).toHaveText('Waiting for at least one friend…');
    await expect(lobby.toasts).toHaveCount(0);
  });

  test('three messages at most are shown, the newest at the bottom', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a host in the Lobby
    const lobby = await hostTheLobby(page, device, backend, roomHub);

    // When three friends join one after another, and the host copies the room's link
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL]));
    await expect(lobby.count).toHaveText('2/8');
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL, LLAMA]));
    await expect(lobby.count).toHaveText('3/8');
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL, LLAMA, KOALA]));
    await expect(lobby.count).toHaveText('4/8');
    await lobby.chooseCopyLink();

    // Then the three newest are shown, the newest at the bottom (L2-024 criterion 6)
    await expect(lobby.toasts.locator('.toast__title')).toHaveText([
      'Cosmic Llama joined',
      'Clever Koala joined',
      'Link copied',
    ]);
  });

  test('"Copy room link" copies the Lobby’s address and says so', async ({
    page,
    device,
    backend,
    roomHub,
    clipboard,
  }) => {
    const lobby = await hostTheLobby(page, device, backend, roomHub);

    await lobby.chooseCopyLink();

    // L2-024 criterion 4: the link is the Lobby's address, which opens Room with the code
    await expect(lobby.toast(0).title).toHaveText('Link copied');
    await expect(lobby.toast(0).text).toHaveText('Send it to a friend to get them in.');
    expect(await clipboard.copied()).toEqual([new URL('/room/BOLT', page.url()).href]);
  });

  test('a link that cannot be copied says to say the code out loud, and stays until dismissed', async ({
    page,
    device,
    backend,
    roomHub,
    clipboard,
  }) => {
    // Given a host in the Lobby whose browser refuses the clipboard
    const lobby = await hostTheLobby(page, device, backend, roomHub);
    await clipboard.refuses();

    // When they copy the room's link, and a friend joins at the same moment
    await lobby.chooseCopyLink();
    roomHub.changes(roomState('BOLT', [NIA_HOST, NARWHAL]));

    // Then an alert says to say the code out loud instead (L2-024 criterion 4)
    const failure = lobby.toasts.filter({ hasText: 'Couldn’t copy the link' });
    await expect(failure).toHaveRole('alert');
    await expect(failure.locator('.toast__text')).toHaveText(
      'Say the code out loud instead: B O L T.',
    );

    // And it is still there once the friend's message has left by itself
    await expect(lobby.toasts.filter({ hasText: 'Brave Narwhal joined' })).toHaveCount(0, {
      timeout: 6_000,
    });
    await expect(failure).toBeVisible();

    // Until it is dismissed
    await failure.getByRole('button', { name: 'Dismiss' }).click();
    await expect(lobby.toasts).toHaveCount(0);
  });

  test('when the host leaves, the friend who joined earliest is told they are the host now', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given Kenji waiting in the Lobby of Speedy Otter's room, with Brave Narwhal who joined later
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('BOLT', [HOST, ME], ME));
    roomHub.serves(roomState('BOLT', [HOST, ME, { ...NARWHAL, position: 2 }]));
    const room = new RoomPage(page);
    await room.open('BOLT');
    await room.chooseJoin();
    const lobby = new LobbyPage(page);
    await expect(lobby.guestPanel).toContainText('Waiting for Speedy Otter to start…');

    // When the host leaves and the room makes Kenji the host
    roomHub.changes(
      roomState('BOLT', [
        { ...ME, host: true },
        { ...NARWHAL, position: 2 },
      ]),
    );

    // Then Kenji is told so, and sees the host's start control (L2-025 criterion 5)
    await expect(lobby.toast(0).title).toHaveText('You’re the host now');
    await expect(lobby.toast(0).text).toHaveText('The host left. You can start the race.');
    await expect(lobby.player(0).badge).toHaveText('Host');
    await expect(lobby.player(0).name).toHaveText('Turbo Panda (you)');
    await expect(lobby.startRace).toBeVisible();
    await expect(lobby.startHint).toHaveText('2 kids ready');
    await expect(lobby.guestPanel).toHaveCount(0);
  });

  test('leaving the Lobby with the browser’s Back tells the room and closes the connection', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    const lobby = await hostTheLobby(page, device, backend, roomHub);
    await expect(lobby.code).toHaveText('BOLT');

    await page.goBack();

    // L2-048 criterion 2, docs/adr/0032
    await expect(page).toHaveURL(/\/play$/);
    await expect.poll(() => roomHub.invoked()).toEqual(['LeaveRoom']);
    await expect.poll(() => roomHub.openConnections()).toBe(0);
  });
});

test.describe('The Lobby’s other states', () => {
  test('a full room shows 8 players and no empty desk, two of the same kid told apart by their nicknames', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a room of 8 in which two players are Nia
    const players = [
      HOST,
      ME,
      player(2, 'nia', 8, 4),
      player(3, 'milo', 7, 3),
      player(4, 'pip', 5, 5),
      player(5, 'nia', 6, 7),
      player(6, 'kenji', 2, 6),
      player(7, 'zuri', 1, 9),
    ];
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('BOLT', players, ME));
    roomHub.serves(roomState('BOLT', players));

    // When Kenji joins it
    const room = new RoomPage(page);
    await room.open('BOLT');
    await room.chooseJoin();

    // Then all 8 are shown and no desk is empty (L2-024 criteria 1 and 3)
    const lobby = new LobbyPage(page);
    await expect(lobby.count).toHaveText('8/8');
    await expect(lobby.count).toHaveAccessibleName('8 of 8 players');
    await expect(lobby.players).toHaveCount(8);
    await expect(lobby.emptyDesks).toHaveCount(0);
    const nias = lobby.players.filter({ hasText: 'as Nia' });
    await expect(nias.locator('.player-card__name')).toHaveText(['Cosmic Llama', 'Zippy Fox']);
  });

  test('when the connection is lost for good the Lobby says so, keeps what it showed, and “Try again” gets back in', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a guest in the Lobby
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('BOLT', [HOST, ME], ME));
    roomHub.serves(roomState('BOLT', [HOST, ME]));
    const room = new RoomPage(page);
    await room.open('BOLT');
    await room.chooseJoin();
    const lobby = new LobbyPage(page);
    await expect(lobby.count).toHaveText('2/8');

    // When the connection is lost and cannot be got back
    roomHub.drop();

    // Then the Lobby says so as an alert in place of the wait, and keeps the room (L2-029 6)
    await expect(lobby.lostAlert).toHaveRole('alert');
    await expect(lobby.lostAlert).toContainText('We lost the room');
    await expect(lobby.lostAlert).toContainText(
      'The connection dropped and we couldn’t get back in.',
    );
    await expect(lobby.guestPanel).toHaveCount(0);
    await expect(lobby.code).toHaveText('BOLT');
    await expect(lobby.count).toHaveText('2/8');

    // When they choose "Try again"
    await lobby.chooseTryAgain();

    // Then they connect afresh with the same token, and wait for the host again
    await expect(lobby.lostAlert).toHaveCount(0);
    await expect(lobby.guestPanel).toContainText('You’re in!');
    expect(roomHub.tokens()).toEqual([
      joinedRoom('BOLT', [HOST, ME], ME).token,
      joinedRoom('BOLT', [HOST, ME], ME).token,
    ]);
  });

  test('a room that no longer holds the player is lost at once, and “Go home” opens Home', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a join whose room refuses the connection, as for a token that names no player
    await device.keeps(KENJI);
    backend.answer('POST', JOIN, joinedRoom('BOLT', [HOST, ME], ME));
    roomHub.refuses();
    const room = new RoomPage(page);
    await room.open('BOLT');

    // When they join
    await room.chooseJoin();

    // Then the Lobby says the room is lost, showing the room as it was joined
    const lobby = new LobbyPage(page);
    await expect(lobby.lostAlert).toContainText('We lost the room');
    await expect(lobby.code).toHaveText('BOLT');

    // When they choose "Go home"
    await lobby.chooseGoHome();

    // Then Home opens
    await expect(new HomePage(page).play).toBeVisible();
  });
});
