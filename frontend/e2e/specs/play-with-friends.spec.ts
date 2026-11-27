import { type Page } from '@playwright/test';
import {
  expect,
  test,
  type FakeBackend,
  type FakeDevice,
  type FakeRoomHub,
  type KeptRecord,
} from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { LeaveGameDialog } from '../pages/leave-game.dialog';
import { LobbyPage } from '../pages/lobby.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { PodiumPage } from '../pages/podium.page';
import { RoomPage } from '../pages/room.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { WorldMapPage } from '../pages/world-map.page';
import {
  gameState,
  hostOf,
  joinedRoom,
  madeRoom,
  player,
  roomState,
  type GameOptions,
} from '../support/rooms';

/**
 * Journey 14: play a game with friends in real time (L2-018, L2-025, L2-026, L2-027, L2-033,
 * L2-035, L2-040, L2-043; docs/adr/0033-deciding-a-game-on-the-server.md,
 * docs/adr/0034-playing-with-friends-on-the-device.md).
 */

// The host, "Speedy Otter" as Zuri (adjective 0, animal 0), who answers by voice.
const ZURI = { version: 1, kid: 'zuri', nickname: { adjective: 0, animal: 0 } };
const MADE = madeRoom('BOLT', ZURI);
const HOST = hostOf(MADE);
// "Cosmic Llama" as Nia joined first.
const NIA = player(1, 'nia', 8, 4);
const EDITED = {
  kinds: ['times', 'plus', 'minus'],
  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  tourLength: 24,
  cardSpeed: 'normal',
};

/** The host makes room BOLT on Solo Or Friends; a friend is in it already. */
async function hostInLobby(
  page: Page,
  device: FakeDevice,
  backend: FakeBackend,
  roomHub: FakeRoomHub,
  record: KeptRecord = ZURI,
): Promise<LobbyPage> {
  await device.keeps(record);
  backend.answer('POST', '/api/rooms', MADE, 201);
  roomHub.serves(roomState('BOLT', [HOST, NIA]));
  const solo = new SoloOrFriendsPage(page);
  await solo.open();
  await solo.chooseMakeRoom();
  const lobby = new LobbyPage(page);
  await expect(lobby.count).toHaveText('2/8');
  return lobby;
}

test.describe('Set up the race', () => {
  test('the host changes the setup, saves it to the room, and the Lobby shows it', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host in the Lobby with a friend, and a room slow to save
    const lobby = await hostInLobby(page, device, backend, roomHub);
    const release = roomHub.holdBackMethod('SaveSetup');

    // When the host chooses "Change" beside the game's setup
    await lobby.chooseChange();

    // Then Game Setup opens titled "Set up the race" with the room's setup and "Save" (L2-018 5)
    const setup = new GameSetupPage(page);
    await expect(page).toHaveURL(/\/setup$/);
    await expect(setup.heading).toHaveText('Set up the race');
    await expect(setup.go).toHaveText('Save');
    expect(await setup.kindsOnNames()).toEqual(['Times']);
    await expect(setup.tourLengthChosen).toHaveText(/12/);

    // When they turn on Plus and Minus, every table and 24 desks, and choose "Save"
    await setup.kind('Plus').click();
    await setup.kind('Minus').click();
    await setup.all.click();
    await setup.tourLength(24).click();
    await setup.chooseGo();

    // Then, while it is saved, "Save" is busy and no choice can be changed (L2-018 criterion 6)
    await expect(setup.go).toHaveText('Saving…');
    await expect(setup.go).toHaveAttribute('aria-busy', 'true');
    await expect(setup.kind('Divide')).toBeDisabled();
    await expect(setup.tourLength(6)).toBeDisabled();
    await expect(setup.speed('Chill')).toBeDisabled();

    // And the room was sent the setup's values and nothing else (L2-040 criterion 1)
    expect(roomHub.invocations()).toEqual([{ target: 'SaveSetup', args: [EDITED] }]);

    // When the room saves it and tells every player
    roomHub.changes({ ...roomState('BOLT', [HOST, NIA]), setup: EDITED });
    release();

    // Then the Lobby opens and shows the chosen maths and tour (L2-018 criterion 2)
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    await expect(lobby.setupValues).toHaveText(['× + −, ×2 to ×12', '24 desks', 'Shouting it!']);
  });

  test('a setup the room refuses says so, stays open, and "Try again" sends it again', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host on Game Setup, and a room that refuses the setup
    const lobby = await hostInLobby(page, device, backend, roomHub);
    roomHub.refusesMethod('SaveSetup', 'game_started');
    await lobby.chooseChange();
    const setup = new GameSetupPage(page);
    await setup.tourLength(6).click();

    // When they choose "Save"
    await setup.chooseGo();

    // Then an alert says it did not save, the page stays with their choices (L2-018 criterion 7)
    await expect(setup.notSaved).toHaveRole('alert');
    await expect(setup.notSaved).toContainText('That setup didn’t save');
    await expect(setup.notSaved).toContainText(
      'The room still has the setup from before. Try again.',
    );
    await expect(page).toHaveURL(/\/setup$/);
    await expect(setup.go).toHaveText('Save');
    await expect(setup.tourLengthChosen).toHaveText(/6/);

    // When the room takes it after all and they choose "Try again"
    roomHub.acceptsMethod('SaveSetup');
    await setup.tryAgain.click();

    // Then the setup is sent again and the Lobby opens
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    expect(roomHub.invoked()).toEqual(['SaveSetup', 'SaveSetup']);
  });

  test('Back from Game Setup returns to the Lobby without saving', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    const lobby = await hostInLobby(page, device, backend, roomHub);
    await lobby.chooseChange();
    const setup = new GameSetupPage(page);
    await setup.tourLength(24).click();

    await setup.goBack();

    // L2-018 criterion 5, L2-030 criterion 8
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    await expect(lobby.setupValues).toHaveText(['×2 to ×10', '12 desks', 'Shouting it!']);
    expect(roomHub.invoked()).toEqual([]);
  });
});

