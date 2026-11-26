import { type Routes } from '@angular/router';
import { GAME_SESSION } from '@atw/api';
import { SoloGame } from '@atw/domain';
import { inGameGuard } from './in-game.guard';

/**
 * The solo group (docs/adr/0016-solo-game-route-group.md): the solo Game Setup and the game
 * screens, sharing one `SoloGame` behind `GAME_SESSION`. Leaving the group destroys it, and
 * the game with it. Mic Check, World Map and the Podium join with their journeys.
 */
export const SOLO_GAME_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: GAME_SESSION, useClass: SoloGame }],
    children: [
      {
        path: 'setup',
        title: 'Set up your game · Around the World',
        loadComponent: () => import('../pages/game-setup/game-setup').then((m) => m.GameSetupPage),
      },
      {
        path: 'duel',
        title: 'Duel · Around the World',
        canActivate: [inGameGuard],
        loadComponent: () => import('../pages/duel/duel').then((m) => m.DuelPage),
      },
    ],
  },
];
