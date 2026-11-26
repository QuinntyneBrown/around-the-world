import { expect, test } from '../fixtures/test';
import { LobbyPage } from '../pages/lobby.page';
import { RoomPage } from '../pages/room.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { joinedRoom, player, problem, roomState } from '../support/rooms';

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
