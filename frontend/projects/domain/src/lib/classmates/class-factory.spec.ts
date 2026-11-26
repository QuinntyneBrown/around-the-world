import { KID_IDS, TOUR_LENGTHS } from '@atw/api';
import { ClassFactory } from './class-factory';

describe('ClassFactory (L2-007, L2-019, L2-020, docs/adr/0019)', () => {
  it.each(TOUR_LENGTHS.map((length) => [length]))(
    'seats one classmate at each desk from 2 to %i, leaving desk 1 empty (L2-007 2, 4)',
    (tourLength) => {
      const seated = ClassFactory.build('zuri', tourLength);
      expect(seated.map((classmate) => classmate.desk)).toEqual(
        Array.from({ length: tourLength - 1 }, (_, index) => index + 2),
      );
    },
  );

  it.each([
    [6, [2, 3, 4, 5]],
    [12, [2, 4, 7, 10]],
    [24, [2, 7, 13, 19]],
  ] as const)(
    'puts the four kids not picked among the classmates of a tour of %i, at desks %j (L2-019 3)',
    (tourLength, desks) => {
      const seated = ClassFactory.build('zuri', tourLength);
      const kids = seated.filter((classmate) => classmate.profile.kid !== null);
      expect(kids.map((classmate) => classmate.profile.kid)).toEqual([
        'kenji',
        'nia',
        'milo',
        'pip',
      ]);
      expect(kids.map((classmate) => classmate.desk)).toEqual(desks);
    },
  );

  it.each(KID_IDS.map((kid) => [kid]))('never seats the kid the child picked (%s)', (picked) => {
    const seated = ClassFactory.build(picked, 12);
    expect(seated.some((classmate) => classmate.profile.kid === picked)).toBe(false);
    expect(new Set(seated.map((classmate) => classmate.profile.id)).size).toBe(11);
  });

  it.each(TOUR_LENGTHS.map((length) => [length]))(
    'gives a class of %i desks at least three skill levels (L2-020 1)',
    (tourLength) => {
      const skills = new Set(ClassFactory.build('milo', tourLength).map((c) => c.profile.skill));
      expect(skills.size).toBeGreaterThanOrEqual(3);
    },
  );

  it.each([
    ['zuri', 'bold'],
    ['kenji', 'planner'],
    ['nia', 'sprinter'],
    ['milo', 'accurate'],
    ['pip', 'dreamer'],
  ] as const)('gives %s characteristics that fit the kid: %s (L2-020 6)', (kid, trait) => {
    const picked = kid === 'zuri' ? 'pip' : 'zuri';
    const classmate = ClassFactory.build(picked, 12).find((c) => c.profile.kid === kid);
    expect(classmate?.profile.characteristics).toContain(trait);
  });
});
