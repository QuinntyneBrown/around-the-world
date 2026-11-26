import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import {
  ROOM_CONNECTION,
  VISIT,
  WAY_OF_ANSWERING,
  type GameMoment,
  type GameScreen,
  type GameSession,
  type GameSetup,
  type GameState,
  type RoomEntry,
  type RoomLink,
  type RoomSession,
  type RoomState,
} from '@atw/api';
import { GameClock, NicknameGenerator, TICK_MS } from '@atw/domain';
import { FriendsView, type Seen } from './friends-view';

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
 */
@Injectable()
export class FriendsGame implements RoomSession, GameSession {
  private readonly visit = inject(VISIT);
  private readonly connection = inject(ROOM_CONNECTION);
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

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stopTicking();
      this.listeners.clear();
      this.momentListeners.clear();
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

  startRace(): Promise<void> {
    return this.connection.start();
  }

  retry(): void {
    void this.connect();
  }

  async leave(): Promise<void> {
    if (this.gone) return;
    this.gone = true;
    this.stopTicking();
    try {
      await this.connection.leave();
    } catch {
      // A room that cannot be told forgets the player when it is idle (docs/adr/0031).
    }
    await this.connection.close();
    this.visit.leaveRoom();
  }

  /** The host's start comes from the Lobby (`startRace`); the server deals the game. */
  start(): void {
    // A game with friends is started by the host in the Lobby (L2-025 criterion 2).
  }

  /** Sends the answer, a number and nothing else, while the card is open and not frozen. */
  answer(value: number): void {
    const duel = this.duel();
    if (!duel || duel.outcome !== 'open' || duel.frozen) return;
    this.connection.answer(value).catch(() => undefined);
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
    this.connection.playAgain().catch(() => undefined);
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
      await this.connection.connect(this.entry.token, {
        changed: (room) => {
          if (this.gone) return;
          this.received.set(room);
          this.state.set('live');
          // "Play again" returned the room to its Lobby: the game is dropped (L2-035 3).
          if (room.status === 'waiting' && this.last()?.game.phase === 'over') this.dropGame();
        },
        gameChanged: (game) => {
          if (!this.gone) this.receive(game);
        },
        lost: () => {
          if (!this.gone) this.state.set('lost');
        },
      });
    } catch {
      if (!this.gone) this.state.set('lost');
    }
  }

  /** A new state of the game: kept in place of the last, and the screen follows it. */
  private receive(game: GameState): void {
    const before = this.last()?.game;
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

  private dropGame(): void {
    this.stopTicking();
    this.last.set(null);
    this.pillAt.set(null);
    this.atMicCheck.set(false);
    this.show('lobby');
  }

  private startTicking(): void {
    if (this.ticking !== null) return;
    this.ticking = setInterval(() => {
      this.nowMs.set(this.clock.now());
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
