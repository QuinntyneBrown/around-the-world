import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { GAME_SESSION } from '@atw/api';

/**
 * Lets a game screen open only while the child is in a game of its group; otherwise Home opens
 * (L2-030 criterion 7). A reload makes a new group with no game (docs/adr/0016).
 */
export const inGameGuard: CanActivateFn = () =>
  inject(GAME_SESSION).hasGame() || inject(Router).createUrlTree(['/']);
