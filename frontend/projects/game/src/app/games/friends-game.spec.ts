import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ROOM_CONNECTION,
  VISIT,
  type GameSetup,
  type GameState,
  type RoomConnection,
  type RoomEntry,
  type RoomEvents,
  type RoomState,
} from '@atw/api';
import { NicknameGenerator } from '@atw/domain';
import { FriendsGame } from './friends-game';

const ROOM: RoomState = {
  code: 'BOLT',
  status: 'waiting',
  setup: { kinds: ['times'], tables: [2], tourLength: 12, cardSpeed: 'normal' },
  players: [],
};
const ENTRY: RoomEntry = { code: 'BOLT', token: 'token', playerId: 'me', room: ROOM };

/** The device's player travelling against "them" at desk 2, over an open card. */
const GAME: GameState = {
  tourLength: 6,
  secondsToAnswer: 6,
  phase: 'duel',
  firstCardInMs: 0,
  players: [
    { id: 'me', kid: 'zuri', nickname: { adjective: 0, animal: 0 }, distance: 1, stamps: [1] },
    { id: 'them', kid: 'nia', nickname: { adjective: 8, animal: 4 }, distance: 0, stamps: [] },
  ],
  desks: [null, 'them', 'c3', 'c4', 'c5', 'c6'],
  traveller: 'me',
  travellerDesk: 2,
  standings: ['me', 'them'],
  duel: {
    number: 1,
    desk: 2,
    traveller: 'me',
    deskHolder: 'them',
    card: { kind: 'times', left: 6, right: 4 },
    timeLeftMs: 6000,
    travellerFrozenMs: 0,
    deskHolderFrozenMs: 0,
    travellerWrong: null,
    deskHolderWrong: null,
    outcome: 'open',
    winner: null,
    answer: null,
    sinceDecidedMs: 0,
  },
  lastMove: null,
  ending: null,
  winner: null,
};

/** A connection that records what the game asked of it, and tells the room when asked to. */
class FakeConnection implements RoomConnection {
  events: RoomEvents | null = null;
  readonly calls: string[] = [];
  refuse = false;

  async connect(token: string, events: RoomEvents): Promise<void> {
    this.calls.push(`connect ${token}`);
    if (this.refuse) throw new Error('refused');
    this.events = events;
  }

  async saveSetup(setup: GameSetup): Promise<void> {
    this.calls.push(`saveSetup ${setup.tourLength}`);
  }

  async start(): Promise<void> {
    this.calls.push('start');
  }

  async answer(value: number): Promise<void> {
    this.calls.push(`answer ${value}`);
  }

  async sendSticker(sticker: number): Promise<void> {
    this.calls.push(`sendSticker ${sticker}`);
  }

  async playAgain(): Promise<void> {
    this.calls.push('playAgain');
  }

  async leave(): Promise<void> {
    this.calls.push('leave');
  }

  async close(): Promise<void> {
    this.calls.push('close');
  }
}

