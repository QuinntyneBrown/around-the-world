import { createEnvironmentInjector, EnvironmentInjector, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ROOM_CONNECTION,
  VISIT,
  type RoomConnection,
  type RoomEntry,
  type RoomEvents,
  type RoomState,
} from '@atw/api';
import { FriendsGame } from './friends-game';

const ROOM: RoomState = {
  code: 'BOLT',
  status: 'waiting',
  setup: { kinds: ['times'], tables: [2], tourLength: 12, cardSpeed: 'normal' },
  players: [],
};
const ENTRY: RoomEntry = { code: 'BOLT', token: 'token', playerId: 'me', room: ROOM };

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
});
