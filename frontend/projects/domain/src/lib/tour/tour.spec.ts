import { timeLimitMs, Tour } from './tour';

/** A tour of the length with the traveller "you" and player "p{desk}" at each desk from 2. */
function tourOf(length: number, endsAtMs?: number): Tour {
  const seated = Array.from({ length: length - 1 }, (_, index) => ({
    desk: index + 2,
    player: `p${index + 2}`,
  }));
  return Tour.start(length, 'you', seated, endsAtMs);
}

/** Lets the traveller win duels until they stand beside the desk. */
function hopTo(tour: Tour, desk: number): void {
  while (tour.desk !== desk) tour.applyDuel('traveller', 0);
}

function emptyDesks(tour: Tour): number[] {
  return Array.from({ length: tour.tourLength }, (_, index) => index + 1).filter(
    (desk) => tour.holderOf(desk) === null,
  );
}

describe('Tour', () => {
  it.each([6, 12, 24])(
    'starts a tour of %i desks with desk 1 empty and the traveller beside desk 2 (L2-007 4)',
    (length) => {
      const tour = tourOf(length);
      expect(emptyDesks(tour)).toEqual([1]);
      expect(tour.traveller).toBe('you');
      expect(tour.desk).toBe(2);
      expect(tour.distanceOf('you')).toBe(1);
      expect(tour.distanceOf('p2')).toBe(0);
      expect(tour.deskOf('p5')).toBe(5);
      expect(tour.deskOf('you')).toBeNull();
    },
  );

  it('hops a traveller who wins to the next desk; the desk holder keeps theirs (L2-002 1)', () => {
    const tour = tourOf(12);
    hopTo(tour, 5);
    const move = tour.applyDuel('traveller', 100);
    expect(move).toEqual({
      kind: 'hop',
      traveller: 'you',
      from: 5,
      to: 6,
      passedEmptyDesk: false,
      satDown: null,
    });
    expect(tour.desk).toBe(6);
    expect(tour.holderOf(5)).toBe('p5');
  });

  it('stamps the passport for the country of the desk reached (L2-002 2)', () => {
    const tour = tourOf(12);
    tour.applyDuel('traveller', 0);
    tour.applyDuel('traveller', 0);
    expect(tour.stampsOf('you')).toEqual([1, 3, 4]);
  });

  it('starts the first traveller’s passport with desk 1, where the tour starts (L2-007 7)', () => {
    expect(tourOf(12).stampsOf('you')).toEqual([1]);
    expect(tourOf(12).stampsOf('p2')).toEqual([]);
  });

  it('adds 1 to the distance for a hop: 4 at desk 5 becomes 5 at desk 6 (L2-002 3)', () => {
    const tour = tourOf(12);
    hopTo(tour, 5);
    expect(tour.distanceOf('you')).toBe(4);
    tour.applyDuel('traveller', 0);
    expect(tour.distanceOf('you')).toBe(5);
  });

  it('passes the empty desk and stops at the one after it, adding 1 (L2-002 4)', () => {
    const tour = tourOf(6);
    // you lose at desk 2: p2 travels; p2 hops round to desk 6
    tour.applyDuel('deskHolder', 0);
    hopTo(tour, 6);
    const before = tour.distanceOf('p2');
    const move = tour.applyDuel('traveller', 0);
    expect(move).toMatchObject({ from: 6, to: 2, passedEmptyDesk: true });
    expect(tour.distanceOf('p2')).toBe(before + 1);
  });

  it('sits the beaten traveller down at the desk when the desk holder wins (L2-003 1)', () => {
    const tour = tourOf(12);
    hopTo(tour, 5);
    const move = tour.applyDuel('deskHolder', 0);
    expect(tour.holderOf(5)).toBe('you');
    expect(tour.deskOf('you')).toBe(5);
    expect(move).toEqual({
      kind: 'deskHolderTravels',
      traveller: 'p5',
      from: 5,
      to: 6,
      passedEmptyDesk: false,
      satDown: 'you',
    });
  });

  it('makes the desk holder who won the traveller at the next desk (L2-003 2)', () => {
    const tour = tourOf(12);
    hopTo(tour, 5);
    tour.applyDuel('deskHolder', 0);
    expect(tour.traveller).toBe('p5');
    expect(tour.desk).toBe(6);
    expect(tour.deskOf('p5')).toBeNull();
  });

  it('gives a new traveller a distance of 1 when it was 0 (L2-003 3)', () => {
    const tour = tourOf(12);
    tour.applyDuel('deskHolder', 0);
    expect(tour.distanceOf('p2')).toBe(1);
  });

  it('keeps a new traveller’s distance when it was more than 0, and never lowers it (L2-003 3)', () => {
    const tour = tourOf(12);
    hopTo(tour, 5); // you: 4
    tour.applyDuel('deskHolder', 0); // you sit at 5, p5 travels to 6
    hopTo(tour, 12); // p5 walks round to desk 12
    hopTo(tour, 5); // p5 passes desk 1 and reaches desk 5, held by you
    tour.applyDuel('deskHolder', 0); // you win at your own desk
    expect(tour.traveller).toBe('you');
    expect(tour.distanceOf('you')).toBe(4);
    tour.applyDuel('traveller', 0);
    expect(tour.distanceOf('you')).toBe(5);
  });

  it('gives no stamp to a desk holder who walks on (L2-003 4)', () => {
    const tour = tourOf(12);
    tour.applyDuel('deskHolder', 0);
    expect(tour.stampsOf('p2')).toEqual([]);
  });

  it('keeps exactly one traveller and one empty desk after any duel (L2-007 6)', () => {
    const tour = tourOf(12);
    const winners = ['traveller', 'deskHolder', 'deskHolder', 'traveller', 'deskHolder'] as const;
    for (const winner of winners) {
      tour.applyDuel(winner, 0);
      expect(emptyDesks(tour)).toEqual([1]);
      expect(tour.deskOf(tour.traveller)).toBeNull();
    }
  });

  it('ends when the first traveller hops past the last desk, not on reaching it (L2-006 1)', () => {
    const tour = tourOf(6);
    for (let hop = 1; hop < 4; hop++) tour.applyDuel('traveller', 0);
    expect(tour.desk).toBe(5);
    tour.applyDuel('traveller', 0);
    expect(tour.desk).toBe(6);
    expect(tour.ending(0)).toBeNull();
    tour.applyDuel('traveller', 0);
    expect(tour.distanceOf('you')).toBe(6);
    expect(tour.ending(0)).toBe('allTheWayRound');
  });

  it('ends for any player whose distance reaches the tour length (L2-006 5)', () => {
    const tour = tourOf(6);
    tour.applyDuel('deskHolder', 0); // p2 travels from desk 2 with 1
    for (let hop = 0; hop < 4; hop++) tour.applyDuel('traveller', 0);
    expect(tour.distanceOf('p2')).toBe(5);
    expect(tour.ending(0)).toBeNull();
    tour.applyDuel('traveller', 0);
    expect(tour.ending(0)).toBe('allTheWayRound');
  });

  it('ends on its time limit once it has passed, and not before (L2-006 2)', () => {
    const tour = tourOf(12, 360_000);
    expect(tour.ending(359_999)).toBeNull();
    expect(tour.ending(360_000)).toBe('timeLimit');
  });

  it('ends all the way round rather than on time when both are true (L2-006 1)', () => {
    const tour = tourOf(6, 0);
    for (let hop = 0; hop < 5; hop++) tour.applyDuel('traveller', 0);
    expect(tour.ending(10)).toBe('allTheWayRound');
  });

  it.each([
    [6, 180_000],
    [12, 360_000],
    [24, 720_000],
  ])('gives a tour of %i desks a time limit of %i ms (L2-006 2, ADR 0024)', (length, ms) => {
    expect(timeLimitMs(length)).toBe(ms);
  });

  it('orders the players by distance, the one who reached it first above (L2-034 13)', () => {
    const tour = tourOf(6);
    tour.applyDuel('deskHolder', 10); // p2 reaches 1 at 10; you reached 1 at 0
    expect(tour.ordered().slice(0, 2)).toEqual([
      { player: 'you', distance: 1 },
      { player: 'p2', distance: 1 },
    ]);
    tour.applyDuel('traveller', 20); // p2 reaches 2
    expect(tour.ordered()[0]).toEqual({ player: 'p2', distance: 2 });
  });
});

