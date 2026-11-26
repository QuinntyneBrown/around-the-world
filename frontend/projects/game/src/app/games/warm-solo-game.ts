import { type Route } from '@angular/router';
import { loadClassmateAgent } from '@atw/domain';

/**
 * Fetches the solo game's code (its route group, every screen in it and the classmates'
 * agents) without running a
 * game, so "Play solo" still works once the device has lost its network (L2-022 criterion 6,
 * L2-054 criterion 3, docs/adr/0031-making-a-room.md). Solo Or Friends calls it when it opens:
 * the solo game is one of the two next screens. A failure is ignored; the router fetches the
 * code again when the child plays.
 */
export async function warmSoloGame(): Promise<void> {
  try {
    const { SOLO_GAME_ROUTES } = await import('./solo-game.routes');
    const screens = SOLO_GAME_ROUTES.flatMap((group: Route) => group.children ?? []);
    await Promise.all([loadClassmateAgent(), ...screens.map((screen) => screen.loadComponent?.())]);
  } catch {
    // Offline already, or the code moved: the router tries again on "Play solo".
  }
}
