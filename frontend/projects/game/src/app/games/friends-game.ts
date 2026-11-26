import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ROOM_CONNECTION,
  SPOT_HELD_MS,
  VISIT,
  WAY_OF_ANSWERING,
  type ConnectionNotice,
  type GameConnection,
  type GameMoment,
  type GameScreen,
  type GameSession,
  type GameSetup,
  type GameState,
  type RoomEntry,
  type RoomLink,
  type RoomSession,
  type RoomState,
  type ShownSticker,
  type StickerId,
  type StickerMessage,
  isStickerId,
} from '@atw/api';
import { GameClock, NicknameGenerator, TICK_MS } from '@atw/domain';
import { EVERYONE_LEFT_MS, FriendsView, type Seen } from './friends-view';
import { StickerBuffer, type ReceivedSticker } from './sticker-buffer';

/** How long "You're back!" and "{nickname} dropped out." show (docs/adr/0036). */
export const NOTICE_MS = 4000;

/** How long an answer or a sticker waits for its reply before the connection is slow (ADR 0036). */
export const WOBBLY_MS = 2000;

/**
 * The room the device's player is in, and its game, kept up to date over the room's connection
 * (docs/detailed-designs/rooms/wait-in-lobby/, docs/detailed-designs/rooms/decide-game-on-server/,
 * docs/adr/0032, docs/adr/0034). The room group provides it behind `ROOM_SESSION` and
 * `GAME_SESSION`, so it lives as long as the player is in the room: when the group is left any
 * other way than "Leave", it tells the room the player left and closes the connection with its
 * handlers (L2-048 criterion 2).
 *
 * It decides nothing about the game. It keeps the last `GameState` the server sent, never a list
 * of those before (L2-048 criterion 5), and `FriendsView` turns it into what the screens show; the
 * times left are counted down on the game's clock, ticked every 100 ms while a game is held
 * (docs/adr/0020). An answer goes to the room as a number and nothing else (L2-026, L2-040).
 *
 * When the connection is lost it is tried again with the same token, held in memory only, for 30
 * seconds (docs/adr/0036): meanwhile the game's clock ticks, Duel shows "Reconnecting…" and nothing
 * is sent; the first room state after it is back confirms the return, and at 30 seconds the device
 * gives up and closes the connection. Its banners live on the same clock.
 */
@Injectable()
export class FriendsGame implements RoomSession, GameSession {
  private readonly visit = inject(VISIT);
  private readonly hub = inject(ROOM_CONNECTION);
  private readonly way = inject(WAY_OF_ANSWERING, { optional: true });
  private readonly nicknames = inject(NicknameGenerator);
  private readonly received = signal<RoomState | null>(null);
  private readonly state = signal<RoomLink>('connecting');
  private readonly clock = new GameClock(() => Date.now());
  /** The game as last received, and when on the game's clock. */
  private readonly last = signal<{ game: GameState; atMs: number } | null>(null);
  /** The game's clock, read at each tick. */
  private readonly nowMs = signal(0);
  /** When, after the last decision, the device's player chose the quiet pill. */
  private readonly pillAt = signal<number | null>(null);
  /** Whether the game waits at Mic Check for the device's player (L2-012 criterion 9). */
  private readonly atMicCheck = signal(false);
  private readonly current = signal<GameScreen | null>(null);
  private readonly listeners = new Set<(screen: GameScreen) => void>();
  private readonly momentListeners = new Set<(moment: GameMoment) => void>();
  /** The cards whose moments have been reported, so each is reported once. */
  private reported = { won: 0, stamped: 0 };
  /** The stickers received, at most three (docs/adr/0035). */
  private readonly receivedStickers = signal<readonly ReceivedSticker[]>([]);
  private stickerKey = 0;
  /** When, on the game's clock, the connection was lost; null while it is not being tried again. */
  private lostAtMs: number | null = null;
  /** When the device's player came back within 30 seconds. */
  private readonly backAt = signal<number | null>(null);
  /** The last player removed after 30 seconds away, and when the device learnt of it. */
  private readonly droppedOut = signal<{ nickname: string; atMs: number } | null>(null);
  /** When each answer or sticker still waiting for its reply was sent. */
  private readonly sent = signal<ReadonlyMap<number, number>>(new Map());
  private sentKey = 0;
  private ticking: ReturnType<typeof setInterval> | null = null;
  private gone = false;

