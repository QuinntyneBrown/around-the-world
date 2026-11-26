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
    await expect(duel.useNumberPad).toHaveCount(0);
    await expect(duel.shoutInstead).toHaveCount(0);
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

test.describe('Send a sticker', () => {
  test('@critical a watching player is offered six stickers and nothing else, and the one sent shows for everyone, with "You" on their own device', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given Brave Narwhal watching the host and Cosmic Llama duel
    await clock.hold();
    await pipInLobby(page, device, backend, roomHub);
    roomHub.game(game());
    const duel = new DuelPage(page);
    await expect(duel.result).toHaveText('Watching… your turn is next');

    // Then she is offered the six stickers, one for each kid and Bolt, and nothing else to send
    // (L2-028 criteria 2 and 6)
    await expect(duel.stickers).toHaveText([
      'Go!',
      'Wow!',
      'Nice one',
      'So close',
      'Whoosh!',
      'Beep boop!',
    ]);
    await expect(duel.switchWay).toHaveCount(6);
    await expect(page.getByRole('textbox')).toHaveCount(0);

    // When she sends "Wow!"
    await duel.sendSticker('Wow!');

    // Then the room is sent its id and nothing else (L2-028 criterion 3, L2-040 criterion 1)
    await expect
      .poll(() => roomHub.invocations().at(-1))
      .toEqual({ target: 'SendSticker', args: [2] });

    // When the room sends it to everyone, and a sticker from Cosmic Llama
    roomHub.sticker(2, PIP.id);
    roomHub.sticker(5, NIA.id);

    // Then both show at the edge of Duel with the sender's kid and name, newest at the bottom
    // (L2-028 criteria 3 and 7)
    await expect(duel.stickerRegion).toHaveAttribute('aria-live', 'polite');
    await expect
      .poll(() => duel.shownStickers())
      .toEqual([
        { kid: 'pip', words: 'Wow!', from: 'You' },
        { kid: 'nia', words: 'Whoosh!', from: 'Cosmic Llama' },
      ]);

    // And they are gone after 2 seconds (L2-028 criterion 3)
    await clock.pass(1900);
    await expect(duel.stickerPops).toHaveCount(2);
    await clock.pass(200);
    await expect(duel.stickerPops).toHaveCount(0);
  });

  test('a player in the duel sees the stickers sent, and has none to send', async ({
    page,
    device,
    backend,
    roomHub,
    clock,
  }) => {
    // Given Brave Narwhal holding Japan against the host
    await clock.hold();
    await pipInLobby(page, device, backend, roomHub);
    roomHub.game(game({ travellerDesk: 3 }));
    const duel = new DuelPage(page);
    await expect(duel.numberPad).toBeVisible();

    // Then no sticker is offered (L2-028 criterion 2)
    await expect(duel.stickerBar).toHaveCount(0);

    // When Cosmic Llama, watching, sends "Wow!"
    roomHub.sticker(2, NIA.id);

    // Then it shows with her kid and nickname (L2-028 criterion 3)
    await expect
      .poll(() => duel.shownStickers())
      .toEqual([{ kid: 'nia', words: 'Wow!', from: 'Cosmic Llama' }]);
  });

  for (const [form, viewport] of [
    ['a small phone', { width: 360, height: 640 }],
    ['a phone', { width: 390, height: 844 }],
    ['a tablet', { width: 768, height: 1024 }],
    ['a desktop', { width: 1440, height: 900 }],
  ] as const) {
    test(`on ${form}, stickers arriving close together stack newest at the bottom, three at most, clear of the flash card`, async ({
      page,
      device,
      backend,
      roomHub,
      clock,
    }) => {
      // Given Brave Narwhal watching the host and Cosmic Llama duel
      await page.setViewportSize(viewport);
      await clock.hold();
      await pipInLobby(page, device, backend, roomHub);
      roomHub.game(game());
      const duel = new DuelPage(page);
      await expect(duel.result).toHaveText('Watching… your turn is next');

      // When four stickers arrive close together
      roomHub.sticker(1, PIP.id);
      roomHub.sticker(3, NIA.id);
      await clock.pass(300);
      roomHub.sticker(5, HOST.id);
      roomHub.sticker(6, NIA.id);

      // Then three show, newest at the bottom, and the oldest has left (L2-028 criterion 7)
      await expect
        .poll(() => duel.shownStickers())
        .toEqual([
          { kid: 'nia', words: 'Nice one', from: 'Cosmic Llama' },
          { kid: 'zuri', words: 'Whoosh!', from: 'Speedy Otter' },
          { kid: 'nia', words: 'Beep boop!', from: 'Cosmic Llama' },
        ]);

      // And none covers the flash card
      expect(await duel.stickersCoverTheCard()).toBe(false);

      // And the stickers to send still take a press while stickers show (L2-028 criterion 2)
      await duel.sendSticker('Go!');
      await expect
        .poll(() => roomHub.invocations().at(-1))
        .toEqual({ target: 'SendSticker', args: [1] });
    });
  }
});
