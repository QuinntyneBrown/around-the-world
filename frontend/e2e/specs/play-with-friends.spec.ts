import { type Page } from '@playwright/test';
import {
  expect,
  test,
  type FakeBackend,
  type FakeDevice,
  type FakeRoomHub,
} from '../fixtures/test';
import { GameSetupPage } from '../pages/game-setup.page';
import { LobbyPage } from '../pages/lobby.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { hostOf, madeRoom, player, roomState } from '../support/rooms';

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
): Promise<LobbyPage> {
  await device.keeps(ZURI);
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
