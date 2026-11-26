import { computed, Injectable, signal } from '@angular/core';
import { type GameScreen, type GameSession, type GameSetup } from '@atw/api';

/**
 * A solo game, played on the device against classmates with no request to the backend
 * (L2-019). The solo group provides it behind `GAME_SESSION` and destroys it when the child
 * leaves the group (docs/adr/0016-solo-game-route-group.md). Journey 03 starts it with the
 * setup; journey 04 deals the flash cards, and Mic Check comes first with journey 07.
 */
@Injectable()
export class SoloGame implements GameSession {
  private readonly started = signal<GameSetup | null>(null);

  readonly setup = this.started.asReadonly();
  readonly hasGame = computed(() => this.started() !== null);
  readonly screen = computed<GameScreen | null>(() => (this.started() ? 'duel' : null));

  start(setup: GameSetup): void {
    this.started.set(setup);
  }
}
