import { DestroyRef, inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GAME_SESSION, ROOM_SESSION, type GameScreen } from '@atw/api';

/** The route of each game screen built so far (docs/mocks/manifest.json). */
const PATHS: Partial<Record<GameScreen, string>> = {
  'mic-check': '/mic',
  duel: '/duel',
  'world-map': '/map',
  podium: '/podium',
};

/**
 * Opens the game screen the game is at (docs/detailed-designs/player/find-way-through-screens/).
 * The game decides when the screen changes; this listens and navigates, replacing the entry of
 * the game screen before so the history does not grow with every duel. It stops listening when
 * its group is destroyed, and uses no effect (docs/adr/0023).
 */
@Injectable()
export class GameScreenNavigator {
  private readonly router = inject(Router);
  /** The room, in a game with friends, whose Lobby "Play again" returns to (docs/adr/0034). */
  private readonly room = inject(ROOM_SESSION, { optional: true });

  constructor() {
    const stop = inject(GAME_SESSION).watchScreen((screen) => this.open(screen));
    inject(DestroyRef).onDestroy(stop);
  }

  private open(screen: GameScreen): void {
    const path = screen === 'lobby' && this.room ? `/room/${this.room.entry.code}` : PATHS[screen];
    if (!path || this.router.url === path) return;
    const fromGameScreen = Object.values(PATHS).includes(this.router.url);
    void this.router.navigateByUrl(path, { replaceUrl: fromGameScreen });
  }
}
