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
});
