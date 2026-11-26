import { Passport } from './passport';

describe('Passport', () => {
  it('holds one stamp a desk, in the order reached, and none past the tour (L2-048 5)', () => {
    const passport = new Passport(6);
    passport.stamp(3);
    passport.stamp(4);
    passport.stamp(3);
    passport.stamp(7);
    passport.stamp(0);
    expect(passport.stamps).toEqual([3, 4]);
  });

  it('gives one page for each desk of the tour, stamped where reached (L2-035 2)', () => {
    const passport = new Passport(3);
    passport.stamp(2);
    expect(passport.pages(['France', 'Egypt', 'Japan', 'UK'])).toEqual([
      { desk: 1, country: 'France', stamped: false },
      { desk: 2, country: 'Egypt', stamped: true },
      { desk: 3, country: 'Japan', stamped: false },
    ]);
  });
});
