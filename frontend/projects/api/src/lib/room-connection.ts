import { InjectionToken } from '@angular/core';
import { type RoomState } from './rooms';

/** What a room's connection tells the game. */
export interface RoomEvents {
  /** The room as it stands: on connecting, and on every change saved since (L2-024 criterion 2). */
  changed(room: RoomState): void;
  /** The connection is gone and could not be got back (L2-029 criterion 6). */
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
  /** Tells the room the player leaves it (L2-025 criterion 5); rejects when it cannot. */
  leave(): Promise<void>;
  /** Closes the connection and removes its handlers (L2-048 criterion 2). It never rejects. */
  close(): Promise<void>;
}

export const ROOM_CONNECTION = new InjectionToken<RoomConnection>('ROOM_CONNECTION');