// The host answers with the number pad, so Mic Check is not shown (L2-012 criterion 13).
const ZURI_PAD = { ...ZURI, wayOfAnswering: 'numberPad' as const };
// Nia, "Cosmic Llama", joining room BOLT, by voice unless a spec says otherwise.
const NIA_RECORD = { version: 1, kid: 'nia', nickname: { adjective: 8, animal: 4 } };
const RACE = [HOST, NIA];
/** The game of host and Nia, as the server sends it, with what the spec says on top. */
const game = (options: Partial<GameOptions> = {}) => gameState({ players: RACE, ...options });
/** The host won the first duel at Egypt and hops on to Japan. */
const HOST_HOPPED = game({
  phase: 'decided',
  travellerDesk: 3,
  duel: { outcome: 'won', winner: 'traveller', answer: 24, desk: 2, deskHolder: NIA.id },
  lastMove: {
    kind: 'hop',
    traveller: HOST.id,
    from: 2,
    to: 3,
    passedEmptyDesk: false,
    satDown: null,
  },
  distances: { [HOST.id]: 2 },
  stamps: { [HOST.id]: [1, 3] },
});

/** Nia joins room BOLT with its code, as journey 13 built it, and waits in the Lobby. */
async function friendInLobby(
  page: Page,
  device: FakeDevice,
  backend: FakeBackend,
  roomHub: FakeRoomHub,
  record: KeptRecord = NIA_RECORD,
): Promise<LobbyPage> {
  await device.keeps(record);
  backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', RACE, NIA));
  roomHub.serves(roomState('BOLT', RACE));
  const solo = new SoloOrFriendsPage(page);
  await solo.open();
  await solo.joinRoom.click();
  const room = new RoomPage(page);
  await room.type('BOLT');
  await room.chooseJoin();
  const lobby = new LobbyPage(page);
  await expect(lobby.guestPanel).toContainText('Waiting for Speedy Otter to start…');
  return lobby;
}

