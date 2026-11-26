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
