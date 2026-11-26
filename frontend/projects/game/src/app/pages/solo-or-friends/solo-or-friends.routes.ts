import { type Routes } from '@angular/router';
import { FetchRoomsApi, NETWORK, ROOMS_API } from '@atw/api';
import { BrowserNetwork } from '../../network/browser-network';

/**
 * Solo Or Friends with what making a room needs: `RoomsApi` and the device's network. They
 * load with the screen and go when it goes (docs/adr/0031-making-a-room.md).
 */
export const SOLO_OR_FRIENDS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: ROOMS_API, useClass: FetchRoomsApi },
      { provide: NETWORK, useClass: BrowserNetwork },
    ],
    loadComponent: () => import('./solo-or-friends').then((m) => m.SoloOrFriendsPage),
  },
];
