/**
 * Fetches the code of the screens Play leads to, Pick Your Kid and Solo Or Friends, without
 * opening them, while the child reads Home (L2-031 criterion 1,
 * docs/detailed-designs/player/find-way-through-screens/, docs/adr/0038). Home calls it once its
 * still picture is in, so the picture comes first; Solo Or Friends warms the solo game in turn.
 * A failure is ignored: the router fetches the code again when the child chooses.
 */
export async function warmTheWayOn(): Promise<void> {
  try {
    const [{ SOLO_OR_FRIENDS_ROUTES }] = await Promise.all([
      import('../solo-or-friends/solo-or-friends.routes'),
      import('../pick-your-kid/pick-your-kid'),
    ]);
    await Promise.all(SOLO_OR_FRIENDS_ROUTES.map((screen) => screen.loadComponent?.()));
  } catch {
    // Offline already, or the code moved: the router tries again on Play.
  }
}
