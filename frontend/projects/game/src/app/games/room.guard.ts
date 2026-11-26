import { inject } from '@angular/core';
import { type CanMatchFn } from '@angular/router';
import { VISIT } from '@atw/api';

/**
 * The room group matches only while the visit holds a room (docs/adr/0016, docs/adr/0031):
 * a reload, or an address typed in, finds none.
 */
export const inRoomGuard: CanMatchFn = () => inject(VISIT).room() !== null;
