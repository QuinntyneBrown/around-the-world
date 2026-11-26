/** A room as the backend answers "Make a room" (docs/adr/0031-making-a-room.md). */
export function madeRoom(
  code: string,
  host: { kid: string; nickname: { adjective: number; animal: number } },
) {
  const playerId = '7d1f4a0e-5b8c-4f0e-9b61-1c2d3e4f5a6b';
  return {
    code,
    token: 'tA3pX9-kQ2mZ7vL0sB5nW8rY1cD4fG6hJ_eU0iO2aS4',
    playerId,
    room: {
      code,
      status: 'waiting',
      setup: {
        kinds: ['times'],
        tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
        tourLength: 12,
        cardSpeed: 'normal',
      },
      players: [{ id: playerId, kid: host.kid, nickname: host.nickname, position: 0, host: true }],
    },
  };
}

/** A refusal as the backend writes it: ProblemDetails with a `code` (L2-054 criterion 1). */
export function problem(status: number, code: string, title = 'Refused.') {
  return { type: 'about:blank', title, status, code };
}

/** A player of a room, numbered for a spec: `player(2, 'pip', 5, 5)` is "Brave Narwhal" as Pip. */
export function player(
  place: number,
  kid: string,
  adjective: number,
  animal: number,
  host = false,
) {
  const id = `00000000-0000-4000-8000-${String(place).padStart(12, '0')}`;
  return { id, kid, nickname: { adjective, animal }, position: place, host };
}

/** A player in a room as the backend sends them: an id, a kid, the nickname's indexes, the host mark. */
export type RoomPlayerFixture = ReturnType<typeof player>;

/** A room as the room hub sends it (`RoomChanged`): the code, waiting, the default setup, the players. */
export function roomState(code: string, players: RoomPlayerFixture[], status = 'waiting') {
  return {
    code,
    status,
    setup: {
      kinds: ['times'],
      tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      tourLength: 12,
      cardSpeed: 'normal',
    },
    players,
  };
}

/** What the backend answers a join: the code, the joiner's own token and id, and the room. */
export function joinedRoom(code: string, players: RoomPlayerFixture[], me: RoomPlayerFixture) {
  return {
    code,
    token: 'jN4qR8-wE2tY6uI0oP3aS7dF1gH5jK9lZ_xC4vB8nM2',
    playerId: me.id,
    room: roomState(code, players),
  };
}

/** The host of a room made with `madeRoom`, as the room hub sends them. */
export function hostOf(made: ReturnType<typeof madeRoom>): RoomPlayerFixture {
  return made.room.players[0];
}

/** A player or classmate of a game, as the room hub sends them (`GameChanged`, docs/adr/0033). */
export interface GamePlayerFixture {
  id: string;
  kid: string;
  nickname: { adjective: number; animal: number } | null;
  distance: number;
  stamps: number[];
}

/** A duel of a game, as the room hub sends it: the card without its answer while open. */
export interface GameDuelFixture {
  number: number;
  desk: number;
  traveller: string;
  deskHolder: string;
  card: { kind: string; left: number; right: number };
  timeLeftMs: number;
  travellerFrozenMs: number;
  deskHolderFrozenMs: number;
  travellerWrong: number | null;
  deskHolderWrong: number | null;
  outcome: 'open' | 'won' | 'timedOut';
  winner: 'traveller' | 'deskHolder' | null;
  answer: number | null;
  sinceDecidedMs: number;
}

/** What a spec says of a game; everything else is the start of a race of the players. */
export interface GameOptions {
  players: RoomPlayerFixture[];
  tourLength?: number;
  phase?: 'starting' | 'duel' | 'decided' | 'timeUp' | 'over';
  traveller?: string;
  travellerDesk?: number;
  /** Who sits where, from desk 1; by default the race's start: the first player travels. */
  desks?: (string | null)[];
  duel?: Partial<GameDuelFixture> | null;
  lastMove?: {
    kind: 'hop' | 'deskHolderTravels';
    traveller: string;
    from: number;
    to: number;
    passedEmptyDesk: boolean;
    satDown: string | null;
  } | null;
  distances?: Record<string, number>;
  stamps?: Record<string, number[]>;
  standings?: string[];
  ending?: 'allTheWayRound' | 'timeLimit' | null;
  winner?: string | null;
}

/**
 * A game with friends as the room hub sends it (`GameChanged`): the players at the desks the
 * server seats them (the first travelling from desk 1, the others at desks 2, 3 and on, and
 * classmates `c{n}` at the rest), with what the spec says on top.
 */
export function gameState(options: GameOptions) {
  const tourLength = options.tourLength ?? 12;
  const ids = options.players.map((p) => p.id);
  const desks =
    options.desks ??
    Array.from({ length: tourLength }, (_, index) =>
      index === 0 ? null : (ids[index] ?? `c${index + 1}`),
    );
  const classmates = desks.filter((id): id is string => id !== null && !ids.includes(id));
  const players: GamePlayerFixture[] = [
    ...options.players.map((p, index) => ({
      id: p.id,
      kid: p.kid,
      nickname: p.nickname,
      distance: options.distances?.[p.id] ?? (index === 0 ? 1 : 0),
      stamps: options.stamps?.[p.id] ?? (index === 0 ? [1] : []),
    })),
    ...classmates.map((id) => ({
      id,
      kid: 'classmate',
      nickname: null,
      distance: options.distances?.[id] ?? 0,
      stamps: options.stamps?.[id] ?? [],
    })),
  ];
  const traveller = options.traveller ?? ids[0];
  const travellerDesk = options.travellerDesk ?? 2;
  const duel: GameDuelFixture | null =
    options.duel === null || options.phase === 'starting'
      ? null
      : {
          number: 1,
          desk: travellerDesk,
          traveller,
          deskHolder: desks[travellerDesk - 1] ?? '',
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
          ...options.duel,
        };
  return {
    tourLength,
    secondsToAnswer: 6,
    phase: options.phase ?? 'duel',
    firstCardInMs: options.phase === 'starting' ? 3000 : 0,
    players,
    desks,
    traveller,
    travellerDesk,
    standings:
      options.standings ??
      [...players].sort((one, other) => other.distance - one.distance).map((p) => p.id),
    duel,
    lastMove: options.lastMove ?? null,
    ending: options.ending ?? null,
    winner: options.winner ?? null,
  };
}
