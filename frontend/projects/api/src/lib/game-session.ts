import { InjectionToken, type Signal } from '@angular/core';
import { type DuelState } from './duel';
import { type GameSetup } from './game-setup';
import { type TourResult, type TourState } from './tour';

/** The game screen a game is at (docs/detailed-designs/player/find-way-through-screens/). */
export type GameScreen = 'mic-check' | 'duel' | 'world-map' | 'podium';

/** Whether a game is played on the device against classmates, or in a room with friends. */
export type GameKind = 'solo' | 'friends';

/**
 * A game in progress, solo or with friends. The solo group and the room group each provide
 * their own behind `GAME_SESSION` (docs/adr/0016-solo-game-route-group.md); the game screens
 * read it and do not know which kind of game is played.
 */
export interface GameSession {
  /** A solo game can be paused; a game with friends offers Leave instead (L2-033 criterion 4). */
  readonly kind: GameKind;
  /** Whether the game is paused: its clock and everything on it wait (docs/adr/0027). */
  readonly paused: Signal<boolean>;
  /** Whether a game has started in this group. */
  readonly hasGame: Signal<boolean>;
  /** The setup the game was started with, or null before it starts. */
  readonly setup: Signal<GameSetup | null>;
  /** The game screen the game is at, or null before it starts. */
  readonly screen: Signal<GameScreen | null>;
  /** The duel the device's player is in, or null before the first is dealt. */
  readonly duel: Signal<DuelState | null>;
  /** The tour: the ring, the players and the last move, or null before it starts. */
  readonly tour: Signal<TourState | null>;
  /** How the tour ended, once it is over and the Podium opens; null until then (L2-035). */
  readonly result: Signal<TourResult | null>;
  /**
   * Starts a game with the setup (L2-018 criterion 1). With `micCheck` the game waits at the
   * screen `mic-check` and deals no card until `continue()` (L2-012 criterion 8).
   */
  start(setup: GameSetup, options?: { readonly micCheck?: boolean }): void;
  /** Gives the device's player's answer to the duel (L2-010); it is ignored when it cannot count. */
  answer(value: number): void;
  /**
   * Moves the game on at the child's word: leaving Mic Check deals the first card, the pill after a lost duel opens World Map, and
   * "Back to the card" on World Map returns to Duel at once, or opens the Podium after the last
   * duel (L2-033 8, L2-034 12, L2-035 8).
   */
  continue(): void;
  /**
   * From the Podium of a solo game: drops the ended tour and starts a new one with the same kid
   * and setup (L2-035 criterion 3).
   */
  playAgain(): void;
  /** Stops the game's clock in a solo game (L2-033 criterion 4); an answer meanwhile is ignored. */
  pause(): void;
  /** Lets a paused game run on from where it stopped, with the same flash card and time left. */
  resume(): void;
  /**
   * Leaves the game: at once in a solo game, or once the room has been told in a game with
   * friends (L2-033 criterion 4). The screen opens Home when it settles.
   */
  leave(): Promise<void>;
  /**
   * Calls the listener each time the game moves to another screen; returns a function that
   * stops it (docs/adr/0023-game-screens-follow-the-session.md).
   */
  watchScreen(listener: (screen: GameScreen) => void): () => void;
}

export const GAME_SESSION = new InjectionToken<GameSession>('GAME_SESSION');
