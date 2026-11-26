import { InjectionToken, type Signal } from '@angular/core';
import { type DuelState } from './duel';
import { type GameSetup } from './game-setup';
import { type TourState } from './tour';

/** The game screen a game is at (docs/detailed-designs/player/find-way-through-screens/). */
export type GameScreen = 'mic-check' | 'duel' | 'world-map' | 'podium';

/**
 * A game in progress, solo or with friends. The solo group and the room group each provide
 * their own behind `GAME_SESSION` (docs/adr/0016-solo-game-route-group.md); the game screens
 * read it and do not know which kind of game is played.
 */
export interface GameSession {
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
  /** Starts a game with the setup (L2-018 criterion 1). */
  start(setup: GameSetup): void;
  /** Gives the device's player's answer to the duel (L2-010); it is ignored when it cannot count. */
  answer(value: number): void;
  /**
   * Moves the game on at the child's word: the pill after a lost duel opens World Map, and
   * "Back to the card" on World Map returns to Duel at once (L2-033 8, L2-034 12).
   */
  continue(): void;
  /**
   * Calls the listener each time the game moves to another screen; returns a function that
   * stops it (docs/adr/0023-game-screens-follow-the-session.md).
   */
  watchScreen(listener: (screen: GameScreen) => void): () => void;
}

export const GAME_SESSION = new InjectionToken<GameSession>('GAME_SESSION');
