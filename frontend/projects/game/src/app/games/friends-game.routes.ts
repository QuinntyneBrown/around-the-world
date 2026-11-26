import { type Routes } from '@angular/router';
import {
  ROOM_CONNECTION,
  ROOM_SESSION,
  SignalRRoomConnection,
  SOUND,
  VOICE_ANSWER,
  WAY_OF_ANSWERING,
} from '@atw/api';
import { BrowserSound, KeptWayOfAnswering, LazyVoiceAnswer } from '@atw/domain';
import { FriendsGame } from './friends-game';

/**
 * The room group (docs/adr/0016-solo-game-route-group.md, docs/adr/0031, docs/adr/0032): the
 * Lobby of the room the visit holds, and the room's connection behind `ROOM_CONNECTION`, whose
 * SignalR client loads only when the Lobby first connects. `FriendsGame` behind `ROOM_SESSION`
 * keeps the room up to date; leaving the group leaves the room. The host's setup, the start and
 * `GAME_SESSION` join it with journey 14.
 */
export const FRIENDS_GAME_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: ROOM_CONNECTION, useClass: SignalRRoomConnection },
      FriendsGame,
      { provide: ROOM_SESSION, useExisting: FriendsGame },
      // The voice, the way of answering and the sounds, as the solo group binds them (ADR 0034).
      { provide: VOICE_ANSWER, useClass: LazyVoiceAnswer },
      { provide: WAY_OF_ANSWERING, useClass: KeptWayOfAnswering },
      { provide: SOUND, useClass: BrowserSound },
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
    ],
  },
];
