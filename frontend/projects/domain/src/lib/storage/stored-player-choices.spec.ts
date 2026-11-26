import { TestBed } from '@angular/core/testing';
import { PLAYER_STORAGE, type PlayerRecord, type PlayerStorage } from '@atw/api';
import { StoredPlayerChoices } from './stored-player-choices';

class RecordingStorage implements PlayerStorage {
  reads = 0;
  readonly writes: PlayerRecord[] = [];
  constructor(private readonly kept: PlayerRecord) {}
  read(): PlayerRecord {
    this.reads += 1;
    return this.kept;
  }
  write(record: PlayerRecord): void {
    this.writes.push(record);
  }
}

function choicesWith(storage: PlayerStorage): StoredPlayerChoices {
  TestBed.configureTestingModule({
    providers: [StoredPlayerChoices, { provide: PLAYER_STORAGE, useValue: storage }],
  });
  return TestBed.inject(StoredPlayerChoices);
}

describe('StoredPlayerChoices', () => {
  it('reads the device once and offers what it keeps', () => {
    const storage = new RecordingStorage({ kid: 'nia', nickname: { adjective: 1, animal: 2 } });
    const choices = choicesWith(storage);
    expect(choices.kid()).toBe('nia');
    expect(choices.nickname()).toEqual({ adjective: 1, animal: 2 });
    expect(choices.kid()).toBe('nia');
    expect(storage.reads).toBe(1);
  });

  it('keeps a confirmed kid and nickname on the device', () => {
    const storage = new RecordingStorage({ kid: null, nickname: null });
    const choices = choicesWith(storage);

    choices.confirmKid('milo', { adjective: 8, animal: 5 });

    expect(choices.kid()).toBe('milo');
    expect(choices.nickname()).toEqual({ adjective: 8, animal: 5 });
    expect(storage.writes).toEqual([{ kid: 'milo', nickname: { adjective: 8, animal: 5 } }]);
  });
});
