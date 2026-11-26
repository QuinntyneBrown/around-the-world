import { type TourEnding, type TourMove, type TourResult } from '@atw/api';
import { countryOfDesk } from './countries';
import { type DuelSide } from './duel';
import { Passport } from './passport';
import { Standings } from './standings';

/** The time limit of each tour length, in game time (L2-006 criterion 2, ADR 0024). */
const TIME_LIMITS_MS: Readonly<Record<number, number>> = {
  6: 3 * 60_000,
  12: 6 * 60_000,
  24: 12 * 60_000,
};

/** How long a tour of this length may last before it ends on time (L2-006 criterion 2). */
export function timeLimitMs(tourLength: number): number {
  return TIME_LIMITS_MS[tourLength] ?? Number.POSITIVE_INFINITY;
}

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
    private readonly endsAtMs: number,
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
    // The first traveller's distance of 1 counts desk 1, and so does their passport (ADR 0024).
    this.passports.get(traveller)?.stamp(1);
  }

  /**
   * Starts a tour: the traveller beside desk 2 with a distance travelled of 1, desk 1 empty,
   * and each seated player at their desk with 0 (L2-007). The time limit passes at `endsAtMs`
   * on the game's clock (L2-006 criterion 2).
   */
  static start(
    tourLength: number,
    traveller: string,
    seated: readonly { desk: number; player: string }[],
    endsAtMs = Number.POSITIVE_INFINITY,
  ): Tour {
    return new Tour(tourLength, traveller, seated, endsAtMs);
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

  /**
   * How the tour has ended, asked after each decided duel: all the way round when a player's
   * distance travelled equals the tour length, on time when the time limit has passed, or null
   * while it goes on (L2-006 criteria 1, 2 and 5). A duel in progress is never cut short.
   */
  ending(atMs: number): TourEnding | null {
    const furthest = this.standings.ordered()[0];
    if (furthest && furthest.distance >= this.tourLength) return 'allTheWayRound';
    return atMs >= this.endsAtMs ? 'timeLimit' : null;
  }

  /**
   * The result of an ended tour (L2-006 criteria 3, 4 and 6, L2-035): the winner, the places
   * of the players the screens name, numbered among them, the player's own place and their
   * passport, one page for each desk (ADR 0024).
   */
  result(
    ending: TourEnding,
    own: string,
    shown: (player: string) => boolean,
  ): Omit<TourResult, 'players'> {
    const ordered = this.standings.ordered();
    const winner = ordered[0] ?? { player: own, distance: 0 };
    const places = ordered
      .filter(({ player }) => shown(player))
      .map((entry, index) => ({ place: index + 1, ...entry }));
    const passport =
      this.passports
        .get(own)
        ?.pages(Array.from({ length: this.tourLength }, (_, index) => countryOfDesk(index + 1))) ??
      [];
    return {
      ending,
      tourLength: this.tourLength,
      winner: winner.player,
      winnerDistance: winner.distance,
      places,
      yourPlace: places.find(({ player }) => player === own)?.place ?? places.length + 1,
      passport,
      countriesReached: passport.filter(({ stamped }) => stamped).length,
    };
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
