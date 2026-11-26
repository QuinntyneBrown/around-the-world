import { type KidId } from './kid';

/**
 * One of the six stickers a watching player can send, by its id, in the order they are offered:
 * 1 "Go!", 2 "Wow!", 3 "Nice one", 4 "So close", 5 "Whoosh!", 6 "Beep boop!" (L2-028 criterion 6,
 * docs/adr/0035). A sticker travels as its id only, never as text.
 */
export type StickerId = 1 | 2 | 3 | 4 | 5 | 6;

/** A sticker as the room sends it to every player (`StickerShown`): its id and the sender's player id. */
export interface StickerMessage {
  readonly sticker: number;
  readonly from: string;
}

/**
 * A sticker received and showing at the edge of Duel: the sticker, the sender's kid and the
 * sender's name, "You" on the sender's own device (L2-028 criterion 3).
 */
export interface ShownSticker {
  /** Tells this sticker from the others showing. */
  readonly key: number;
  readonly sticker: StickerId;
  readonly kid: KidId;
  readonly from: string;
}

/** Whether a value read from the room is one of the six stickers' ids. */
export function isStickerId(value: unknown): value is StickerId {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6;
}
