import { expect, test } from '../fixtures/test';
import { LobbyPage } from '../pages/lobby.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { madeRoom } from '../support/rooms';

/**
 * Journey 17: run the backend in a deployed system (L2-052 criteria 1 and 3; docs/adr/0037).
 * The device negotiates with an instance and opens one WebSocket where the negotiation says:
 * the instance's own, or Azure SignalR Service's, which the fixture fakes on localhost.
 */

// Nia, "Cosmic Gecko" (adjective 8, animal 3).
const NIA = { version: 1, kid: 'nia', nickname: { adjective: 8, animal: 3 } };
const ROOMS = '/api/rooms';
const BOLT = madeRoom('BOLT', NIA);

test.describe('Run the backend', () => {
  test('@critical through Azure SignalR Service, the device negotiates with the instance, follows it to the service and opens the Lobby', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a deployed backend whose negotiation sends a device to Azure SignalR Service
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, BOLT, 201);
    roomHub.serves(BOLT.room);
    roomHub.throughService();
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // When the child makes a room
    await solo.chooseMakeRoom();

    // Then the Lobby opens with the room the service's connection carried
    const lobby = new LobbyPage(page);
    await expect(lobby.code).toHaveText('BOLT');
    await expect(lobby.players).toHaveCount(1);

    // And the device negotiated with the instance presenting its connection token, then with
    // the service presenting the service's access token (L2-052 criterion 1)
    expect(roomHub.negotiations()).toEqual([
      { path: '/hubs/room', token: BOLT.token },
      { path: '/service/client', token: 'service-access-token' },
    ]);

    // And its one WebSocket is the service's, by the service's token
    expect(roomHub.tokens()).toEqual(['service-access-token']);
    expect(roomHub.openConnections()).toBe(1);
  });

  test('with no service set, the device negotiates with the instance and opens its WebSocket there', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given a backend with no Azure SignalR Service set (L2-052 criterion 3)
    await device.keeps(NIA);
    backend.answer('POST', ROOMS, BOLT, 201);
    roomHub.serves(BOLT.room);
    const solo = new SoloOrFriendsPage(page);
    await solo.open();

    // When the child makes a room
    await solo.chooseMakeRoom();

    // Then the Lobby opens, and the device negotiated with the instance and connected to it,
    // presenting its connection token both times
    const lobby = new LobbyPage(page);
    await expect(lobby.code).toHaveText('BOLT');
    expect(roomHub.negotiations()).toEqual([{ path: '/hubs/room', token: BOLT.token }]);
    expect(roomHub.tokens()).toEqual([BOLT.token]);
  });
});
