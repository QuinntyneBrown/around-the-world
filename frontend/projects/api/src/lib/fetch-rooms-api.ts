import { Injectable } from '@angular/core';
import { type KidId } from './kid';
import { type Nickname } from './nickname';
import { ApiError, type RoomEntry, type RoomsApi } from './rooms';

/** Where the backend's rooms are, on the game's own origin (docs/adr/0031-making-a-room.md). */
export const ROOMS_PATH = '/api/rooms';
/** Where a code is sent to join its room: in the body, never in the address (L2-053 2). */
export const JOIN_ROOM_PATH = '/api/rooms/join';

/**
 * `RoomsApi` over the browser's `fetch`. Angular's `HttpClient` would move about 25 kB of
 * framework code into the initial bundle even when only a lazy route provides it, so the
 * game's few JSON requests use `fetch` (docs/adr/0031-making-a-room.md). The route that needs
 * it provides it.
 */
@Injectable()
export class FetchRoomsApi implements RoomsApi {
  async makeRoom(kid: KidId, nickname: Nickname): Promise<RoomEntry> {
    const body = { kid, nickname: { adjective: nickname.adjective, animal: nickname.animal } };
    return (await send(ROOMS_PATH, body)) as RoomEntry;
  }

  async joinRoom(code: string, kid: KidId, nickname: Nickname): Promise<RoomEntry> {
    const body = {
      code,
      kid,
      nickname: { adjective: nickname.adjective, animal: nickname.animal },
    };
    return (await send(JOIN_ROOM_PATH, body)) as RoomEntry;
  }
}

/** Posts JSON and reads JSON back, or rejects with the `ApiError` a screen branches on. */
async function send(path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError('backend_unreachable', 0);
  }
  const answer = await readJson(response);
  if (!response.ok) throw toApiError(response.status, answer);
  return answer;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * A refusal as the error a screen branches on: a ProblemDetails is its `code`, anything else
 * `unknown` (L2-054 criteria 1 and 2).
 */
export function toApiError(status: number, answer: unknown): ApiError {
  const code: unknown = (answer as { code?: unknown } | null)?.code;
  return new ApiError(typeof code === 'string' && code !== '' ? code : 'unknown', status);
}
