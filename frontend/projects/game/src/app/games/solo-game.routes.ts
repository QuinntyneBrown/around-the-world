import { inject, provideEnvironmentInitializer } from '@angular/core';
import { type Routes } from '@angular/router';
import { GAME_SESSION } from '@atw/api';
import { SoloGame } from '@atw/domain';
import { GameScreenNavigator } from './game-screen-navigator';
import { inGameGuard } from './in-game.guard';

/**
 * The solo group (docs/adr/0016-solo-game-route-group.md): the solo Game Setup and the game
 * screens, sharing one `SoloGame` behind `GAME_SESSION`, and the navigator that opens the
 * screen the game is at (docs/adr/0023). Leaving the group destroys them, and the game with
 * them. Mic Check and the Podium join with their journeys.
 */
export const SOLO_GAME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: GAME_SESSION, useClass: SoloGame },
      GameScreenNavigator,
      provideEnvironmentInitializer(() => inject(GameScreenNavigator)),
    ],
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
      {
        path: 'map',
        title: 'World map · Around the World',
        canActivate: [inGameGuard],
        loadComponent: () => import('../pages/world-map/world-map').then((m) => m.WorldMapPage),
      },
    ],
  },
];