  /** The room group matches only while the visit holds a room (docs/adr/0031). */
  readonly entry: RoomEntry = this.visit.room()!;
  readonly room = this.received.asReadonly();
  readonly link = this.state.asReadonly();

  readonly kind = 'friends' as const;
  /** A game with friends never pauses: Leave stands in for Pause (L2-033 criterion 4). */
  readonly paused = signal(false).asReadonly();
  readonly hasGame = computed(() => this.last() !== null);
  readonly setup = computed<GameSetup | null>(() =>
    this.last() ? (this.received()?.setup ?? null) : null,
  );
  readonly screen = this.current.asReadonly();
  private readonly seen = computed<Seen | null>(() => {
    const last = this.last();
    if (!last) return null;
    return {
      state: last.game,
      sinceReceivedMs: Math.max(0, this.nowMs() - last.atMs),
      you: this.entry.playerId,
      pillAtMs: this.pillAt(),
    };
  });
  readonly duel = computed(() => {
    const seen = this.seen();
    return seen ? FriendsView.duel(seen, this.nameOf) : null;
  });
  readonly tour = computed(() => {
    const seen = this.seen();
    return seen ? FriendsView.tour(seen, this.nameOf) : null;
  });
  readonly result = computed(() => {
    const seen = this.seen();
    return seen ? FriendsView.result(seen, this.nameOf) : null;
  });

  /** The device's connection to the room, as the game screens show it (L2-029, ADR 0036). */
  readonly connection = computed<GameConnection>(() => {
    const link = this.state();
    return link === 'reconnecting' ? 'reconnecting' : link === 'lost' ? 'gone' : 'live';
  });

  /**
   * The connection's banner, one at a time and the most urgent first: everyone else has left,
   * a player dropped out, the device's player is back, the connection is slow (ADR 0036).
   */
  readonly notice = computed<ConnectionNotice | null>(() => {
    if (this.connection() !== 'live') return null;
    const now = this.nowMs();
    const seen = this.seen();
    const state = seen?.state;
    if (seen && state?.phase === 'over' && state.ending === 'everyoneLeft') {
      if (FriendsView.sinceDecided(seen) < EVERYONE_LEFT_MS) return { kind: 'everyoneLeft' };
    }
    const dropped = this.droppedOut();
    if (dropped && now - dropped.atMs < NOTICE_MS) {
      return { kind: 'droppedOut', nickname: dropped.nickname };
    }
    const back = this.backAt();
    if (back !== null && now - back < NOTICE_MS) return { kind: 'back' };
    const oldest = Math.min(...this.sent().values());
    return now - oldest >= WOBBLY_MS ? { kind: 'wobbly' } : null;
  });

