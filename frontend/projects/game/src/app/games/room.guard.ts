import { inject } from '@angular/core';
import { type CanMatchFn } from '@angular/router';
import { VISIT } from '@atw/api';

/** The screens of a game the room group holds besides its Lobby (docs/adr/0034). */
const GAME_PATHS = new Set(['setup', 'mic', 'duel', 'map', 'podium']);

/**
 * The room group matches only the address of the room the visit holds, and the room's Game
 * Setup and game screens while the visit holds a room (docs/adr/0016, docs/adr/0031,
 * docs/adr/0032, docs/adr/0034): a reload, a typed address or another room's link finds none,
 * and opens Room with that code filled in, or the solo group's screen.
 */
export const inRoomGuard: CanMatchFn = (_route, segments) => {
  const room = inject(VISIT).room();
  if (room === null) return false;
  const [first, second] = segments.map(({ path }) => path);
  if (first === 'room') return second === room.code && segments.length === 2;
  return segments.length === 1 && GAME_PATHS.has(first);
};
