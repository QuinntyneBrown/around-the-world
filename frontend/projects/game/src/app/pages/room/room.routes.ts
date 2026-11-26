import { type Routes } from '@angular/router';
import { FetchRoomsApi, ROOMS_API } from '@atw/api';

/**
 * Room with what joining needs: `RoomsApi`, which loads with the screen and goes when it goes
 * (docs/adr/0031, docs/adr/0032). `/room/{CODE}`, the room's link, opens it with the code filled
 * in for anyone not in that room (L2-024 criterion 4).
 */
export const ROOM_ROUTES: Routes = [
  {
    path: '',
    providers: [{ provide: ROOMS_API, useClass: FetchRoomsApi }],
    children: [
      {
        path: '',
        title: 'Join a room · Around the World',
        loadComponent: () => import('./room').then((m) => m.RoomPage),
      },
      {
        path: ':code',
        title: 'Join a room · Around the World',
        loadComponent: () => import('./room').then((m) => m.RoomPage),
      },
    ],
  },
];
