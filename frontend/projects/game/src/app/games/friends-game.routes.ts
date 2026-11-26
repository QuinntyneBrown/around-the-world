import { inject, provideEnvironmentInitializer } from '@angular/core';
import { type Routes } from '@angular/router';
import {
  GAME_SESSION,
  ROOM_CONNECTION,
  ROOM_SESSION,
  SignalRRoomConnection,
  SOUND,
  VOICE_ANSWER,
  WAY_OF_ANSWERING,
} from '@atw/api';
import { BrowserSound, KeptWayOfAnswering, LazyVoiceAnswer } from '@atw/domain';
import { FriendsGame } from './friends-game';
import { GameScreenNavigator } from './game-screen-navigator';
import { inGameGuard } from './in-game.guard';
import { micCheckGuard } from './mic-check.guard';
import { MomentSounds } from './moment-sounds';
import { pauseOnBackGuard } from './pause-on-back.guard';

/**
 * The room group (docs/adr/0016-solo-game-route-group.md, docs/adr/0031, docs/adr/0032,
 * docs/adr/0034): the Lobby of the room the visit holds, the host's Game Setup and the game
 * screens, sharing the room's connection behind `ROOM_CONNECTION`, whose SignalR client loads only
 * when the Lobby first connects. `FriendsGame` is both `ROOM_SESSION` and `GAME_SESSION`, so the
 * game screens show a game with friends as they show a solo one; leaving the group leaves the
 * room. The navigator opens the screen the game is at, and the Lobby when "Play again" returns
 * the room to it. The group binds the voice, the way of answering and the sounds as the solo
 * group does.
 */
export const FRIENDS_GAME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: ROOM_CONNECTION, useClass: SignalRRoomConnection },
      FriendsGame,
      { provide: ROOM_SESSION, useExisting: FriendsGame },
      { provide: GAME_SESSION, useExisting: FriendsGame },
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
        path: 'room/:code',
        title: 'Room · Around the World',
        loadComponent: () => import('../pages/lobby/lobby').then((m) => m.LobbyPage),
      },
      {
        // The host's "Change" (L2-018 criterion 5, docs/adr/0034).
        path: 'setup',
        title: 'Set up the race · Around the World',
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