  /** The stickers showing, each for 2 seconds of the game's clock (L2-028 criteria 3 and 7). */
  readonly stickers = computed<readonly ShownSticker[]>(() =>
    StickerBuffer.showing(this.receivedStickers(), this.nowMs()).map(({ shown }) => shown),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopTicking();
      this.listeners.clear();
      this.momentListeners.clear();
      if (this.gone) return;
      this.gone = true;
      this.visit.leaveRoom();
      void this.hub
        .leave()
        .catch(() => undefined)
        .finally(() => this.hub.close());
    });
    void this.connect();
  }

  saveSetup(setup: GameSetup): Promise<void> {
    return this.hub.saveSetup(setup);
  }

  startRace(): Promise<void> {
    return this.hub.start();
  }

  retry(): void {
    void this.connect();
  }

  async leave(): Promise<void> {
    if (this.gone) return;
    this.gone = true;
    this.stopTicking();
    try {
      await this.hub.leave();
    } catch {
      // A room that cannot be told forgets the player when it is idle (docs/adr/0031).
    }
    await this.hub.close();
    this.visit.leaveRoom();
  }

  /** The host's start comes from the Lobby (`startRace`); the server deals the game. */
  start(): void {
    // A game with friends is started by the host in the Lobby (L2-025 criterion 2).
  }

  /** Sends the answer, a number and nothing else, while the card is open and not frozen. */
  answer(value: number): void {
    const duel = this.duel();
    if (!duel || duel.role === 'watching' || duel.outcome !== 'open' || duel.frozen) return;
    if (this.connection() !== 'live') return;
    this.send(() => this.hub.answer(value));
  }

  /** Sends a sticker as its id, while the device's player watches the duel (L2-028 3). */
  sendSticker(sticker: StickerId): void {
    if (this.duel()?.role !== 'watching' || this.connection() !== 'live') return;
    this.send(() => this.hub.sendSticker(sticker));
  }

  /**
   * Leaving Mic Check opens the screen the game is at by then; the quiet pill after a lost duel
   * opens World Map (L2-012 criterion 9, L2-033 criteria 8 and 12).
   */
  continue(): void {
    if (this.atMicCheck()) {
      this.atMicCheck.set(false);
      this.follow();
      return;
    }
    const seen = this.seen();
    if (seen && this.current() === 'duel' && seen.state.phase !== 'duel') {
      this.pillAt.set(FriendsView.sinceDecided(seen));
      this.follow();
    }
  }

  /** "Play again" on the Podium: the room returns to its Lobby for everyone (L2-035 3). */
  playAgain(): void {
    this.hub.playAgain().catch(() => undefined);
  }

  pause(): void {
    // A game with friends does not stop for one player (L2-033 criterion 4).
  }

  resume(): void {
    // Nothing waits in a game with friends.
  }

  watchScreen(listener: (screen: GameScreen) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  watchMoments(listener: (moment: GameMoment) => void): () => void {
    this.momentListeners.add(listener);
    return () => this.momentListeners.delete(listener);
  }

  private readonly nameOf = (nickname: { adjective: number; animal: number }) =>
    this.nicknames.words(nickname);

  private async connect(): Promise<void> {
    this.state.set('connecting');
    try {
      await this.hub.connect(this.entry.token, {
        changed: (room) => {
          if (this.gone) return;
          this.received.set(room);
          // The first room state after the connection came back confirms the return (L2-029 2).
          if (this.state() === 'reconnecting') this.cameBack();
          this.state.set('live');
          // "Play again" returned the room to its Lobby: the game is dropped (L2-035 3).
          if (room.status === 'waiting' && this.last()?.game.phase === 'over') this.dropGame();
        },
        gameChanged: (game) => {
          if (!this.gone) this.receive(game);
        },
        stickerShown: (sticker) => {
          if (!this.gone) this.showSticker(sticker);
        },
        reconnecting: () => {
          if (!this.gone) this.lostConnection();
        },
        reconnected: () => {
          // The room state that follows confirms the return; until then, it is still away.
        },
        lost: () => {
          if (!this.gone) this.giveUp();
        },
      });
    } catch {
      if (!this.gone) this.state.set('lost');
    }
  }

  /** The connection was lost: it is tried again for 30 seconds, on the game's clock (ADR 0036). */
  private lostConnection(): void {
    this.lostAtMs = this.clock.now();
    this.nowMs.set(this.lostAtMs);
    this.sent.set(new Map());
    this.state.set('reconnecting');
    this.startTicking();
    this.follow();
  }

  /** Back within 30 seconds: "You're back!" shows on the game's clock (L2-029 criterion 2). */
  private cameBack(): void {
    this.lostAtMs = null;
    this.nowMs.set(this.clock.now());
    this.backAt.set(this.clock.now());
    if (!this.last()) this.stopTicking();
  }

  /**
   * The connection could not be got back in 30 seconds, or its token was refused: it is closed,
   * which releases its retry timer and the try in flight (L2-029 criteria 4 and 6, L2-048 2).
   */
  private giveUp(): void {
    this.lostAtMs = null;
    this.state.set('lost');
    void this.hub.close();
    if (!this.last()) this.stopTicking();
    this.follow();
  }

  /** Sends an answer or a sticker, timing its reply: one that takes 2 seconds is slow (ADR 0036). */
  private send(sending: () => Promise<void>): void {
    const key = ++this.sentKey;
    const done = () =>
      this.sent.update((sent) => {
        const left = new Map(sent);
        left.delete(key);
        return left;
      });
    this.sent.update((sent) => new Map(sent).set(key, this.clock.now()));
    sending().then(done, done);
  }

  /** A new state of the game: kept in place of the last, and the screen follows it. */
  private receive(game: GameState): void {
    const before = this.last()?.game;
    if (before) this.noticeRemoved(before, game);
    if (!before) {
      // The first state of a game: Mic Check first when the player needs it (L2-012 9).
      this.atMicCheck.set(this.way?.micCheckNeeded() ?? false);
      this.reported = { won: 0, stamped: 0 };
      this.startTicking();
    }
    if (before?.duel?.number !== game.duel?.number) this.pillAt.set(null);
    this.nowMs.set(this.clock.now());
    this.last.set({ game, atMs: this.clock.now() });
    this.follow();
  }

  /** A player removed after 30 seconds away since the last state: "{nickname} dropped out." */
  private noticeRemoved(before: GameState, game: GameState): void {
    for (const player of game.players) {
      const was = before.players.find(({ id }) => id === player.id);
      if (!player.removed || was?.removed || player.id === this.entry.playerId) continue;
      if (!player.nickname) continue;
      this.droppedOut.set({ nickname: this.nameOf(player.nickname), atMs: this.clock.now() });
    }
  }

  /**
   * A sticker the room sent, shown with the sender's kid and name, "You" for the device's own
   * player; one from a player not in the room, or with no game held, is not shown (ADR 0035).
   */
  private showSticker({ sticker, from }: StickerMessage): void {
    const sender = this.received()?.players.find((player) => player.id === from);
    if (!this.last() || !sender || !isStickerId(sticker)) return;
    const name = from === this.entry.playerId ? 'You' : this.nameOf(sender.nickname);
    const atMs = this.clock.now();
    this.nowMs.set(atMs);
    const shown: ShownSticker = { key: ++this.stickerKey, sticker, kid: sender.kid, from: name };
    this.receivedStickers.update((buffer) => StickerBuffer.add(buffer, { shown, atMs }));
  }

  private dropGame(): void {
    this.stopTicking();
    this.last.set(null);
    this.pillAt.set(null);
    this.receivedStickers.set([]);
    this.atMicCheck.set(false);
    this.show('lobby');
  }

  private startTicking(): void {
    if (this.ticking !== null) return;
    this.ticking = setInterval(() => {
      this.nowMs.set(this.clock.now());
      if (this.lostAtMs !== null && this.clock.now() - this.lostAtMs >= SPOT_HELD_MS) {
        this.giveUp();
        return;
      }
      this.follow();
    }, TICK_MS);
  }

  private stopTicking(): void {
    if (this.ticking !== null) clearInterval(this.ticking);
    this.ticking = null;
  }

  /** Opens the screen the game is at, and reports the moments that make a sound. */
  private follow(): void {
    const seen = this.seen();
    if (!seen) return;
    if (this.atMicCheck()) return this.show('mic-check');
    // Away from the room in a game not over: Duel shows "Reconnecting…" or the lost game (ADR 0036).
    if (this.connection() !== 'live' && seen.state.phase !== 'over') return this.show('duel');
    const screen = FriendsView.screen(seen);
    this.report(seen, screen);
    this.show(screen);
  }

  /** The child's right answer (a chime), and their hop with its stamp (a jingle) (ADR 0029). */
  private report(seen: Seen, screen: GameScreen): void {
    const number = seen.state.duel?.number ?? 0;
    if (!FriendsView.youWon(seen.state, seen.you)) return;
    if (this.reported.won !== number) {
      this.reported.won = number;
      this.tell('answerCorrect');
    }
    const move = seen.state.lastMove;
    const hopped = move?.kind === 'hop' && move.traveller === seen.you;
    if (hopped && screen === 'world-map' && this.reported.stamped !== number) {
      this.reported.stamped = number;
      this.tell('countryReached');
    }
  }

  private tell(moment: GameMoment): void {
    for (const listener of [...this.momentListeners]) listener(moment);
  }

  private show(screen: GameScreen): void {
    if (this.current() === screen) return;
    this.current.set(screen);
    for (const listener of [...this.listeners]) listener(screen);
  }
}