/** The room's connection and the visit, as the room group gives them (docs/adr/0032, L2-048 2). */
describe('FriendsGame', () => {
  function game() {
    const connection = new FakeConnection();
    const room = signal<RoomEntry | null>(ENTRY);
    const visit = { room, leaveRoom: vi.fn(() => room.set(null)) };
    const group = createEnvironmentInjector(
      [
        FriendsGame,
        { provide: ROOM_CONNECTION, useValue: connection },
        { provide: VISIT, useValue: visit },
        { provide: NicknameGenerator, useValue: new NicknameGenerator() },
      ],
      TestBed.inject(EnvironmentInjector),
    );
    return { friends: group.get(FriendsGame), connection, visit, group };
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve));

  it('connects with the visit’s token and shows each room it is sent', async () => {
    const { friends, connection } = game();
    expect(friends.link()).toBe('connecting');
    expect(friends.room()).toBeNull();
    await settle();
    expect(connection.calls).toEqual(['connect token']);

    connection.events!.changed(ROOM);

    expect(friends.room()).toBe(ROOM);
    expect(friends.link()).toBe('live');
  });

  it('is lost when the connection cannot be opened, or is lost after, and connects again on retry', async () => {
    const { friends, connection } = game();
    await settle();
    connection.events!.lost();
    expect(friends.link()).toBe('lost');

    connection.refuse = true;
    friends.retry();
    expect(friends.link()).toBe('connecting');
    await settle();
    expect(friends.link()).toBe('lost');
    expect(connection.calls).toEqual(['connect token', 'connect token']);
  });

  it('on leave tells the room, closes the connection and drops the room from the visit', async () => {
    const { friends, connection, visit, group } = game();
    await settle();

    await friends.leave();
    group.destroy();

    expect(connection.calls).toEqual(['connect token', 'leave', 'close']);
    expect(visit.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it('when its group is left any other way, tells the room and closes the connection', async () => {
    const { connection, visit, group } = game();
    await settle();

    group.destroy();
    await settle();

    expect(connection.calls).toEqual(['connect token', 'leave', 'close']);
    expect(visit.leaveRoom).toHaveBeenCalledTimes(1);
  });

  it('ignores a room that arrives after it was left', async () => {
    const { friends, connection } = game();
    await settle();
    await friends.leave();

    connection.events!.changed(ROOM);

    expect(friends.room()).toBeNull();
  });

  it('sends an answer as a number only while its card is open and the player is not frozen', async () => {
    const { friends, connection } = game();
    await settle();
    connection.events!.gameChanged(GAME);

    friends.answer(24);
    connection.events!.gameChanged({
      ...GAME,
      duel: { ...GAME.duel!, travellerFrozenMs: 1000, travellerWrong: 23 },
    });
    friends.answer(25);
    connection.events!.gameChanged({
      ...GAME,
      phase: 'timeUp',
      duel: { ...GAME.duel!, outcome: 'timedOut' },
    });
    friends.answer(26);

    expect(connection.calls.filter((call) => call.startsWith('answer'))).toEqual(['answer 24']);
    friends.leave();
  });

  describe('stickers (L2-028 criteria 3 and 7, ADR 0035)', () => {
    const PLAYERS: RoomState = {
      ...ROOM,
      status: 'playing',
      players: [
        { id: 'me', kid: 'zuri', nickname: { adjective: 0, animal: 0 }, position: 0, host: true },
        { id: 'them', kid: 'nia', nickname: { adjective: 8, animal: 4 }, position: 1, host: false },
        { id: 'pip', kid: 'pip', nickname: { adjective: 5, animal: 5 }, position: 2, host: false },
      ],
    };
    /** The duel of "them" and "pip", which the device's player watches. */
    const WATCHED: GameState = {
      ...GAME,
      traveller: 'them',
      duel: { ...GAME.duel!, traveller: 'them', deskHolder: 'pip' },
    };

    async function watching() {
      const made = game();
      await settle();
      made.connection.events!.changed(PLAYERS);
      made.connection.events!.gameChanged(WATCHED);
      return made;
    }

    it('sends a sticker as its id only while the device’s player watches the duel', async () => {
      const { friends, connection } = await watching();
      friends.sendSticker(2);
      connection.events!.gameChanged(GAME);
      friends.sendSticker(3);

      expect(connection.calls.filter((call) => call.startsWith('sendSticker'))).toEqual([
        'sendSticker 2',
      ]);
      friends.leave();
    });

    it('shows each sticker with the sender’s kid and name, "You" for the device’s own', async () => {
      const { friends, connection } = await watching();

      connection.events!.stickerShown({ sticker: 2, from: 'me' });
      connection.events!.stickerShown({ sticker: 5, from: 'pip' });

      expect(friends.stickers().map(({ sticker, kid, from }) => ({ sticker, kid, from }))).toEqual([
        { sticker: 2, kid: 'zuri', from: 'You' },
        {
          sticker: 5,
          kid: 'pip',
          from: new NicknameGenerator().words({ adjective: 5, animal: 5 }),
        },
      ]);
      friends.leave();
    });

    it('shows no sticker from a player not in the room, nor one that is not of the six', async () => {
      const { friends, connection } = await watching();

      connection.events!.stickerShown({ sticker: 2, from: 'someone' });
      connection.events!.stickerShown({ sticker: 7, from: 'pip' });

      expect(friends.stickers()).toEqual([]);
      friends.leave();
    });

    it('shows none before a game is held', async () => {
      const { friends, connection } = game();
      await settle();
      connection.events!.changed(PLAYERS);

      connection.events!.stickerShown({ sticker: 2, from: 'pip' });

      expect(friends.stickers()).toEqual([]);
      friends.leave();
    });
  });

  it('opens Duel for its first card, and the Lobby when "Play again" returns the room to it', async () => {
    const { friends, connection } = game();
    const screens: string[] = [];
    friends.watchScreen((screen) => screens.push(screen));
    await settle();

    connection.events!.gameChanged(GAME);
    connection.events!.gameChanged({ ...GAME, phase: 'over', ending: 'allTheWayRound' });
    connection.events!.changed(ROOM);

    expect(screens).toEqual(['duel', 'lobby']);
    expect(friends.hasGame()).toBe(false);
    friends.leave();
  });
});
