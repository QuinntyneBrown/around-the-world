import { InjectionToken, type Signal } from '@angular/core';
import { type GameSetup } from './game-setup';
import { type KidId } from './kid';
import { type Nickname } from './nickname';
import { type AnswerWay } from './voice';

/**
 * Everything the game keeps on the device (L2-015 criterion 4): the kid, the nickname, the
 * setup and the way of answering; the sound setting joins it with its journey
 * (docs/adr/0011-player-record-on-the-device.md, docs/adr/0017-game-setup-rules-and-states.md).
 */
export interface PlayerRecord {
  readonly kid: KidId | null;
  readonly nickname: Nickname | null;
  /** The setup the child last changed, or null (absent) when they never changed it. */
  readonly setup?: GameSetup | null;
  /** The way of answering the child chose, or absent when they never chose (docs/adr/0025). */
  readonly wayOfAnswering?: AnswerWay;
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
  /** The setup as the child left it, or the defaults (L2-016 criterion 1, L2-017 criterion 1). */
  readonly setup: Signal<GameSetup>;
  /** Keeps the kid and the nickname the child confirmed on Pick Your Kid (L2-013 criterion 3). */
  confirmKid(kid: KidId, nickname: Nickname): void;
  /** Keeps a changed setup on the device (L2-015 criterion 3). */
  changeSetup(setup: GameSetup): void;
  /** The way of answering kept on the device, voice until the child chooses (L2-015 4). */
  readonly wayOfAnswering: Signal<AnswerWay>;
  /** Keeps the way of answering on the device the moment it changes (L2-032 criterion 4). */
  changeWayOfAnswering(way: AnswerWay): void;
}

export const PLAYER_CHOICES = new InjectionToken<PlayerChoices>('PLAYER_CHOICES');

/** The browser's storage on the device, or null when it cannot be reached. */
export const DEVICE_STORAGE = new InjectionToken<Storage | null>('DEVICE_STORAGE');
