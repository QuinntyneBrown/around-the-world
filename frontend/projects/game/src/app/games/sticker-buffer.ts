import { type ShownSticker } from '@atw/api';

/** How many stickers show at once; a fourth makes the oldest leave (L2-028 7, ADR 0035). */
export const STICKERS_SHOWN = 3;
/** How long a sticker shows, on the game's clock (L2-028 criterion 3). */
export const STICKER_LASTS_MS = 2000;

/** A sticker received, and when on the game's clock. */
export interface ReceivedSticker {
  readonly shown: ShownSticker;
  readonly atMs: number;
}

/**
 * The stickers a game with friends holds: a buffer of at most three, each kept for 2 seconds of
 * the game's clock, so a flood of stickers never grows memory (L2-028 criteria 3 and 7, L2-048
 * criterion 5, docs/adr/0035).
 */
export const StickerBuffer = {
  /** The buffer with the sticker added last, without those gone and beyond the newest three. */
  add(buffer: readonly ReceivedSticker[], sticker: ReceivedSticker): readonly ReceivedSticker[] {
    return [...StickerBuffer.showing(buffer, sticker.atMs), sticker].slice(-STICKERS_SHOWN);
  },

  /** The stickers still showing at the time, oldest first. */
  showing(buffer: readonly ReceivedSticker[], nowMs: number): readonly ReceivedSticker[] {
    return buffer.filter(({ atMs }) => nowMs - atMs < STICKER_LASTS_MS);
  },
};
