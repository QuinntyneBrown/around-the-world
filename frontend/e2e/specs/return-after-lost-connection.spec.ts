import { type Page } from '@playwright/test';
import {
  expect,
  test,
  type FakeBackend,
  type FakeDevice,
  type FakeRoomHub,
} from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { HomePage } from '../pages/home.page';
import { LobbyPage } from '../pages/lobby.page';
import { PodiumPage } from '../pages/podium.page';
import { WorldMapPage } from '../pages/world-map.page';
import { SoloOrFriendsPage } from '../pages/solo-or-friends.page';
import { gameState, hostOf, madeRoom, player, roomState, type GameOptions } from '../support/rooms';

/**
 * Journey 16: come back after a lost connection (L2-029, L2-043 criterion 4;
 * docs/adr/0036-coming-back-after-a-lost-connection.md,
 * docs/detailed-designs/rooms/return-after-lost-connection/).
 */

// The host, "Speedy Otter" as Zuri, answering with the number pad, travels beside Egypt, desk 2,
// held by "Cosmic Llama" as Nia; "Brave Narwhal" as Pip holds Japan, desk 3.
const ZURI = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  wayOfAnswering: 'numberPad' as const,
};
const MADE = madeRoom('BOLT', ZURI);
const HOST = hostOf(MADE);
const NIA = player(1, 'nia', 8, 4);
const PIP = player(2, 'pip', 5, 5);
const RACE = [HOST, NIA, PIP];

/** The game of the three, as the server sends it, with what the spec says on top. */
const game = (options: Partial<GameOptions> = {}) => gameState({ players: RACE, ...options });

/** The host makes room BOLT, the friends are in, and the first card is dealt. */
async function hostInDuel(
  page: Page,
  device: FakeDevice,
  backend: FakeBackend,
  roomHub: FakeRoomHub,
): Promise<DuelPage> {
  await device.keeps(ZURI);
  backend.answer('POST', '/api/rooms', MADE, 201);
  roomHub.serves(roomState('BOLT', RACE, 'playing'));
  roomHub.game(game());
  const solo = new SoloOrFriendsPage(page);
  await solo.open();
  await solo.chooseMakeRoom();
  const duel = new DuelPage(page);
  await expect(duel.sum).toHaveText('6 × 4');
  return duel;
}

