import { Standings } from './standings';

describe('Standings', () => {
  it('keeps the starting order for players level since the start', () => {
    expect(new Standings(['a', 'b', 'c'], 6).ordered().map(({ player }) => player)).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('places the one who reached a distance first above (L2-034 13, L2-006 3)', () => {
    const standings = new Standings(['a', 'b'], 6);
    standings.reach('b', 2, 100);
    standings.reach('a', 2, 200);
    expect(standings.ordered()).toEqual([
      { player: 'b', distance: 2 },
      { player: 'a', distance: 2 },
    ]);
  });

  it('never lowers a distance nor takes it past the tour length (L2-003 3)', () => {
    const standings = new Standings(['a'], 6);
    standings.reach('a', 3, 0);
    standings.reach('a', 1, 10);
    expect(standings.distanceOf('a')).toBe(3);
    standings.reach('a', 9, 20);
    expect(standings.distanceOf('a')).toBe(6);
  });
});
