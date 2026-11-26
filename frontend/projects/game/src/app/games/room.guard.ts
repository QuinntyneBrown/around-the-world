import { inject } from '@angular/core';
import { type CanMatchFn } from '@angular/router';
import { VISIT } from '@atw/api';

/**
 * The room group matches only the address of the room the visit holds (docs/adr/0016,
 * docs/adr/0031, docs/adr/0032): a reload, a typed address or another room's link finds none,
 * and opens Room with that code filled in.
 */
export const inRoomGuard: CanMatchFn = (_route, segments) => {
  const room = inject(VISIT).room();
  return room !== null && segments[0]?.path === 'room' && segments[1]?.path === room.code;
};
