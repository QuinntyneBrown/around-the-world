import { inject, provideEnvironmentInitializer } from '@angular/core';
import { type Routes } from '@angular/router';
import { GAME_SESSION, SOUND, VOICE_ANSWER, WAY_OF_ANSWERING } from '@atw/api';
import { BrowserSound, KeptWayOfAnswering, LazyVoiceAnswer, SoloGame } from '@atw/domain';
import { GameScreenNavigator } from './game-screen-navigator';
import { inGameGuard } from './in-game.guard';
import { micCheckGuard } from './mic-check.guard';
import { MomentSounds } from './moment-sounds';
import { pauseOnBackGuard } from './pause-on-back.guard';

/**
 * The solo group (docs/adr/0016-solo-game-route-group.md): the solo Game Setup and the game
 * screens, sharing one `SoloGame` behind `GAME_SESSION`, and the navigator that opens the
 * screen the game is at (docs/adr/0023). Leaving the group destroys them, and the game with
 * them. The group binds the voice and the way of answering for Mic Check and Duel
 * (docs/adr/0025-answering-by-voice.md); leaving it stops listening. It binds the game's sounds
 * and plays them for the game's moments; leaving it lets them go (docs/adr/0029).
 */
export const SOLO_GAME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: GAME_SESSION, useClass: SoloGame },
      { provide: VOICE_ANSWER, useClass: LazyVoiceAnswer },
      { provide: WAY_OF_ANSWERING, useClass: KeptWayOfAnswering },
      { provide: SOUND, useClass: BrowserSound },
      GameScreenNavigator,
      MomentSounds,
      provideEnvironmentInitializer(() => {
        inject(GameScreenNavigator);
        inject(MomentSounds);
      }),
    ],
    children: [
      {
        path: 'setup',
        title: 'Set up your game · Around the World',
        loadComponent: () => import('../pages/game-setup/game-setup').then((m) => m.GameSetupPage),
      },
      {
        path: 'mic',
        title: 'Mic check · Around the World',
        canActivate: [micCheckGuard],
        loadComponent: () => import('../pages/mic-check/mic-check').then((m) => m.MicCheckPage),
      },
      {
        path: 'duel',
        title: 'Duel · Around the World',
        canActivate: [inGameGuard],
        canDeactivate: [pauseOnBackGuard],
        loadComponent: () => import('../pages/duel/duel').then((m) => m.DuelPage),
      },
      {
        path: 'map',
        title: 'World map · Around the World',
        canActivate: [inGameGuard],
        canDeactivate: [pauseOnBackGuard],
        loadComponent: () => import('../pages/world-map/world-map').then((m) => m.WorldMapPage),
      },
      {
        path: 'podium',
        title: 'Podium · Around the World',
        canActivate: [inGameGuard],
        loadComponent: () => import('../pages/podium/podium').then((m) => m.PodiumPage),
      },
    ],
  },
];
