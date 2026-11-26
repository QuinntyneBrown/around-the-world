import { type Routes } from '@angular/router';
import { inRoomGuard } from './games/room.guard';

/**
 * Every route loads its screen lazily with `loadComponent` or `loadChildren` (AGENTS.md,
 * Lazy loading and memory). The paths are those of docs/mocks/manifest.json
 * (docs/detailed-designs/player/find-way-through-screens/).
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Around the World',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'kid',
    title: 'Pick your kid · Around the World',
    loadComponent: () =>
      import('./pages/pick-your-kid/pick-your-kid').then((m) => m.PickYourKidPage),
  },
  {
    path: 'play',
    title: 'Who’s playing? · Around the World',
    // Making a room calls the backend: the HTTP client and the network load with this screen,
    // never with the initial bundle (docs/adr/0031-making-a-room.md).
    loadChildren: () =>
      import('./pages/solo-or-friends/solo-or-friends.routes').then(
        (m) => m.SOLO_OR_FRIENDS_ROUTES,
      ),
  },
  {
    // The room group, while the visit holds a room (docs/adr/0016, docs/adr/0031).
    path: '',
    canMatch: [inRoomGuard],
    loadChildren: () => import('./games/friends-game.routes').then((m) => m.FRIENDS_GAME_ROUTES),
  },
  {
    // Room, where a code is typed; a room's address that is not the visit's room, such as the
    // room's link on another device or after a reload, opens it with the code filled in
    // (L2-024 criterion 4, docs/adr/0032).
    path: 'room',
    loadChildren: () => import('./pages/room/room.routes').then((m) => m.ROOM_ROUTES),
  },
  {
    // The solo group: Game Setup and the game screens (docs/adr/0016-solo-game-route-group.md).
    path: '',
    loadChildren: () => import('./games/solo-game.routes').then((m) => m.SOLO_GAME_ROUTES),
  },
  {
    // A failure of the game itself; GameErrorHandler opens it without changing the address.
    path: 'error',
    title: 'Something went wrong · Around the World',
    loadComponent: () =>
      import('./pages/something-went-wrong/something-went-wrong').then(
        (m) => m.SomethingWentWrongPage,
      ),
  },
  {
    // An address that leads to no screen (L2-030 criterion 9); it must stay the last route.
    path: '**',
    title: 'Not found · Around the World',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
