/** One player's distance travelled and when they reached it. */
interface Reached {
  readonly player: string;
  readonly distance: number;
  readonly atMs: number;
  /** The player's order at the start of the tour, for players still level since then. */
  readonly order: number;
}

/**
 * The distance each player has travelled (docs/detailed-designs/tour/travel-round-ring/). It
 * orders the players by distance; of two with the same distance the one who reached it first
 * is placed higher, and players level since the start keep their starting order (L2-006
 * criterion 3, L2-034 criterion 13).
 */
export class Standings {
  private readonly reached = new Map<string, Reached>();

  constructor(
    players: readonly string[],
    private readonly tourLength: number,
  ) {
    players.forEach((player, order) =>
      this.reached.set(player, { player, distance: 0, atMs: 0, order }),
    );
  }

  distanceOf(player: string): number {
    return this.reached.get(player)?.distance ?? 0;
  }

  /** Sets a distance reached at a time; a distance never goes down or past the tour length. */
  reach(player: string, distance: number, atMs: number): void {
    const now = this.reached.get(player);
    if (!now) return;
    const capped = Math.min(distance, this.tourLength);
    if (capped <= now.distance) return;
    this.reached.set(player, { ...now, distance: capped, atMs });
  }

  /** The players in order, the furthest first. */
  ordered(): { player: string; distance: number }[] {
    return [...this.reached.values()]
      .sort(
        (one, other) =>
          other.distance - one.distance || one.atMs - other.atMs || one.order - other.order,
      )
      .map(({ player, distance }) => ({ player, distance }));
  }
}
