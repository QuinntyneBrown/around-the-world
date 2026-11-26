import { InjectionToken, type Signal } from '@angular/core';
import { type KidId } from './kid';
import { type Nickname } from './nickname';

/**
 * Everything the game keeps on the device (L2-015 criterion 4). Journey 02 keeps the kid and
 * the nickname; the setup, the way of answering and the sound setting join it with their
 * journeys (docs/adr/0011-player-record-on-the-device.md).
 */
export interface PlayerRecord {
  readonly kid: KidId | null;
  readonly nickname: Nickname | null;
}

/** Reads and writes the player's record on the device. Neither method throws. */
export interface PlayerStorage {
  /** The record kept on the device, with the default for any field it cannot read. */
  read(): PlayerRecord;
  /** Keeps the record, ignoring a storage that cannot be written. */
  write(record: PlayerRecord): void;
}

export const PLAYER_STORAGE = new InjectionToken<PlayerStorage>('PLAYER_STORAGE');

/** The player's current choices, read once from the device and kept on every change. */
export interface PlayerChoices {
  readonly kid: Signal<KidId | null>;
  readonly nickname: Signal<Nickname | null>;
  /** Keeps the kid and the nickname the child confirmed on Pick Your Kid (L2-013 criterion 3). */
  confirmKid(kid: KidId, nickname: Nickname): void;
}

export const PLAYER_CHOICES = new InjectionToken<PlayerChoices>('PLAYER_CHOICES');

/** The browser's storage on the device, or null when it cannot be reached. */
export const DEVICE_STORAGE = new InjectionToken<Storage | null>('DEVICE_STORAGE');
