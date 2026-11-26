/**
 * One player's passport (docs/detailed-designs/tour/travel-round-ring/): a stamp for each desk
 * they reached by a hop (L2-002 criterion 2, ADR 0022). It holds at most one stamp a desk, so
 * it never grows past the tour length (L2-048 criterion 5).
 */
export class Passport {
  private readonly desks: number[] = [];

  constructor(private readonly tourLength: number) {}

  /** Stamps the desk's country, once. */
  stamp(desk: number): void {
    if (desk < 1 || desk > this.tourLength || this.desks.includes(desk)) return;
    this.desks.push(desk);
  }

  /** The desks stamped, in the order reached. */
  get stamps(): readonly number[] {
    return this.desks;
  }
}
