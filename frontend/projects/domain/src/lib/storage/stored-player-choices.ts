import { computed, inject, Injectable, signal } from '@angular/core';
import {
  PLAYER_STORAGE,
  type KidId,
  type Nickname,
  type PlayerChoices,
  type PlayerRecord,
} from '@atw/api';

/**
 * `PlayerChoices` kept on the device: it reads `PLAYER_STORAGE` once, when the game opens, and
 * writes the whole record each time a choice changes. The whole game shares it.
 */
@Injectable()
export class StoredPlayerChoices implements PlayerChoices {
  private readonly storage = inject(PLAYER_STORAGE);
  private readonly record = signal<PlayerRecord>(this.storage.read());

  readonly kid = computed(() => this.record().kid);
  readonly nickname = computed(() => this.record().nickname);

  confirmKid(kid: KidId, nickname: Nickname): void {
    this.record.update((record) => ({ ...record, kid, nickname }));
    this.storage.write(this.record());
  }
}
