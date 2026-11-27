import { type RoomPlayer, type RoomState } from '@atw/api';
import { keepNewest, lobbyNews, type LobbyMessage } from './lobby-news';

const words = {
  nickname: ({ nickname: { adjective, animal } }: RoomPlayer) => `Nick ${adjective}-${animal}`,
  kidName: (kid: string) => kid.toUpperCase(),
};

function playerOf(id: string, host = false): RoomPlayer {
  return { id, kid: 'pip', nickname: { adjective: 1, animal: 2 }, position: 0, host };
}

function roomOf(...players: RoomPlayer[]): RoomState {
  return {
    code: 'BOLT',
    status: 'waiting',
    setup: { kinds: ['times'], tables: [2], tourLength: 12, cardSpeed: 'normal' },
    players,
  };
}

describe('lobbyNews (L2-024 criterion 6, L2-025 criterion 5)', () => {
  it('says nothing about the first state the Lobby receives', () => {
    expect(lobbyNews(null, roomOf(playerOf('me', true), playerOf('a')), 'me', words)).toEqual([]);
  });

  it('says each player who joined, once', () => {
    const before = roomOf(playerOf('me', true));
    const after = roomOf(playerOf('me', true), playerOf('a'), playerOf('b'));
    expect(lobbyNews(before, after, 'me', words)).toEqual([
      { tone: 'info', heading: 'Nick 1-2 joined', text: 'as PIP' },
      { tone: 'info', heading: 'Nick 1-2 joined', text: 'as PIP' },
    ]);
    expect(lobbyNews(after, after, 'me', words)).toEqual([]);
  });

  it('says nothing when a player leaves', () => {
    const before = roomOf(playerOf('me', true), playerOf('a'));
    expect(lobbyNews(before, roomOf(playerOf('me', true)), 'me', words)).toEqual([]);
  });

  it('never announces the device’s own player joining', () => {
    const before = roomOf(playerOf('host', true));
    expect(lobbyNews(before, roomOf(playerOf('host', true), playerOf('me')), 'me', words)).toEqual(
      [],
    );
  });

  it('tells the device’s own player when they become the host, and only then', () => {
    const before = roomOf(playerOf('host', true), playerOf('me'), playerOf('b'));
    const after = roomOf(playerOf('me', true), playerOf('b'));
    expect(lobbyNews(before, after, 'me', words)).toEqual([
      {
        tone: 'warning',
        heading: 'You’re the host now',
        text: 'The host left. You can start the race.',
      },
    ]);
    expect(lobbyNews(after, after, 'me', words)).toEqual([]);
    expect(lobbyNews(before, after, 'b', words)).toEqual([]);
  });
});

describe('keepNewest', () => {
  const message = (id: number): LobbyMessage => ({
    id,
    tone: 'info',
    heading: `${id}`,
    text: '',
  });

  it.each([
    [[], [1], [1]],
    [[1, 2], [3], [1, 2, 3]],
    [[1, 2, 3], [4], [2, 3, 4]],
    [[1], [2, 3, 4, 5], [3, 4, 5]],
  ])('keeps %j with %j as %j: three at most, the newest at the bottom', (kept, added, shown) => {
    expect(keepNewest(kept.map(message), added.map(message)).map((m) => m.id)).toEqual(shown);
  });
});