describe('Tour result', () => {
  /** Only the players the screens name are placed: here every one but p4. */
  const shown = (player: string) => player !== 'p4';

  it('places the furthest travelled first (placing table: further)', () => {
    const tour = tourOf(6);
    tour.applyDuel('traveller', 10); // you 2
    const result = tour.result('timeLimit', 'you', () => true);
    expect(result.places[0]).toEqual({ place: 1, player: 'you', distance: 2 });
    expect(result.winner).toBe('you');
    expect(result.winnerDistance).toBe(2);
  });

  it('places of two at the same distance the one who reached it first (placing table: tie)', () => {
    const tour = tourOf(6);
    tour.applyDuel('deskHolder', 10); // p2 reaches 1 at 10, you at 0
    const result = tour.result('timeLimit', 'you', () => true);
    expect(result.places.slice(0, 2)).toEqual([
      { place: 1, player: 'you', distance: 1 },
      { place: 2, player: 'p2', distance: 1 },
    ]);
  });

  it('keeps the order of the desks for players level since the start (placing table: level)', () => {
    const result = tourOf(6).result('timeLimit', 'you', () => true);
    expect(result.places.map(({ player }) => player)).toEqual([
      'you',
      'p2',
      'p3',
      'p4',
      'p5',
      'p6',
    ]);
  });

  it('gives every player a place of their own from 1st to last (placing table: every place)', () => {
    const tour = tourOf(6);
    tour.applyDuel('deskHolder', 10);
    tour.applyDuel('traveller', 20);
    const result = tour.result('timeLimit', 'you', () => true);
    expect(result.places.map(({ place }) => place)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('places the one all the way round first (placing table: all the way round)', () => {
    const tour = tourOf(6);
    for (let hop = 0; hop < 5; hop++) tour.applyDuel('traveller', hop);
    const result = tour.result('allTheWayRound', 'you', () => true);
    expect(result.places[0]).toEqual({ place: 1, player: 'you', distance: 6 });
    expect(result.yourPlace).toBe(1);
  });

  it('counts only the players the screens name, numbered among them (placing table: shown)', () => {
    const tour = tourOf(6);
    tour.applyDuel('deskHolder', 10); // you sit at 2; p2 travels with 1
    tour.applyDuel('traveller', 20); // p2 hops to 4 with 2
    tour.applyDuel('deskHolder', 30); // p2 sits at 4; p4 travels with 1
    tour.applyDuel('traveller', 40); // p4 hops to 6 with 2
    tour.applyDuel('traveller', 50); // p4 hops past desk 1 to 2 with 3
    const result = tour.result('timeLimit', 'you', shown);
    expect(result.places.slice(0, 3)).toEqual([
      { place: 1, player: 'p2', distance: 2 },
      { place: 2, player: 'you', distance: 1 },
      { place: 3, player: 'p3', distance: 0 },
    ]);
    expect(result.yourPlace).toBe(2);
    expect(result.places).toHaveLength(5);
    expect(result.winner).toBe('p4');
    expect(result.winnerDistance).toBe(3);
  });

  it('gives the passport one page for each desk, stamped where reached (L2-035 2)', () => {
    const tour = tourOf(6);
    tour.applyDuel('traveller', 0);
    const result = tour.result('timeLimit', 'you', () => true);
    expect(result.passport).toEqual([
      { desk: 1, country: 'France', stamped: true },
      { desk: 2, country: 'Egypt', stamped: false },
      { desk: 3, country: 'Japan', stamped: true },
      { desk: 4, country: 'UK', stamped: false },
      { desk: 5, country: 'Italy', stamped: false },
      { desk: 6, country: 'USA', stamped: false },
    ]);
    expect(result.countriesReached).toBe(2);
    expect(result.tourLength).toBe(6);
    expect(result.ending).toBe('timeLimit');
  });
});
