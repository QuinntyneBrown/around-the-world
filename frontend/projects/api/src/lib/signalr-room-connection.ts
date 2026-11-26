import { Injectable } from '@angular/core';
import type { HubConnection, IRetryPolicy, RetryContext } from '@microsoft/signalr';
import { type GameSetup } from './game-setup';
import { type GameState } from './game-state';
import { type RoomConnection, type RoomEvents } from './room-connection';
import { ApiError, type RoomState } from './rooms';
import { type StickerId, type StickerMessage } from './sticker';

/** Where the room hub is, on the game's own origin (docs/adr/0031-making-a-room.md). */
export const ROOM_HUB_PATH = '/hubs/room';
/** How long a player's spot is held, and so how long the device tries to get back (L2-029). */
export const SPOT_HELD_MS = 30_000;

/**
 * When the client tries to get a lost connection back: at once, after 1 second, then every 2
 * seconds, until 30 seconds have passed since the loss on the device's clock (docs/adr/0036).
 */
export const ROOM_RETRY_POLICY: IRetryPolicy = {
  nextRetryDelayInMilliseconds({ previousRetryCount, elapsedMilliseconds }: RetryContext) {
    if (elapsedMilliseconds >= SPOT_HELD_MS) return null;
    return previousRetryCount === 0 ? 0 : previousRetryCount === 1 ? 1000 : 2000;
  },
};

/**
 * `RoomConnection` over SignalR's WebSockets transport. The SignalR client is imported when
 * the first connection opens, so it is in no initial chunk and a child who plays only solo
 * never downloads it (L2-047 criteria 2 and 3). The token travels as SignalR's access token
 * (docs/adr/0031), the same one on every try to get a lost connection back (docs/adr/0036). The
 * client negotiates first and opens its one WebSocket where the negotiation says: the
 * instance's own, or Azure SignalR Service's in a deployed system (L2-052, docs/adr/0037). The client's logging is off: a lost room is the Lobby's state to show, not
 * an error in the console.
 */
@Injectable()
export class SignalRRoomConnection implements RoomConnection {
  private hub: HubConnection | null = null;

  async connect(token: string, events: RoomEvents): Promise<void> {
    await this.close();
    const signalR = await import('@microsoft/signalr');
    const hub = new signalR.HubConnectionBuilder()
      .withUrl(ROOM_HUB_PATH, {
        accessTokenFactory: () => token,
        transport: signalR.HttpTransportType.WebSockets,
      })
      .withAutomaticReconnect(ROOM_RETRY_POLICY)
      .configureLogging(signalR.LogLevel.None)
      .build();
    hub.on('RoomChanged', (room: RoomState) => events.changed(room));
    hub.on('GameChanged', (game: GameState) => events.gameChanged(game));
    hub.on('StickerShown', (sticker: StickerMessage) => events.stickerShown(sticker));
    hub.onreconnecting(() => {
      if (this.hub === hub) events.reconnecting();
    });
    hub.onreconnected(() => {
      if (this.hub === hub) events.reconnected();
    });
    hub.onclose(() => {
      if (this.hub === hub) events.lost();
    });
    this.hub = hub;
    try {
      await hub.start();
    } catch (failure) {
      if (this.hub === hub) this.hub = null;
      hub.off('RoomChanged');
      hub.off('GameChanged');
      hub.off('StickerShown');
      throw failure;
    }
  }

  saveSetup(setup: GameSetup): Promise<void> {
    const { kinds, tables, tourLength, cardSpeed } = setup;
    return this.invoke('SaveSetup', { kinds, tables, tourLength, cardSpeed });
  }

  start(): Promise<void> {
    return this.invoke('StartGame');
  }

  answer(value: number): Promise<void> {
    return this.invoke('SubmitAnswer', value);
  }

  sendSticker(sticker: StickerId): Promise<void> {
    return this.invoke('SendSticker', sticker);
  }

  playAgain(): Promise<void> {
    return this.invoke('PlayAgain');
  }

  async leave(): Promise<void> {
    if (!this.hub) return;
    await this.hub.invoke('LeaveRoom');
  }

  /**
   * Invokes a hub method, rejecting with an `ApiError` whose `code` is the hub error's, the last
   * word of its message (ADR 0032), or `backend_unreachable` with no connection.
   */
  private async invoke(method: string, ...args: unknown[]): Promise<void> {
    if (!this.hub) throw new ApiError('backend_unreachable', 0);
    try {
      await this.hub.invoke(method, ...args);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : '';
      const code = /HubException: ([a-z_]+)$/.exec(message)?.[1];
      throw new ApiError(code ?? 'backend_unreachable', 0);
    }
  }

  async close(): Promise<void> {
    const hub = this.hub;
    if (!hub) return;
    this.hub = null;
    hub.off('RoomChanged');
    hub.off('GameChanged');
    hub.off('StickerShown');
    try {
      await hub.stop();
    } catch {
      // A connection that will not stop is gone already.
    }
  }
}
