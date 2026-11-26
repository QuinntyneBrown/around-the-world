import { type GameSetup } from '@atw/api';
import { GameSetupRules } from './game-setup-rules';

const DEFAULTS: GameSetup = {
  kinds: ['times'],
  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  tourLength: 12,
  cardSpeed: 'normal',
};

function setupWith(change: Partial<GameSetup>): GameSetup {
  return { ...DEFAULTS, ...change };
}

describe('GameSetupRules', () => {
  it('starts with Times, tables 2 to 10, a tour of 12 desks and Normal (L2-016 1, L2-017 1)', () => {
    expect(GameSetupRules.defaults()).toEqual(DEFAULTS);
  });

  describe('toggleKind (L2-016 2 and 3)', () => {
    it.each([
      ['turns Plus on beside Times', ['times'], 'plus', ['times', 'plus']],
      ['keeps the kinds in the order offered', ['divide'], 'times', ['times', 'divide']],
      ['turns Times off while Minus is on', ['times', 'minus'], 'times', ['minus']],
      ['turns Divide off', ['times', 'plus', 'divide'], 'divide', ['times', 'plus']],
    ] as const)('%s', (_case, kinds, kind, expected) => {
      const change = GameSetupRules.toggleKind(setupWith({ kinds }), kind);
      expect(change.setup.kinds).toEqual(expected);
      expect(change.refused).toBeNull();
    });

    it.each([['times'], ['plus'], ['minus'], ['divide']] as const)(
      'keeps %s on when it is the last kind on, and says it refused',
      (kind) => {
        const setup = setupWith({ kinds: [kind] });
        const change = GameSetupRules.toggleKind(setup, kind);
        expect(change.setup).toBe(setup);
        expect(change.refused).toBe('last-kind');
      },
    );

    it('leaves the tables as they were when Times goes off, so they return with it (L2-016 6)', () => {
      const off = GameSetupRules.toggleKind(
        setupWith({ kinds: ['times', 'plus'], tables: [7] }),
        'times',
      );
      expect(off.setup.tables).toEqual([7]);
      const on = GameSetupRules.toggleKind(off.setup, 'times');
      expect(on.setup).toEqual(setupWith({ kinds: ['times', 'plus'], tables: [7] }));
    });
  });

  describe('toggleTable (L2-016 2 and 3)', () => {
    it.each([
      ['turns 11 on', [2, 3], 11, [2, 3, 11]],
      ['keeps the tables in order', [5, 9], 7, [5, 7, 9]],
      ['turns 2 off', [2, 3], 2, [3]],
    ])('%s', (_case, tables, table, expected) => {
      const change = GameSetupRules.toggleTable(setupWith({ tables }), table);
      expect(change.setup.tables).toEqual(expected);
      expect(change.refused).toBeNull();
    });

    it('keeps the last table on, and says it refused', () => {
      const setup = setupWith({ tables: [7] });
      const change = GameSetupRules.toggleTable(setup, 7);
      expect(change.setup).toBe(setup);
      expect(change.refused).toBe('last-table');
    });

    it.each([
      ['a table that is not offered', 13],
      ['a table while Times is off', 4],
    ])('changes nothing for %s', (_case, table) => {
      const setup = setupWith(table === 4 ? { kinds: ['plus'] } : {});
      const change = GameSetupRules.toggleTable(setup, table);
      expect(change.setup).toBe(setup);
      expect(change.refused).toBeNull();
    });
  });

  describe('Easy and All (L2-016 4)', () => {
    it('Easy turns on 2, 3, 4, 5 and 10 only', () => {
      expect(GameSetupRules.easy(setupWith({ tables: [6, 7, 11] })).tables).toEqual([
        2, 3, 4, 5, 10,
      ]);
    });

    it('All turns on 2 to 12', () => {
      expect(GameSetupRules.all(DEFAULTS).tables).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it.each([
      ['Easy', GameSetupRules.easy],
      ['All', GameSetupRules.all],
    ])('%s changes nothing while Times is off', (_case, choose) => {
      const setup = setupWith({ kinds: ['minus'], tables: [8] });
      expect(choose(setup)).toBe(setup);
    });
  });

  describe('the tables while Times is off (L2-016 5)', () => {
    it.each([
      ['Times on', ['times', 'plus'], true, [3, 4]],
      ['Times off', ['plus'], false, []],
    ] as const)('with %s', (_case, kinds, enabled, inPlay) => {
      const setup = setupWith({ kinds, tables: [3, 4] });
      expect(GameSetupRules.tablesEnabled(setup)).toBe(enabled);
      expect(GameSetupRules.tablesInPlay(setup)).toEqual(inPlay);
    });
  });

  describe('the tour length and the card speed (L2-017 2 and 3)', () => {
    it.each([
      [6, 'Quick hop', 2],
      [12, 'Round the world', 5],
      [24, 'Grand tour', 10],
    ] as const)('a tour of %s desks is %s, about %s minutes', (length, name, minutes) => {
      expect(GameSetupRules.describeTour(length)).toEqual({ name, minutes });
    });

    it.each([
      ['chill', 10],
      ['normal', 6],
      ['lightning', 3],
    ] as const)('%s gives %s seconds per card', (speed, seconds) => {
      expect(GameSetupRules.secondsPerCard(speed)).toBe(seconds);
    });

    it.each([6, 12, 24] as const)('chooses a tour of %s desks', (tourLength) => {
      expect(GameSetupRules.chooseTourLength(DEFAULTS, tourLength).tourLength).toBe(tourLength);
    });

    it.each(['chill', 'normal', 'lightning'] as const)('chooses the speed %s', (cardSpeed) => {
      expect(GameSetupRules.chooseCardSpeed(DEFAULTS, cardSpeed).cardSpeed).toBe(cardSpeed);
    });
  });

  describe('read: a setup read back from the device (L2-015 2)', () => {
    it.each([
      ['the defaults', DEFAULTS],
      [
        'every kind, all tables, 24 desks, Lightning',
        {
          kinds: ['times', 'plus', 'minus', 'divide'],
          tables: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          tourLength: 24,
          cardSpeed: 'lightning',
        },
      ],
      ['Times off with tables kept', { ...DEFAULTS, kinds: ['minus'], tables: [9] }],
    ])('reads %s', (_case, value) => {
      expect(GameSetupRules.read(JSON.parse(JSON.stringify(value)))).toEqual(value);
    });

    it('puts kinds and tables in order and drops repeats', () => {
      expect(
        GameSetupRules.read({ ...DEFAULTS, kinds: ['plus', 'times', 'plus'], tables: [9, 2, 9] }),
      ).toEqual({
        ...DEFAULTS,
        kinds: ['times', 'plus'],
        tables: [2, 9],
      });
    });

    it.each([
      ['nothing', undefined],
      ['null', null],
      ['text', 'times'],
      ['a list', [1, 2]],
      ['no kind', { ...DEFAULTS, kinds: [] }],
      ['a kind not offered', { ...DEFAULTS, kinds: ['times', 'fractions'] }],
      ['kinds that are not a list', { ...DEFAULTS, kinds: 'times' }],
      ['no table', { ...DEFAULTS, tables: [] }],
      ['a table not offered', { ...DEFAULTS, tables: [2, 13] }],
      ['a table that is not whole', { ...DEFAULTS, tables: [2.5] }],
      ['a tour length not offered', { ...DEFAULTS, tourLength: 7 }],
      ['a tour length as text', { ...DEFAULTS, tourLength: '12' }],
      ['a card speed not offered', { ...DEFAULTS, cardSpeed: 'warp' }],
      ['no card speed', { kinds: ['times'], tables: [2], tourLength: 6 }],
    ])('gives null for %s', (_case, value) => {
      expect(GameSetupRules.read(value)).toBeNull();
    });
  });

  describe('same', () => {
    it.each([
      ['the same choices', {}, true],
      ['another kind', { kinds: ['plus'] }, false],
      ['another table', { tables: [2, 3] }, false],
      ['another tour length', { tourLength: 6 }, false],
      ['another card speed', { cardSpeed: 'chill' }, false],
    ] as const)('holds %s: %s', (_case, change, same) => {
      expect(GameSetupRules.same(DEFAULTS, setupWith(change))).toBe(same);
    });
  });
});