test.describe('Lose the connection and come back', () => {
  test('@critical a lost connection shows "Reconnecting…" over Duel, and coming back within 30 seconds takes back the same spot', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host in a duel at Egypt, on a clock the spec holds
    await clock.hold();
    const duel = await hostInDuel(page, device, backend, roomHub);

    // When the connection is lost
    roomHub.loses();

    // Then Duel says so over everything, as an alert, and the spot is saved (L2-029 criterion 1)
    await expect(duel.overlay).toHaveRole('alert');
    await expect(duel.overlayTitle).toHaveText('Reconnecting…');
    await expect(duel.overlayText).toHaveText(
      'Hang tight! Your spot at Egypt is saved for 30 seconds.',
    );
    // And the screen behind takes no input: the number pad cannot be reached
    await expect(duel.numberPad).toHaveCount(0);

    // When the connection comes back 20 seconds later
    await clock.pass(20_000);
    await expect(duel.overlayTitle).toHaveText('Reconnecting…');
    roomHub.returns();

    // Then the same desk and game are back, and a banner says so (L2-029 2, L2-043 4)
    await expect(duel.overlay).toHaveCount(0);
    await expect(duel.banner).toHaveRole('status');
    await expect(duel.banner).toContainText('You’re back!');
    await expect(duel.banner).toContainText('Same desk, same game.');
    await expect(duel.sum).toHaveText('6 × 4');
    expect(await duel.named(duel.traveller)).toEqual(['You', 'Travelling']);
    await expect(duel.numberPad).toBeVisible();
    // With the same token, the one held in memory (L2-015 criterion 4)
    expect(new Set(roomHub.tokens())).toEqual(new Set([MADE.token]));
    expect(roomHub.tokens().length).toBeGreaterThan(1);

    // And the banner leaves after 4 seconds
    await clock.pass(4_000);
    await expect(duel.banner).toHaveCount(0);
  });

  test('a connection away for 30 seconds loses the game, says it was not the child’s fault, and "Home" opens Home', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host whose connection is lost in a duel
    await clock.hold();
    const duel = await hostInDuel(page, device, backend, roomHub);
    roomHub.loses();
    await expect(duel.overlayTitle).toHaveText('Reconnecting…');

    // When 30 seconds pass without it
    await clock.pass(30_000);

    // Then the game is lost, the device stops trying, and "Home" is offered (L2-029 criterion 4)
    await expect(duel.overlayTitle).toHaveText('We lost the game');
    await expect(duel.overlayText).toHaveText(
      'The connection was away for too long, so your desk was given up. Nothing was your fault.',
    );
    await expect(duel.overlayHome).toBeFocused();
    await expect.poll(() => roomHub.openConnections()).toBe(0);

    // When they choose "Home"
    await duel.overlayHome.click();

    // Then Home opens
    await expect(new HomePage(page).play).toBeVisible();
  });

  test('a token the room no longer knows is refused on coming back, and the game is lost at once', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host whose connection is lost, and whom the room has removed meanwhile
    const duel = await hostInDuel(page, device, backend, roomHub);
    roomHub.loses();
    await expect(duel.overlayTitle).toHaveText('Reconnecting…');
    roomHub.refuses();

    // When the connection comes back
    roomHub.returns();

    // Then the room refuses the token and the game is lost (L2-043 criterion 4)
    await expect(duel.overlayTitle).toHaveText('We lost the game');
    await expect(duel.overlayHome).toBeVisible();
  });

  test('a connection lost on World Map shows "Reconnecting…" on Duel', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host watching the duel's move on World Map, after Cosmic Llama won it
    const duel = await hostInDuel(page, device, backend, roomHub);
    roomHub.game(
      game({
        phase: 'decided',
        traveller: NIA.id,
        travellerDesk: 3,
        desks: [null, HOST.id, PIP.id, 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'],
        duel: { outcome: 'won', winner: 'deskHolder', answer: 24, sinceDecidedMs: 3000 },
        lastMove: {
          kind: 'deskHolderTravels',
          traveller: NIA.id,
          from: 2,
          to: 3,
          passedEmptyDesk: false,
          satDown: HOST.id,
        },
      }),
    );
    await expect(page).toHaveURL(/\/map$/);

    // When the connection is lost
    roomHub.loses();

    // Then Duel opens with "Reconnecting…", naming the desk the host now holds
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.overlayText).toHaveText(
      'Hang tight! Your spot at Egypt is saved for 30 seconds.',
    );
  });

  test('the Lobby keeps the room it showed while it tries, and says it lost the room after 30 seconds', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host in the Lobby with two friends
    await clock.hold();
    await device.keeps(ZURI);
    backend.answer('POST', '/api/rooms', MADE, 201);
    roomHub.serves(roomState('BOLT', RACE));
    const solo = new SoloOrFriendsPage(page);
    await solo.open();
    await solo.chooseMakeRoom();
    const lobby = new LobbyPage(page);
    await expect(lobby.count).toHaveText('3/8');

    // When the connection is lost, the Lobby still shows the room while it tries
    roomHub.loses();
    await clock.pass(29_000);
    await expect(lobby.count).toHaveText('3/8');
    await expect(lobby.lostAlert).toHaveCount(0);

    // When 30 seconds have passed
    await clock.pass(1_000);

    // Then it says the room is lost (L2-029 criterion 6, ADR 0036)
    await expect(lobby.lostAlert).toContainText('We lost the room');
    await expect.poll(() => roomHub.openConnections()).toBe(0);
  });
});

