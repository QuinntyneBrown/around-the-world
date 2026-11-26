import { type Routes } from '@angular/router';

/**
 * The room group (docs/adr/0016-solo-game-route-group.md, docs/adr/0031-making-a-room.md): the
 * Lobby of the room the visit holds. Joining, the room's connection and `FriendsGame` behind
 * `GAME_SESSION` join it with journeys 13 and 14.
 */
export const FRIENDS_GAME_ROUTES: Routes = [
  {
    path: 'room/:code',
    title: 'Room · Around the World',
    loadComponent: () => import('../pages/lobby/lobby').then((m) => m.LobbyPage),
  },
];
