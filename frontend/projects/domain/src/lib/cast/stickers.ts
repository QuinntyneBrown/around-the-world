import { type KidId, type StickerId } from '@atw/api';

/** A sticker as it is offered: its id, its words and whose it is, a kid's or Bolt's. */
export interface Sticker {
  readonly id: StickerId;
  readonly words: string;
  readonly kid: KidId | 'bolt';
}

/**
 * The six stickers, in the order they are offered: one for each kid and one for Bolt, Milo's
 * robot (L2-028 criterion 6, docs/adr/0035). Which the sixth is stays to confirm. Only the id
 * ever leaves the device.
 */
export const STICKERS: readonly Sticker[] = [
  { id: 1, words: 'Go!', kid: 'zuri' },
  { id: 2, words: 'Wow!', kid: 'nia' },
  { id: 3, words: 'Nice one', kid: 'kenji' },
  { id: 4, words: 'So close', kid: 'milo' },
  { id: 5, words: 'Whoosh!', kid: 'pip' },
  { id: 6, words: 'Beep boop!', kid: 'bolt' },
];

/** The sticker of an id. */
export function stickerById(id: StickerId): Sticker {
  return STICKERS[id - 1];
}
