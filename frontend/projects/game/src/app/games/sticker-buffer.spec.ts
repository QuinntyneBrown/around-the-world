import { type ShownSticker } from '@atw/api';
import { StickerBuffer, type ReceivedSticker } from './sticker-buffer';

function received(key: number, atMs: number): ReceivedSticker {
  const shown: ShownSticker = { key, sticker: 1, kid: 'zuri', from: 'You' };
  return { shown, atMs };
}

function keys(buffer: readonly ReceivedSticker[]): number[] {
  return buffer.map(({ shown }) => shown.key);
}

describe('StickerBuffer (L2-028 criteria 3 and 7, ADR 0035)', () => {
  it.each<[string, ReceivedSticker[], ReceivedSticker, number[]]>([
    ['the first sticker', [], received(1, 0), [1]],
    ['a second, newest last', [received(1, 0)], received(2, 500), [1, 2]],
    ['a third', [received(1, 0), received(2, 100)], received(3, 200), [1, 2, 3]],
    [
      'a fourth, which makes the oldest leave',
      [received(1, 0), received(2, 100), received(3, 200)],
      received(4, 300),
      [2, 3, 4],
    ],
    ['after the first has gone', [received(1, 0), received(2, 1500)], received(3, 2000), [2, 3]],
  ])('adds %s', (_, buffer, sticker, expected) => {
    expect(keys(StickerBuffer.add(buffer, sticker))).toEqual(expected);
  });

  it.each<[number, number[]]>([
    [0, [1, 2]],
    [1999, [1, 2]],
    [2000, [2]],
    [2999, [2]],
    [3000, []],
  ])('at %i ms shows %j', (nowMs, expected) => {
    expect(keys(StickerBuffer.showing([received(1, 0), received(2, 1000)], nowMs))).toEqual(
      expected,
    );
  });

  it('never holds more than three, however many arrive', () => {
    let buffer: readonly ReceivedSticker[] = [];
    for (let key = 1; key <= 1000; key++) buffer = StickerBuffer.add(buffer, received(key, key));
    expect(keys(buffer)).toEqual([998, 999, 1000]);
  });
});