test.describe('What the others see', () => {
  test('a player removed after 30 seconds away is named in a banner, their desk is empty, and the game goes on', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host in a duel at Egypt with Cosmic Llama, and Brave Narwhal at Japan
    await clock.hold();
    const duel = await hostInDuel(page, device, backend, roomHub);

    // When the server removes Brave Narwhal, away for 30 seconds
    const desks = [null, NIA.id, null, 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
    roomHub.changes(roomState('BOLT', [HOST, NIA], 'playing'));
    roomHub.game(game({ desks, removed: [PIP.id] }));

    // Then a banner says so, as a status, and the duel goes on (L2-029 criterion 4)
    await expect(duel.banner).toHaveRole('status');
    await expect(duel.banner).toContainText('Brave Narwhal dropped out.');
    await expect(duel.banner).toContainText('Their desk is empty now.');
    await expect(duel.sum).toHaveText('6 × 4');
    await expect(duel.numberPad).toBeVisible();
    // And the ring no longer draws them (L2-007 criterion 6)
    await expect(duel.ringRacers).toHaveCount(2);

    // And the banner leaves after 4 seconds
    await clock.pass(4_000);
    await expect(duel.banner).toHaveCount(0);
  });

  test('when everyone else has left, a banner says the tour ends and the Podium follows', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given the host in a duel at Egypt with Cosmic Llama and Brave Narwhal
    await clock.hold();
    const duel = await hostInDuel(page, device, backend, roomHub);

    // When both are removed, and the server ends the tour with the host alone
    const desks = [null, null, null, 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
    roomHub.changes(roomState('BOLT', [HOST], 'over'));
    roomHub.game(
      game({
        phase: 'over',
        desks,
        travellerDesk: 4,
        removed: [NIA.id, PIP.id],
        duel: { outcome: 'timedOut', answer: 24 },
        distances: { [HOST.id]: 3, [NIA.id]: 1 },
        stamps: { [HOST.id]: [1, 3, 4] },
        ending: 'everyoneLeft',
        winner: HOST.id,
      }),
    );

    // Then Duel says everyone else has left, as an alert (L2-029 criterion 5)
    await expect(duel.banner).toHaveRole('alert');
    await expect(duel.banner).toContainText('Everyone else has left.');
    await expect(duel.banner).toContainText('The tour ends here. On to the podium!');
    await expect(page).toHaveURL(/\/duel$/);

    // And 3 seconds later the Podium opens: whoever travelled furthest wins (L2-035 criterion 1)
    await clock.pass(3_000);
    const podium = new PodiumPage(page);
    await expect(podium.headline).toHaveText('You travelled furthest!');
    await expect(podium.cheer).toHaveText(
      '3 desks out of 12. Zuri raises her pencil like a knight.',
    );
    await expect(podium.steps).toContainText('Cosmic Llama');
  });

  test('World Map leaves a removed player out of the room and the standings', async ({
    page,
    device,
    backend,
    roomHub,
  }) => {
    // Given the host who won at Egypt, with Brave Narwhal removed meanwhile
    await hostInDuel(page, device, backend, roomHub);
    roomHub.game(
      game({
        phase: 'decided',
        travellerDesk: 4,
        desks: [null, NIA.id, null, 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'],
        removed: [PIP.id],
        duel: { outcome: 'won', winner: 'traveller', answer: 24, sinceDecidedMs: 5000 },
        lastMove: {
          kind: 'hop',
          traveller: HOST.id,
          from: 2,
          to: 4,
          passedEmptyDesk: true,
          satDown: null,
        },
        distances: { [HOST.id]: 2 },
        stamps: { [HOST.id]: [1, 4] },
      }),
    );

    // Then World Map's standings hold the two players still in the room
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.standingsItems).toHaveCount(2);
    await expect(map.standings).not.toContainText('Brave Narwhal');
  });
});

test.describe('A slow connection', () => {
  for (const [form, viewport] of [
    ['a phone', { width: 390, height: 844 }],
    ['a tablet', { width: 768, height: 1024 }],
    ['a desktop', { width: 1440, height: 900 }],
  ] as const) {
    test(`on ${form}, an answer with no reply for 2 seconds shows "Your internet is wobbly." clear of the flash card, until it gets through`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
    }) => {
      // Given the host in a duel, whose answers the room is slow to take
      await page.setViewportSize(viewport);
      await clock.hold();
      const duel = await hostInDuel(page, device, backend, roomHub);
      const through = roomHub.holdBackMethod('SubmitAnswer');

      // When they answer and nothing comes back for 2 seconds
      await duel.answerWithPad(24);
      await clock.pass(1_900);
      await expect(duel.banner).toHaveCount(0);
      await clock.pass(100);

      // Then a banner across the top says so, and does not cover the flash card (L2-029 7)
      await expect(duel.banner).toHaveRole('status');
      await expect(duel.banner).toContainText('Your internet is wobbly.');
      await expect(duel.banner).toContainText('Answers might take a moment.');
      expect(await duel.bannerCoversTheCard()).toBe(false);

      // When the answer gets through, the banner goes
      through();
      await expect(duel.banner).toHaveCount(0);
    });
  }
});
