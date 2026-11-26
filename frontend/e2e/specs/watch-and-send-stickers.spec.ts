import { type Page } from '@playwright/test';
import {
  expect,
  test,
  type FakeBackend,
  type FakeDevice,
  type FakeMicrophone,
  type FakeRoomHub,
  type FakeVoice,
} from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { LobbyPage } from '../pages/lobby.page';
import { MicCheckPage } from '../pages/mic-check.page';
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
 * Journey 15: watch a duel and send a sticker (L2-028; docs/adr/0035-watching-a-duel-and-stickers.md,
 * docs/detailed-designs/rooms/watch-duel-and-send-sticker/).
 */

// The host, "Speedy Otter" as Zuri, travels; "Cosmic Llama" as Nia holds Egypt, desk 2.
const HOST = hostOf(madeRoom('BOLT', { kid: 'zuri', nickname: { adjective: 0, animal: 0 } }));
const NIA = player(1, 'nia', 8, 4);
// "Brave Narwhal" as Pip holds Japan, desk 3, and watches the first duel.
const PIP = player(2, 'pip', 5, 5);
const RACE = [HOST, NIA, PIP];
const PIP_RECORD = { version: 1, kid: 'pip', nickname: { adjective: 5, animal: 5 } };

/** The game of the three, as the server sends it, with what the spec says on top. */
const game = (options: Partial<GameOptions> = {}) => gameState({ players: RACE, ...options });

/** Pip joins room BOLT and waits in the Lobby. */
async function pipInLobby(
  page: Page,
  device: FakeDevice,
  backend: FakeBackend,
  roomHub: FakeRoomHub,
  wayOfAnswering: 'voice' | 'numberPad' = 'numberPad',
): Promise<void> {
  await device.keeps({ ...PIP_RECORD, wayOfAnswering });
  backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', RACE, PIP));
  roomHub.serves(roomState('BOLT', RACE));
  const solo = new SoloOrFriendsPage(page);
  await solo.open();
  await solo.joinRoom.click();
  const room = new RoomPage(page);
  await room.type('BOLT');
  await room.chooseJoin();
  await expect(new LobbyPage(page).guestPanel).toContainText('Waiting for Speedy Otter to start…');
}

/** Pip, answering by voice, passes Mic Check as the race starts. */
async function pipPassesMicCheck(
  page: Page,
  roomHub: FakeRoomHub,
  voice: FakeVoice,
  microphone: FakeMicrophone,
): Promise<void> {
  await microphone.grant();
  roomHub.game(game({ phase: 'starting' }));
  const mic = new MicCheckPage(page);
  await expect(page).toHaveURL(/\/mic$/);
  await mic.turnOnMic.click();
  await expect.poll(() => voice.listening()).toBe(1);
  await voice.say('Ready!');
  await mic.letsGo.click();
}

test.describe('Watch a duel', () => {
  test('a player not in the duel watches it on Duel, with no pad and no microphone, and World Map shows the move', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
  }) => {
    // Given Brave Narwhal, who answers by voice, in a race the host and Cosmic Llama duel first
    await clock.hold();
    await pipInLobby(page, device, backend, roomHub, 'voice');
    await pipPassesMicCheck(page, roomHub, voice, microphone);

    // When the server deals the first card to the host and Cosmic Llama
    roomHub.game(game());

    // Then Duel shows the card, who is duelling and the timer bar, and says she is watching
    // (L2-028 criterion 1)
    const duel = new DuelPage(page);
    await expect(page).toHaveURL(/\/duel$/);
    await expect(duel.sum).toHaveText('6 × 4');
    expect(await duel.named(duel.traveller)).toEqual(['Speedy Otter', 'Travelling']);
    expect(await duel.named(duel.deskHolder)).toEqual(['Cosmic Llama', 'Holds Egypt']);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '6 seconds left');
    await expect(duel.result).toHaveText('Watching… your turn is next');
    await expect(duel.announcement).toHaveText(
      'You are watching. Speedy Otter against Cosmic Llama: 6 × 4.',
    );

    // And there is no number pad, no "Shout it!", no switch and no microphone (L2-028 1, L2-011 5)
    await expect(duel.numberPad).toHaveCount(0);
    await expect(duel.shout).toHaveCount(0);
    await expect(duel.switchWay).toHaveCount(0);
    expect(await voice.listening()).toBe(0);
    expect(await microphone.openStreams()).toBe(0);

    // And the timer bar runs down as it does for the players in the duel
    await clock.pass(2000);
    await expect(duel.timerBar).toHaveAttribute('aria-valuetext', '4 seconds left');

    // When the card's time runs out with no right answer, she sees its answer (L2-028 criterion 8)
    roomHub.game(
      game({ phase: 'timeUp', duel: { outcome: 'timedOut', answer: 24, timeLeftMs: 0 } }),
    );
    await expect(duel.result).toContainText('Time’s up! It was 24.');

    // When the server decides the host answered the next card first
    roomHub.game(
      game({
        phase: 'decided',
        travellerDesk: 3,
        duel: {
          number: 2,
          desk: 2,
          deskHolder: NIA.id,
          outcome: 'won',
          winner: 'traveller',
          answer: 24,
        },
        lastMove: {
          kind: 'hop',
          traveller: HOST.id,
          from: 2,
          to: 3,
          passedEmptyDesk: false,
          satDown: null,
        },
        distances: { [HOST.id]: 2 },
      }),
    );

    // Then World Map shows the hop at once (L2-030 criterion 4)
    const map = new WorldMapPage(page);
    await expect(page).toHaveURL(/\/map$/);
    await expect(map.message).toHaveText('Speedy Otter walks on to Japan!');

    // When the next card is dealt to the host at Japan, the desk she holds
    roomHub.game(game({ travellerDesk: 3, duel: { number: 3, desk: 3 } }));

    // Then Duel returns with it, and she is in this duel (L2-030 criterion 4)
    await expect(page).toHaveURL(/\/duel$/);
    expect(await duel.named(duel.deskHolder)).toEqual(['You', 'Holds Japan']);
    await expect(duel.shout).toBeVisible();
    await expect.poll(() => voice.listening()).toBe(1);
  });
});
