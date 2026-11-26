import { InjectionToken } from '@angular/core';
import { type GameSetup } from './game-setup';
import { type GameState } from './game-state';
import { type RoomState } from './rooms';
import { type StickerId, type StickerMessage } from './sticker';

/** What a room's connection tells the game. */
export interface RoomEvents {
  /** The room as it stands: on connecting, and on every change saved since (L2-024 criterion 2). */
  changed(room: RoomState): void;
  /** The room's game as it stands: on connecting, and on every change the server decides. */
  gameChanged(game: GameState): void;
  /** A sticker a player of the room sent, as its id and the sender's player id (L2-028 3). */
  stickerShown(sticker: StickerMessage): void;
  /**
   * The connection was lost, and is being tried again with the same token (L2-029 criterion 1,
   * docs/adr/0036); the room and the game arrive again once it is back.
   */
  reconnecting(): void;
  /** The connection is back; the room as it stands follows (L2-029 criterion 2). */
  reconnected(): void;
  /**
   * The connection is gone and could not be got back within 30 seconds, or the room refused the
   * token (L2-029 criteria 4 and 6, L2-043 criterion 4).
   */
  lost(): void;
}

/**
 * The room's one real-time connection, over SignalR (docs/detailed-designs/rooms/wait-in-lobby/,
 * docs/adr/0032-joining-a-room-and-the-lobby.md). It presents the connection token and carries
 * no room's code or id: the room is the one the token names (L2-043).
 */
export interface RoomConnection {
  /**
   * Connects with the token, closing any connection made before, and tells `events` of the
   * room. Rejects when the connection cannot be opened; `lost` is then not called.
   */
  connect(token: string, events: RoomEvents): Promise<void>;
  /**
   * Saves the host's setup to the room: setup values only (L2-018 criterion 2, L2-040
   * criterion 1). Rejects with an `ApiError` holding the hub error's `code`.
   */
  saveSetup(setup: GameSetup): Promise<void>;
  /** The host starts the room's game (L2-025 criterion 2); rejects with an `ApiError`. */
  start(): Promise<void>;
  /** Sends the player's answer, a number and nothing else (L2-026 criterion 1). */
  answer(value: number): Promise<void>;
  /** Sends a sticker as its id and nothing else (L2-028 criterion 3, L2-040 criterion 1). */
  sendSticker(sticker: StickerId): Promise<void>;
  /** "Play again" from the Podium: the room returns to its Lobby (L2-035 criterion 3). */
  playAgain(): Promise<void>;
  /** Tells the room the player leaves it (L2-025 criterion 5); rejects when it cannot. */
  leave(): Promise<void>;
  /** Closes the connection and removes its handlers (L2-048 criterion 2). It never rejects. */
  close(): Promise<void>;
}

export const ROOM_CONNECTION = new InjectionToken<RoomConnection>('ROOM_CONNECTION');
