import { type Page } from '@playwright/test';
import {
  expect,
  type FakeBackend,
  type FakeClipboard,
  type FakeClock,
  type FakeDevice,
  type FakeMicrophone,
  type FakeNetwork,
  type FakeRoomHub,
  type FakeVoice,
  type KeptRecord,
} from '../fixtures/test';
import { DuelPage } from '../pages/duel.page';
import { GameSetupPage } from '../pages/game-setup.page';
import { HomePage } from '../pages/home.page';
import { LobbyPage } from '../pages/lobby.page';
import { MicCheckPage } from '../pages/mic-check.page';
import { NoticePage } from '../pages/notice.page';
import { PickYourKidPage } from '../pages/pick-your-kid.page';
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
  problem,
  roomState,
  type GameOptions,
} from './rooms';

/**
 * Every screen, dialog and notification of `docs/mocks/manifest.json` that the game can be
 * brought to, each in the states the sweeps visit (docs/detailed-designs/platform/
 * show-every-screen-to-everyone/, docs/adr/0039). Each state is reached the way a child reaches
 * it, through the page objects and the shared fixture's fakes, so a sweep never puts a selector
 * in a test.
 */

/** The fakes a state needs to be reached. */
export interface ScreenFakes {
  page: Page;
  device: FakeDevice;
  backend: FakeBackend;
  roomHub: FakeRoomHub;
  clock: FakeClock;
  voice: FakeVoice;
  microphone: FakeMicrophone;
  network: FakeNetwork;
  clipboard: FakeClipboard;
}

export interface ScreenState {
  /** The mock it is checked against: `pages/duel/pad`, `dialogs/pause/default`. */
  mock: string;
  /** Duel and World Map fill the viewport's height and never scroll (L2-050). */
  neverScrolls?: boolean;
  /** Brings the game to the state, at whatever size the page has now. */
  reach(fakes: ScreenFakes): Promise<void>;
}

// "Speedy Otter" as Zuri, answering with the number pad, so Mic Check is skipped.
const ZURI: KeptRecord = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
  wayOfAnswering: 'numberPad',
};
// The same child answering by voice.
const ZURI_BY_VOICE: KeptRecord = {
  version: 1,
  kid: 'zuri',
  nickname: { adjective: 0, animal: 0 },
};
const SIX_DESKS: KeptRecord = {
  ...ZURI,
  setup: { kinds: ['times'], tables: [2, 3, 4, 5], tourLength: 6, cardSpeed: 'normal' },
};
const MADE = madeRoom('BOLT', { kid: 'zuri', nickname: { adjective: 0, animal: 0 } });
const HOST = hostOf(MADE);
const NIA = player(1, 'nia', 8, 4);
const PIP = player(2, 'pip', 5, 5);
const RACE = [HOST, NIA, PIP];
const PIP_RECORD: KeptRecord = { ...ZURI, kid: 'pip', nickname: { adjective: 5, animal: 5 } };
const game = (options: Partial<GameOptions> = {}) => gameState({ players: RACE, ...options });

/** The waits after a duel the child wins as the traveller: "You got it!" and the stamp. */
const HOP_MS = 1000 + 1200;
/** How long World Map's message stays. */
const MESSAGE_MS = 1600;

async function soloDuel({ page, device, clock }: ScreenFakes, record = ZURI): Promise<DuelPage> {
  await device.keeps(record);
  await clock.hold();
  const setup = new GameSetupPage(page);
  await setup.open();
  await setup.chooseGo();
  const duel = new DuelPage(page);
  await expect(duel.sum).toHaveText(/\d+ × \d+/);
  return duel;
}

async function winAndHop(page: Page, clock: FakeClock): Promise<void> {
  const duel = new DuelPage(page);
  await expect(duel.answerBox).toHaveText('?');
  const { answer } = await duel.card();
  await duel.answerWithPad(answer);
  await clock.pass(HOP_MS);
  await expect(page).toHaveURL(/\/map$/);
}

