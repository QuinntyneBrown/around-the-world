import { inject, Injectable } from '@angular/core';
import {
  DEVICE_STORAGE,
  isKidId,
  type Nickname,
  type PlayerRecord,
  type PlayerStorage,
} from '@atw/api';
import { NicknameGenerator } from './nickname-generator';

/** The one key the game keeps on the device (docs/adr/0011-player-record-on-the-device.md). */
export const PLAYER_KEY = 'atw.player';
const VERSION = 1;

const DEFAULTS: PlayerRecord = { kid: null, nickname: null };

/**
 * `PlayerStorage` on the browser's storage. It never throws: whatever it cannot read gives the
 * default (L2-015 criterion 2), and a stored nickname that is not from the lists is replaced
 * with a newly generated one and kept (L2-014 criterion 4).
 */
@Injectable()
export class LocalPlayerStorage implements PlayerStorage {
  private readonly storage = inject(DEVICE_STORAGE);
  private readonly nicknames = inject(NicknameGenerator);

  read(): PlayerRecord {
    const stored = this.readStored();
    if (stored === null) return DEFAULTS;

    const kid = isKidId(stored['kid']) ? stored['kid'] : null;
    const kept = stored['nickname'];
    if (this.nicknames.isValid(kept)) return { kid, nickname: { ...kept } };
    if ((kept === undefined || kept === null) && kid === null) return { kid, nickname: null };

    const replaced: PlayerRecord = { kid, nickname: this.nicknames.generate() };
    this.write(replaced);
    return replaced;
  }

  write(record: PlayerRecord): void {
    const nickname: Nickname | null = record.nickname
      ? { adjective: record.nickname.adjective, animal: record.nickname.animal }
      : null;
    try {
      this.storage?.setItem(
        PLAYER_KEY,
        JSON.stringify({ version: VERSION, kid: record.kid, nickname }),
      );
    } catch {
      // A full or blocked storage: the choice lasts for this visit only.
    }
  }

  private readStored(): Record<string, unknown> | null {
    try {
      const text = this.storage?.getItem(PLAYER_KEY) ?? null;
      if (text === null) return null;
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
      const record = parsed as Record<string, unknown>;
      return record['version'] === VERSION ? record : null;
    } catch {
      return null;
    }
  }
}
