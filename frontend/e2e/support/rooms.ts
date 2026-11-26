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
