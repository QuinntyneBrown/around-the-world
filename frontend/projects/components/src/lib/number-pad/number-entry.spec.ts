import { NumberEntry } from './number-entry';

describe('NumberEntry (L2-010)', () => {
  it.each([
    ['', 2, '2'],
    ['2', 4, '24'],
    ['24', 0, '240'],
    ['240', 7, '240'],
  ])(
    'adds a digit to "%s" with %i: "%s" (criterion 2: a fourth is ignored)',
    (entry, digit, after) => {
      expect(NumberEntry.add(entry, digit)).toBe(after);
    },
  );

  it.each([
    ['24', '2'],
    ['2', ''],
    ['', ''],
  ])('removes the last digit of "%s": "%s" (criterion 3)', (entry, after) => {
    expect(NumberEntry.removeLast(entry)).toBe(after);
  });

  it.each([
    ['', null],
    ['0', 0],
    ['24', 24],
    ['007', 7],
  ])('reads "%s" as %s (criterion 4: no digit, no answer)', (entry, value) => {
    expect(NumberEntry.value(entry)).toBe(value);
  });
});
