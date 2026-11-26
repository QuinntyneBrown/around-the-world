import { type TourMove } from '@atw/api';
import { type DuelSide } from './duel';
import { Passport } from './passport';
import { Standings } from './standings';

/**
 * The ring of a tour and the only place on the device where it changes
 * (docs/detailed-designs/tour/travel-round-ring/). It keeps the current positions and the
 * last move only, never a list of the duels played (L2-048 criterion 5).
 */
export class Tour {
  private readonly holders: (string | null)[];
  private readonly passports = new Map<string, Passport>();
  private readonly standings: Standings;
  private travelling: string;
  private beside: number;

  private constructor(
    readonly tourLength: number,
    traveller: string,
    seated: readonly { desk: number; player: string }[],
  ) {
    // Desk 1 is the traveller's own desk and stays empty (L2-007 criteria 2 and 4).
    this.holders = Array.from({ length: tourLength }, () => null);
    for (const { desk, player } of seated) {
      if (desk > 1 && desk <= tourLength) this.holders[desk - 1] = player;
    }
    const players = [traveller, ...seated.map(({ player }) => player)];
    for (const player of players) this.passports.set(player, new Passport(tourLength));
    this.standings = new Standings(players, tourLength);
    this.travelling = traveller;
    this.beside = this.nextHeld(1).desk;
    this.standings.reach(traveller, 1, 0);
  }

  /**
   * Starts a tour: the traveller beside desk 2 with a distance travelled of 1, desk 1 empty,
   * and each seated player at their desk with 0 (L2-007).
   */
  static start(
    tourLength: number,
    traveller: string,
    seated: readonly { desk: number; player: string }[],
  ): Tour {
    return new Tour(tourLength, traveller, seated);
  }

  /** The traveller. */
  get traveller(): string {
    return this.travelling;
  }

  /** The desk the traveller stands beside, where the next duel is. */
  get desk(): number {
    return this.beside;
  }

  /** The player seated at the desk, or null for an empty desk. */
  holderOf(desk: number): string | null {
    return this.holders[desk - 1] ?? null;
  }

  /** The desk the player is seated at, or null for the traveller. */
  deskOf(player: string): number | null {
    const index = this.holders.indexOf(player);
    return index < 0 ? null : index + 1;
  }

  distanceOf(player: string): number {
    return this.standings.distanceOf(player);
  }

  stampsOf(player: string): readonly number[] {
    return this.passports.get(player)?.stamps ?? [];
  }

  /** The players by distance travelled, the one who reached it first above (L2-034 13). */
  ordered(): { player: string; distance: number }[] {
    return this.standings.ordered();
  }

  /** Whether a traveller has gone all the way round (L2-006 criterion 5). */
  get over(): boolean {
    return this.distanceOf(this.travelling) >= this.tourLength;
  }

  /**
   * Applies a decided duel at the desk the traveller stands beside (L2-002, L2-003).
   *
   * - The traveller won: they hop to the next desk, passing an empty desk, their distance goes
   *   up by 1 and their passport is stamped for the desk reached; the desk holder keeps the desk.
   * - The desk holder won: the beaten traveller sits down at the desk, and the desk holder walks
   *   on to the next desk as the traveller, with a distance of 1 if it was 0 and no stamp.
   */
  applyDuel(winner: DuelSide, atMs: number): TourMove {
    const from = this.beside;
    const next = this.nextHeld(from);
    if (winner === 'traveller') {
      const traveller = this.travelling;
      this.beside = next.desk;
      this.standings.reach(traveller, this.distanceOf(traveller) + 1, atMs);
      this.passports.get(traveller)?.stamp(next.desk);
      return {
        kind: 'hop',
        traveller,
        from,
        to: next.desk,
        passedEmptyDesk: next.passed,
        satDown: null,
      };
    }
    const beaten = this.travelling;
    const holder = this.holderOf(from) ?? beaten;
    this.holders[from - 1] = beaten;
    this.travelling = holder;
    this.beside = next.desk;
    this.standings.reach(holder, 1, atMs);
    return {
      kind: 'deskHolderTravels',
      traveller: holder,
      from,
      to: next.desk,
      passedEmptyDesk: next.passed,
      satDown: beaten,
    };
  }

  /** The next desk round the ring after this one that has a holder, and whether one was passed. */
  private nextHeld(desk: number): { desk: number; passed: boolean } {
    let next = desk;
    let passed = false;
    for (let step = 0; step < this.tourLength; step++) {
      next = (next % this.tourLength) + 1;
      if (this.holderOf(next) !== null) return { desk: next, passed };
      passed = true;
    }
    return { desk: next, passed };
  }
}
