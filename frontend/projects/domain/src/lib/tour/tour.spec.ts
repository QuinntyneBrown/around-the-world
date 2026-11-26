import { Tour } from './tour';

/** A tour of the length with the traveller "you" and player "p{desk}" at each desk from 2. */
function tourOf(length: number): Tour {
  const seated = Array.from({ length: length - 1 }, (_, index) => ({
    desk: index + 2,
    player: `p${index + 2}`,
  }));
  return Tour.start(length, 'you', seated);
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
    expect(tour.stampsOf('you')).toEqual([3, 4]);
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

  it('is over when a traveller’s distance reaches the tour length (L2-006 5)', () => {
    const tour = tourOf(6);
    for (let hop = 1; hop < 5; hop++) tour.applyDuel('traveller', 0);
    expect(tour.over).toBe(false);
    tour.applyDuel('traveller', 0);
    expect(tour.distanceOf('you')).toBe(6);
    expect(tour.over).toBe(true);
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
