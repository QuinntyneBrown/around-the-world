import { InjectionToken, type Signal } from '@angular/core';
import { type RoomEntry, type RoomState } from './rooms';

/** Whether the room's connection is opening, live, or lost for good (L2-029 criterion 6). */
export type RoomLink = 'connecting' | 'live' | 'lost';

/**
 * The room the device's player is in, kept up to date over its connection: what the Lobby reads
 * (docs/detailed-designs/rooms/wait-in-lobby/, docs/adr/0032). The room group provides it.
 */
export interface RoomSession {
  /** The code, the player's own id and the token, as the room was entered. */
  readonly entry: RoomEntry;
  /** The room as last received over the connection; null until it first arrives. */
  readonly room: Signal<RoomState | null>;
  readonly link: Signal<RoomLink>;
  /** Connects afresh with the same token after the room was lost ("Try again"). */
  retry(): void;
  /**
   * Leaves the room: tells it, closes the connection and drops it from the visit
   * (L2-030 criterion 8). It never rejects.
   */
  leave(): Promise<void>;
}

export const ROOM_SESSION = new InjectionToken<RoomSession>('ROOM_SESSION');
