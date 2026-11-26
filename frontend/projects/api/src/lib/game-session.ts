import { InjectionToken, type Signal } from '@angular/core';
import { type DuelState } from './duel';
import { type GameSetup } from './game-setup';

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
  /** Starts a game with the setup (L2-018 criterion 1). */
  start(setup: GameSetup): void;
  /** Gives the device's player's answer to the duel (L2-010); it is ignored when it cannot count. */
  answer(value: number): void;
}

export const GAME_SESSION = new InjectionToken<GameSession>('GAME_SESSION');
