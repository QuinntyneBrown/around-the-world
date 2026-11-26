import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ROOM_CONNECTION,
  VISIT,
  type GameSetup,
  type RoomEntry,
  type RoomLink,
  type RoomSession,
  type RoomState,
} from '@atw/api';

/**
 * The room the device's player is in, kept up to date over its connection
 * (docs/detailed-designs/rooms/wait-in-lobby/, docs/adr/0032-joining-a-room-and-the-lobby.md).
 * The room group provides it, so it lives as long as the player is in the room: when the group
 * is left any other way than "Leave the room", it tells the room the player left and closes the
 * connection with its handlers (L2-048 criterion 2). Journey 14 makes it the group's
 * `GAME_SESSION` too.
 */
@Injectable()
export class FriendsGame implements RoomSession {
  private readonly visit = inject(VISIT);
  private readonly connection = inject(ROOM_CONNECTION);
  private readonly received = signal<RoomState | null>(null);
  private readonly state = signal<RoomLink>('connecting');
  private gone = false;

  /** The room group matches only while the visit holds a room (docs/adr/0031). */
  readonly entry: RoomEntry = this.visit.room()!;
  readonly room = this.received.asReadonly();
  readonly link = this.state.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.gone) return;
      this.gone = true;
      this.visit.leaveRoom();
      void this.connection
        .leave()
        .catch(() => undefined)
        .finally(() => this.connection.close());
    });
    void this.connect();
  }

  saveSetup(setup: GameSetup): Promise<void> {
    return this.connection.saveSetup(setup);
  }

  retry(): void {
    void this.connect();
  }

  async leave(): Promise<void> {
    if (this.gone) return;
    this.gone = true;
    try {
      await this.connection.leave();
    } catch {
      // A room that cannot be told forgets the player when it is idle (docs/adr/0031).
    }
    await this.connection.close();
    this.visit.leaveRoom();
  }

  private async connect(): Promise<void> {
    this.state.set('connecting');
    try {
      await this.connection.connect(this.entry.token, {
        changed: (room) => {
          if (this.gone) return;
          this.received.set(room);
          this.state.set('live');
        },
        lost: () => {
          if (!this.gone) this.state.set('lost');
        },
      });
    } catch {
      if (!this.gone) this.state.set('lost');
    }
  }
}
