import { computed, inject, Injectable, signal } from '@angular/core';
import {
  PLAYER_STORAGE,
  type GameSetup,
  type KidId,
  type Nickname,
  type PlayerChoices,
  type PlayerRecord,
} from '@atw/api';
import { defaultSetup } from '../tour/game-setup';

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
  readonly setup = computed(() => this.record().setup ?? defaultSetup());

  confirmKid(kid: KidId, nickname: Nickname): void {
    this.record.update((record) => ({ ...record, kid, nickname }));
    this.storage.write(this.record());
  }

  changeSetup(setup: GameSetup): void {
    this.record.update((record) => ({ ...record, setup }));
    this.storage.write(this.record());
  }
}