test.describe('Play a race with friends', () => {
  test('@critical the host starts the race, answers a card the server decides, hops on, and ends on the Podium', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host in the Lobby with Cosmic Llama, on a clock the spec holds
    await clock.hold();
    const lobby = await hostInLobby(page, device, backend, roomHub, ZURI_PAD);
    const started = roomHub.holdBackMethod('StartGame');

    // When the host chooses "Start the race"
    await expect(lobby.startHint).toHaveText('2 kids ready');
    await lobby.chooseStartRace();

    // Then it is busy until the game arrives, and the room was asked to start (L2-025 2)
    await expect(lobby.starting).toBeDisabled();
    await expect(lobby.starting).toHaveAttribute('aria-busy', 'true');
    expect(roomHub.invoked()).toEqual(['StartGame']);

    // When the room starts the game
    roomHub.game(game({ phase: 'starting' }));
    started();

    // Then Duel opens, getting the first card ready (L2-025 criterion 6)
    const duel = new DuelPage(page);
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.flashCard).toContainText('Get ready…');

    // When the server deals the first card to everyone
    roomHub.game(game());

    // Then the host duels Cosmic Llama at Egypt, with Leave in place of Pause (L2-033 1, 4 and 6)
    await expect(duel.sum).toHaveText('6 × 4');
    expect(await duel.named(duel.traveller)).toEqual(['You', 'Travelling']);
    expect(await duel.named(duel.deskHolder)).toEqual(['Cosmic Llama', 'Holds Egypt']);
    await expect(duel.leave).toBeVisible();
    await expect(duel.pause).toHaveCount(0);
    await expect(duel.timerBar).toHaveAttribute('aria-valuenow', '6');

    // And its time drains on the device as the server counts it (L2-005 criterion 1)
    await clock.pass(2000);
    await expect(duel.timerBar).toHaveAttribute('aria-valuenow', '4');

    // When the host answers 24 on the number pad
    await duel.answerWithPad(24);

    // Then the room is sent the number and nothing else (L2-026 criterion 1, L2-040 criterion 1)
    await expect
      .poll(() => roomHub.invocations().at(-1))
      .toEqual({ target: 'SubmitAnswer', args: [24] });

    // When the server decides the host answered first
    roomHub.game(HOST_HOPPED);

    // Then "You got it!", the passport stamp for Japan, then World Map with the hop (L2-033 7)
    await expect(duel.result).toContainText('You got it!');
    await clock.pass(1000);
    await expect(duel.stampCountry).toHaveText('Japan');
    await clock.pass(1200);
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.message).toHaveText('You walk on to Japan!');

    // When the server decides the duel that takes the host all the way round
    roomHub.game(
      game({
        phase: 'over',
        travellerDesk: 2,
        duel: {
          number: 12,
          desk: 12,
          deskHolder: 'c12',
          outcome: 'won',
          winner: 'traveller',
          answer: 24,
        },
        lastMove: {
          kind: 'hop',
          traveller: HOST.id,
          from: 12,
          to: 2,
          passedEmptyDesk: true,
          satDown: null,
        },
        distances: { [HOST.id]: 12, [NIA.id]: 1 },
        stamps: { [HOST.id]: [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 2] },
        ending: 'allTheWayRound',
        winner: HOST.id,
      }),
    );

    // Then Duel says so, World Map shows the last hop, and the Podium opens (L2-035 criterion 8)
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.result).toContainText('You got it!');
    await clock.pass(2200);
    await expect(page).toHaveURL(/\/map$/);
    await clock.pass(1600);
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);

    // And the Podium places the players by nickname and says where "Play again" goes (L2-035)
    await expect(podium.headline).toHaveText('You went around the world!');
    expect((await podium.places()).map(({ name }) => name)).toEqual(['You', 'Cosmic Llama']);
    await expect(podium.passportLine).toHaveText('12 of 12 countries · 1st place');
    await expect(podium.backToRoom).toHaveText('Everyone goes back to room BOLT.');

    // When the host chooses "Play again" and the room returns to its Lobby
    await podium.playAgain.click();
    await expect.poll(() => roomHub.invoked().at(-1)).toBe('PlayAgain');
    roomHub.game(null);
    roomHub.changes(roomState('BOLT', RACE));

    // Then the room's Lobby opens, ready for the next race (L2-035 criterion 3)
    await expect(page).toHaveURL(/\/room\/BOLT$/);
    await expect(lobby.startRace).toBeEnabled();
  });

  test('a friend who loses as the desk holder is frozen by the server, sees who answered first, and World Map opens by itself', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given Cosmic Llama, answering with the number pad, holding Egypt against the host
    await clock.hold();
    await friendInLobby(page, device, backend, roomHub, {
      ...NIA_RECORD,
      wayOfAnswering: 'numberPad',
    });
    roomHub.game(game());
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText('6 × 4');
    expect(await duel.named(duel.deskHolder)).toEqual(['You', 'Holds Egypt']);
    expect(await duel.named(duel.traveller)).toEqual(['Speedy Otter', 'Travelling']);

    // When they answer 23 and the server freezes them
    await duel.answerWithPad(23);
    await expect
      .poll(() => roomHub.invocations().at(-1))
      .toEqual({ target: 'SubmitAnswer', args: [23] });
    roomHub.game(
      game({ duel: { timeLeftMs: 5000, deskHolderFrozenMs: 1000, deskHolderWrong: 23 } }),
    );

    // Then the card says so and the pad is disabled for a second (L2-004 criteria 1, 4 and 5)
    await expect(duel.result).toContainText('Not 23! Frozen for a sec…');
    await expect(duel.go).toBeDisabled();
    await clock.pass(1000);
    await expect(duel.go).toBeEnabled();

    // When the server decides the host answered first
    roomHub.game(HOST_HOPPED);

    // Then the card says who answered first, gently, with the quiet pill (L2-033 criterion 11)
    await expect(duel.result).toContainText('Speedy Otter said 24 first. So close!');
    await expect(duel.sitPill).toHaveText('You keep Egypt · Speedy Otter walks on');

    // And World Map opens by itself, for the server does not wait (L2-033 criterion 12)
    await clock.pass(2200);
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.message).toHaveText('Speedy Otter walks on to Japan!');

    // When the host duels a classmate at Japan, Nia not in it
    roomHub.game(game({ travellerDesk: 3, duel: { number: 2, desk: 3, deskHolder: 'c3' } }));

    // Then she watches it on Duel (L2-028 criterion 1, ADR 0035)
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.result).toHaveText('Watching… your turn is next');
  });

  test('a card nobody answers in time shows its answer to the players in the duel', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    await clock.hold();
    await hostInLobby(page, device, backend, roomHub, ZURI_PAD);
    roomHub.game(game());
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText('6 × 4');

    roomHub.game(
      game({ phase: 'timeUp', duel: { outcome: 'timedOut', answer: 24, timeLeftMs: 0 } }),
    );

    // L2-005 criterion 2, L2-026 criterion 6
    await expect(duel.result).toContainText('Time’s up! It was 24.');
    await expect(duel.numberPad).toHaveCount(0);
  });

  test('a friend who answers by voice is shown Mic Check, with no Back, before the race', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given Cosmic Llama in the Lobby, answering by voice
    await friendInLobby(page, device, backend, roomHub);

    // When the host starts the race
    roomHub.game(game({ phase: 'starting' }));

    // Then Mic Check opens on her device, with no way back to a race that has started
    // (L2-012 criterion 9, L2-030 criterion 8)
    const mic = new MicCheckPage(page);
    await expect(page).toHaveURL(/\/mic$/);
    await expect(mic.back).toHaveCount(0);

    // When she chooses to tap her answers instead
    await mic.tapInstead.click();

    // Then Duel opens with the card the server has dealt
    roomHub.game(game());
    await expect(page).toHaveURL(/\/duel$/);
    await expect(new DuelPage(page).sum).toHaveText('6 × 4');
  });

  test('Leave tells the room, closes its connection and opens Home, and Back asks first', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host in a duel
    await hostInLobby(page, device, backend, roomHub, ZURI_PAD);
    roomHub.game(game());
    const duel = new DuelPage(page);
    await expect(duel.sum).toHaveText('6 × 4');

    // When they press the browser's Back
    await page.goBack();

    // Then "Leave the game?" asks first, and the duel stays (L2-030 criterion 8, ADR 0034)
    const leave = new LeaveGameDialog(page);
    await expect(leave.dialog).toBeVisible();
    await expect(page).toHaveURL(/\/duel$/);
    await leave.stay.click();
    await expect(leave.dialog).toHaveCount(0);

    // When they choose Leave, then "Leave"
    await duel.leave.click();
    await expect(leave.dialog).toBeVisible();
    await leave.leave.click();

    // Then the room is told and Home opens with the connection closed (L2-033 4, L2-048 2)
    await expect(new HomePage(page).play).toBeVisible();
    expect(roomHub.invoked()).toContain('LeaveRoom');
    await expect.poll(() => roomHub.openConnections()).toBe(0);
  });

  test('a Podium of two players shows two places, and a room lost on it offers "Play with friends"', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given Cosmic Llama, whose race of 6 desks the host just won
    await clock.hold();
    await friendInLobby(page, device, backend, roomHub, {
      ...NIA_RECORD,
      wayOfAnswering: 'numberPad',
    });
    roomHub.game(
      game({
        tourLength: 6,
        phase: 'over',
        duel: {
          number: 9,
          desk: 6,
          deskHolder: 'c6',
          outcome: 'won',
          winner: 'traveller',
          answer: 24,
        },
        lastMove: {
          kind: 'hop',
          traveller: HOST.id,
          from: 6,
          to: 2,
          passedEmptyDesk: true,
          satDown: null,
        },
        distances: { [HOST.id]: 6, [NIA.id]: 2 },
        stamps: { [HOST.id]: [1, 3, 4, 5, 6, 2], [NIA.id]: [3] },
        ending: 'allTheWayRound',
        winner: HOST.id,
      }),
    );
    await clock.pass(1600);

    // Then the Podium names the host first and shows only the two places (L2-035 criterion 5)
    const podium = new PodiumPage(page);
    await expect(page).toHaveURL(/\/podium$/);
    await expect(podium.headline).toHaveText('Speedy Otter made it round first!');
    expect((await podium.places()).map(({ name }) => name)).toEqual(['Speedy Otter', 'You']);
    await expect(podium.passportLine).toHaveText('1 of 6 countries · 2nd place');

    // When the room's connection is lost for good
    roomHub.drop();

    // Then the Podium says so, keeps the passport and offers "Play with friends" (L2-035 6)
    await expect(podium.lostRoom).toContainText('We lost the room');
    await expect(podium.lostRoom).toContainText('Your passport is safe here.');
    await expect(podium.passport).toBeVisible();
    await expect(podium.playAgain).toHaveCount(0);
    await expect(podium.backToRoom).toHaveCount(0);
    await podium.playWithFriends.click();
    await expect(page).toHaveURL(/\/play$/);
  });
});
