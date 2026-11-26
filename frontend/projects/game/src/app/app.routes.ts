import { type Routes } from '@angular/router';

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
    loadComponent: () =>
      import('./pages/solo-or-friends/solo-or-friends').then((m) => m.SoloOrFriendsPage),
  },
  {
    // The solo group: Game Setup and the game screens (docs/adr/0016-solo-game-route-group.md).
    path: '',
    loadChildren: () => import('./games/solo-game.routes').then((m) => m.SOLO_GAME_ROUTES),
  },
];