async function hostInLobby({ page, device, backend, roomHub }: ScreenFakes): Promise<LobbyPage> {
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

async function hostInDuel(fakes: ScreenFakes): Promise<DuelPage> {
  const { page, device, backend, roomHub, clock } = fakes;
  await clock.hold();
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

async function pipWatching(fakes: ScreenFakes): Promise<DuelPage> {
  const { page, device, backend, roomHub, clock } = fakes;
  await clock.hold();
  await device.keeps(PIP_RECORD);
  backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', RACE, PIP));
  roomHub.serves(roomState('BOLT', RACE, 'playing'));
  roomHub.game(game());
  const room = new RoomPage(page);
  await room.open();
  await room.type('BOLT');
  await room.chooseJoin();
  const duel = new DuelPage(page);
  await expect(duel.result).toHaveText('Watching… your turn is next');
  return duel;
}

export const SCREENS: ScreenState[] = [
  {
    mock: 'pages/home/default',
    async reach({ page, device }) {
      await device.keeps(ZURI);
      const home = new HomePage(page);
      await home.open();
      await expect(home.kidChipName).toBeVisible();
    },
  },
  {
    mock: 'pages/home/empty',
    async reach({ page }) {
      const home = new HomePage(page);
      await home.open();
      await expect(home.play).toBeVisible();
    },
  },
  {
    mock: 'pages/home/muted',
    async reach({ page, device }) {
      await device.keeps({ ...ZURI, soundMuted: true });
      const home = new HomePage(page);
      await home.open();
      await expect(home.sound).toHaveAccessibleName('Turn sound on');
    },
  },
  {
    mock: 'dialogs/settings/default',
    async reach({ page, device }) {
      await device.keeps(ZURI);
      const home = new HomePage(page);
      await home.open();
      await home.settings.click();
      await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    },
  },
  {
    mock: 'pages/pick-your-kid/default',
    async reach({ page }) {
      const kid = new PickYourKidPage(page);
      await kid.open();
      await expect(kid.kids).toHaveCount(5);
    },
  },
  {
    mock: 'pages/solo-or-friends/default',
    async reach({ page, device }) {
      await device.keeps(ZURI);
      const solo = new SoloOrFriendsPage(page);
      await solo.open();
      await expect(solo.modes).toHaveCount(2);
    },
  },
  {
    mock: 'pages/solo-or-friends/offline',
    async reach({ page, device, network }) {
      await device.keeps(ZURI);
      const solo = new SoloOrFriendsPage(page);
      await solo.open();
      await solo.settle();
      await network.offline();
      await expect(solo.offlineBanner).toBeVisible();
    },
  },
  {
    mock: 'pages/solo-or-friends/error',
    async reach({ page, device, backend }) {
      await device.keeps(ZURI);
      backend.answer('POST', '/api/rooms', problem(503, 'no_free_code'), 503);
      const solo = new SoloOrFriendsPage(page);
      await solo.open();
      await solo.chooseMakeRoom();
      await expect(solo.roomAlert).toBeVisible();
    },
  },
  {
    mock: 'pages/room/empty',
    async reach({ page, device }) {
      await device.keeps(ZURI);
      const room = new RoomPage(page);
      await room.open();
      await expect(room.boxes).toHaveCount(4);
    },
  },
  {
    mock: 'pages/room/invalid',
    async reach({ page, device, backend }) {
      await device.keeps(ZURI);
      backend.answer('POST', '/api/rooms/join', problem(404, 'room_not_found'), 404);
      const room = new RoomPage(page);
      await room.open();
      await room.type('BOLD');
      await room.chooseJoin();
      await expect(room.alert).toBeVisible();
    },
  },
  {
    mock: 'pages/lobby/default',
    async reach(fakes) {
      await hostInLobby(fakes);
    },
  },
  {
    mock: 'notifications/lobby-toast/success',
    async reach(fakes) {
      const lobby = await hostInLobby(fakes);
      await lobby.chooseCopyLink();
      await expect(lobby.toast(0).title).toHaveText('Link copied');
    },
  },
  {
    mock: 'pages/lobby/guest',
    async reach({ page, device, backend, roomHub }) {
      await device.keeps(PIP_RECORD);
      backend.answer('POST', '/api/rooms/join', joinedRoom('BOLT', RACE, PIP));
      roomHub.serves(roomState('BOLT', RACE));
      const room = new RoomPage(page);
      await room.open();
      await room.type('BOLT');
      await room.chooseJoin();
      await expect(new LobbyPage(page).guestPanel).toBeVisible();
    },
  },
  {
    mock: 'pages/game-setup/default',
    async reach({ page, device }) {
      await device.keeps(ZURI);
      const setup = new GameSetupPage(page);
      await setup.open();
      await expect(setup.go).toBeVisible();
    },
  },
  {
    mock: 'pages/game-setup/friends',
    async reach(fakes) {
      const lobby = await hostInLobby(fakes);
      await lobby.chooseChange();
      await expect(fakes.page).toHaveURL(/\/setup$/);
      await expect(new GameSetupPage(fakes.page).go).toBeVisible();
    },
  },
  {
    mock: 'pages/mic-check/default',
    async reach({ page, device }) {
      await device.keeps(ZURI_BY_VOICE);
      const setup = new GameSetupPage(page);
      await setup.open();
      await setup.chooseGo();
      await expect(new MicCheckPage(page).turnOnMic).toBeVisible();
    },
  },
  {
    mock: 'pages/duel/default',
    neverScrolls: true,
    async reach(fakes) {
      const { page, voice, microphone } = fakes;
      await fakes.device.keeps(ZURI_BY_VOICE);
      await fakes.clock.hold();
      await microphone.grant();
      const setup = new GameSetupPage(page);
      await setup.open();
      await setup.chooseGo();
      const mic = new MicCheckPage(page);
      await mic.turnOnMic.click();
      await expect.poll(() => voice.listening()).toBe(1);
      await voice.say('Ready!');
      await mic.letsGo.click();
      await expect(new DuelPage(page).shout).toBeVisible();
    },
  },
  {
    mock: 'pages/duel/pad',
    neverScrolls: true,
    async reach(fakes) {
      await soloDuel(fakes);
    },
  },
  {
    mock: 'pages/duel/wrong-pad',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await soloDuel(fakes);
      const { answer } = await duel.card();
      await duel.answerWithPad(answer + 1);
      await expect(duel.result).toContainText('Frozen');
    },
  },
  {
    mock: 'dialogs/pause/default',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await soloDuel(fakes);
      await duel.pause.click();
      await expect(fakes.page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    },
  },
  {
    mock: 'pages/world-map/default',
    neverScrolls: true,
    async reach(fakes) {
      await soloDuel(fakes);
      await winAndHop(fakes.page, fakes.clock);
      await expect(new WorldMapPage(fakes.page).message).toBeVisible();
    },
  },
  {
    mock: 'pages/podium/default',
    async reach(fakes) {
      const { page, clock } = fakes;
      await soloDuel(fakes, SIX_DESKS);
      for (let hop = 1; hop < 6; hop++) {
        await winAndHop(page, clock);
        await clock.pass(MESSAGE_MS);
      }
      await expect(new PodiumPage(page).playAgain).toBeVisible();
    },
  },
  {
    mock: 'pages/duel/friends',
    neverScrolls: true,
    async reach(fakes) {
      await hostInDuel(fakes);
    },
  },
  {
    mock: 'dialogs/leave-game/default',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await hostInDuel(fakes);
      await duel.leave.click();
      await expect(fakes.page.getByRole('dialog', { name: 'Leave the game?' })).toBeVisible();
    },
  },
  {
    mock: 'pages/duel/reconnecting',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await hostInDuel(fakes);
      fakes.roomHub.loses();
      await expect(duel.overlayTitle).toHaveText('Reconnecting…');
    },
  },
  {
    mock: 'notifications/connection-banner/success',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await hostInDuel(fakes);
      fakes.roomHub.loses();
      await expect(duel.overlayTitle).toHaveText('Reconnecting…');
      fakes.roomHub.returns();
      await expect(duel.banner).toContainText('You’re back!');
    },
  },
  {
    mock: 'pages/duel/watching',
    neverScrolls: true,
    async reach(fakes) {
      await pipWatching(fakes);
    },
  },
  {
    mock: 'notifications/sticker/info',
    neverScrolls: true,
    async reach(fakes) {
      const duel = await pipWatching(fakes);
      fakes.roomHub.sticker(1, NIA.id);
      await expect(duel.stickerPops).toHaveCount(1);
    },
  },
  {
    mock: 'pages/not-found/default',
    async reach({ page }) {
      const notice = new NoticePage(page);
      await notice.openNowhere();
      await expect(notice.home).toBeVisible();
    },
  },
];
