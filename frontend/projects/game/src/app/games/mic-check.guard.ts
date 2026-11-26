import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { GAME_SESSION } from '@atw/api';

/**
 * Lets Mic Check open only while the game waits at it (docs/detailed-designs/answering/
 * check-mic/); otherwise Duel opens for a game, or Home when there is none (L2-030 criterion 7).
 */
export const micCheckGuard: CanActivateFn = () => {
  const session = inject(GAME_SESSION);
  if (session.screen() === 'mic-check') return true;
  return inject(Router).createUrlTree([session.hasGame() ? '/duel' : '/']);
};
