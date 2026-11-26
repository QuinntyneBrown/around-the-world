import { EnvironmentInjector, inject } from '@angular/core';
import { type CanDeactivateFn, Router } from '@angular/router';
import { GAME_SESSION } from '@atw/api';

/**
 * The browser's Back on Duel or World Map while a solo game is in progress does what Pause
 * does: the navigation is refused, the game's clock stops and the Pause dialog opens (L2-030
 * criterion 10, docs/adr/0027). In a game with friends it asks "Leave the game?" as Leave does
 * (L2-030 criterion 8, docs/adr/0034). A navigation the game or a button starts is never held,
 * nor is any once the tour is over.
 */
export const pauseOnBackGuard: CanDeactivateFn<unknown> = () => {
  const session = inject(GAME_SESSION);
  const navigation = inject(Router).currentNavigation();
  const over = session.tour()?.phase === 'over' || session.result() !== null;
  if (navigation?.trigger !== 'popstate' || over) return true;
  const injector = inject(EnvironmentInjector);
  if (session.kind === 'friends') {
    void import('../dialogs/leave-game/open-leave-game').then(({ openLeaveGame }) =>
      openLeaveGame(injector),
    );
  } else {
    void import('../dialogs/pause/open-pause').then(({ openPause }) => openPause(injector));
  }
  return false;
};
