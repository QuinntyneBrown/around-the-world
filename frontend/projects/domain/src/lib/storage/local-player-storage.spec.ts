import { TestBed } from '@angular/core/testing';
import { DEVICE_STORAGE, type PlayerRecord } from '@atw/api';
import { LocalPlayerStorage, PLAYER_KEY } from './local-player-storage';
import { NicknameGenerator } from './nickname-generator';

/** An in-memory `Storage`, or one whose every call throws. */
class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  constructor(private readonly broken = false) {}
  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    if (this.broken) throw new DOMException('blocked', 'SecurityError');
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.broken) throw new DOMException('full', 'QuotaExceededError');
    this.items.set(key, value);
  }
}

function storageWith(storage: Storage | null): LocalPlayerStorage {
  TestBed.configureTestingModule({
    providers: [
      LocalPlayerStorage,
      { provide: DEVICE_STORAGE, useValue: storage },
      // The "newly generated" nickname is always Turbo Yak.
      { provide: NicknameGenerator, useValue: new NicknameGenerator(() => 0.99) },
    ],
  });
  return TestBed.inject(LocalPlayerStorage);
}

const NONE: PlayerRecord = { kid: null, nickname: null };
const TURBO_YAK = { adjective: 9, animal: 9 };

describe('LocalPlayerStorage', () => {
  it.each([
    ['nothing kept', null, NONE],
    ['unreadable JSON', '{not json', NONE],
    ['a list', '[1,2]', NONE],
    ['another version', '{"version":2,"kid":"nia","nickname":{"adjective":1,"animal":1}}', NONE],
    [
      'a kept kid and nickname',
      '{"version":1,"kid":"milo","nickname":{"adjective":2,"animal":3}}',
      { kid: 'milo', nickname: { adjective: 2, animal: 3 } },
    ],
    [
      'an unknown kid',
      '{"version":1,"kid":"zed","nickname":{"adjective":2,"animal":3}}',
      { kid: null, nickname: { adjective: 2, animal: 3 } },
    ],
    [
      'a nickname off the lists',
      '{"version":1,"kid":"pip","nickname":{"adjective":12,"animal":3}}',
      { kid: 'pip', nickname: TURBO_YAK },
    ],
    [
      'a nickname kept as text',
      '{"version":1,"kid":"pip","nickname":"xX_Zuri_2014_Xx"}',
      { kid: 'pip', nickname: TURBO_YAK },
    ],
    ['a kid with no nickname', '{"version":1,"kid":"nia"}', { kid: 'nia', nickname: TURBO_YAK }],
  ])('reads %s', (_case, text, expected) => {
    const memory = new MemoryStorage();
    if (text !== null) memory.setItem(PLAYER_KEY, text);
    expect(storageWith(memory).read()).toEqual(expected);
  });

  it('keeps the nickname that replaced one off the lists', () => {
    const memory = new MemoryStorage();
    memory.setItem(PLAYER_KEY, '{"version":1,"kid":"pip","nickname":{"adjective":12,"animal":3}}');
    storageWith(memory).read();
    expect(JSON.parse(memory.getItem(PLAYER_KEY) ?? '')).toEqual({
      version: 1,
      kid: 'pip',
      nickname: TURBO_YAK,
    });
  });

  it('writes only the kid and the nickname, as indexes, under its one key', () => {
    const memory = new MemoryStorage();
    storageWith(memory).write({ kid: 'kenji', nickname: { adjective: 4, animal: 1 } });
    expect(memory.length).toBe(1);
    expect(JSON.parse(memory.getItem(PLAYER_KEY) ?? '')).toEqual({
      version: 1,
      kid: 'kenji',
      nickname: { adjective: 4, animal: 1 },
    });
  });

  it.each([
    ['unavailable', null],
    ['throwing', new MemoryStorage(true)],
  ])('gives the defaults and never throws when the storage is %s', (_case, storage) => {
    const player = storageWith(storage);
    expect(player.read()).toEqual(NONE);
    expect(() => player.write({ kid: 'zuri', nickname: TURBO_YAK })).not.toThrow();
  });
});
