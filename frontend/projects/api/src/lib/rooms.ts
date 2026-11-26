import { InjectionToken } from '@angular/core';
import { type GameSetup } from './game-setup';
import { type KidId } from './kid';
import { type Nickname } from './nickname';

/** Whether a room's players are waiting in the Lobby, playing, or on the Podium (ADR 0033). */
export type RoomStatus = 'waiting' | 'playing' | 'over';

/** One player in a room as every player sees them: no connection token (L2-043). */
export interface RoomPlayer {
  readonly id: string;
  readonly kid: KidId;
  readonly nickname: Nickname;
  readonly position: number;
  readonly host: boolean;
}

/** A room as its players see it: the code, the status, the setup and the players (L2-024). */
export interface RoomState {
  readonly code: string;
  readonly status: RoomStatus;
  readonly setup: GameSetup;
  readonly players: readonly RoomPlayer[];
}

/**
 * What a player receives on entering a room: the code, their connection token, their id in
 * the room and the room as it stands. It is held in memory for the visit only; the token is
 * never written to the device (L2-015 criterion 4, docs/adr/0031-making-a-room.md).
 */
export interface RoomEntry {
  readonly code: string;
  readonly token: string;
  readonly playerId: string;
  readonly room: RoomState;
}

/**
 * The codes a screen branches on (L2-054 criterion 1): the backend's own, `backend_unreachable`
 * for a request that got no response, and `unknown` for an answer that is neither.
 */
export type ApiErrorCode =
  | 'backend_unreachable'
  | 'rate_limited'
  | 'invalid_kid'
  | 'invalid_nickname'
  | 'invalid_request'
  | 'no_free_code'
  | 'too_large'
  | 'invalid_code'
  | 'room_not_found'
  | 'room_full'
  | 'game_started'
  | 'not_in_room'
  | 'not_host'
  | 'not_enough_players'
  | 'invalid_setup'
  | 'invalid_answer'
  | 'not_playing'
  | 'not_over'
  | 'unknown';

/** A refusal or a failure of the backend, with the `code` a screen branches on. */
export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode | (string & {}),
    readonly status: number,
  ) {
    super(`The backend refused the request: ${code}`);
    this.name = 'ApiError';
  }
}

/**
 * Rooms over HTTP (docs/detailed-designs/rooms/make-room/, docs/detailed-designs/rooms/join-room/).
 * Each method sends closed values only (L2-040 criterion 1) and rejects with an `ApiError`.
 */
export interface RoomsApi {
  /** Makes a room whose host is the device's player: the kid and the nickname's indexes only. */
  makeRoom(kid: KidId, nickname: Nickname): Promise<RoomEntry>;
  /**
   * Joins the room the code names: the code (4 letters, the one thing a child types), the kid
   * and the nickname's indexes only (L2-023 criterion 3, L2-040 criterion 1).
   */
  joinRoom(code: string, kid: KidId, nickname: Nickname): Promise<RoomEntry>;
}

export const ROOMS_API = new InjectionToken<RoomsApi>('ROOMS_API');
