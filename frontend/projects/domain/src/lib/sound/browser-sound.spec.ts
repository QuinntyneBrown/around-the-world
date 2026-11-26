import { DOCUMENT, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PLAYER_CHOICES, type PlayerChoices } from '@atw/api';
import { BrowserSound } from './browser-sound';

/** An audio element that records what is done to it and never makes a noise. */
class FakeAudio {
  static made: FakeAudio[] = [];
  static refuses = false;
  currentTime = 0;
  preload = '';
  plays = 0;
  loads = 0;
  paused = true;
  private src: string | null;

  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }

  getAttribute(name: string): string | null {
    return name === 'src' ? this.src : null;
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = null;
  }

  play(): Promise<void> {
    this.plays += 1;
    this.paused = false;
    return FakeAudio.refuses
      ? Promise.reject(new DOMException('No touch yet', 'NotAllowedError'))
      : Promise.resolve();
  }

  pause(): void {
    this.paused = true;
  }

  load(): void {
    this.loads += 1;
  }
}

/** The game's sounds, one case per rule of docs/adr/0029-motion-and-sound.md. */
describe('BrowserSound', () => {
  beforeEach(() => {
    FakeAudio.made = [];
    FakeAudio.refuses = false;
  });

  function soundWith(options: { touched?: boolean | null; muted?: boolean } = {}) {
    const touched = options.touched === undefined ? true : options.touched;
    const muted = signal(options.muted ?? false);
    const navigator = touched === null ? {} : { userActivation: { hasBeenActive: touched } };
    const document = { defaultView: { Audio: FakeAudio, navigator } };
    TestBed.configureTestingModule({
      providers: [
        BrowserSound,
        { provide: DOCUMENT, useValue: document },
        { provide: PLAYER_CHOICES, useValue: { soundMuted: muted } as unknown as PlayerChoices },
      ],
    });
    return { sound: TestBed.inject(BrowserSound), muted, navigator };
  }

  const made = (name: string) => FakeAudio.made.find((audio) => audio.getAttribute('src') === name);

  it('plays nothing, and fetches nothing, before the child has touched the page (L2-039 3)', () => {
    const { sound } = soundWith({ touched: false });
    sound.play('pop');
    expect(FakeAudio.made).toEqual([]);
  });

  it('plays a sound once the child has touched the page, from its start (L2-039 1)', () => {
    const { sound } = soundWith();
    sound.play('chime');
    const chime = made('sounds/chime.wav')!;
    expect(chime.plays).toBe(1);
    chime.currentTime = 0.3;
    sound.play('chime');
    expect(chime.plays).toBe(2);
    expect(chime.currentTime).toBe(0);
  });

  it('makes the three sounds on the first one it plays, and no more after', () => {
    const { sound } = soundWith();
    sound.play('pop');
    sound.play('jingle');
    expect(FakeAudio.made.map((audio) => audio.getAttribute('src'))).toEqual([
      'sounds/pop.wav',
      'sounds/chime.wav',
      'sounds/jingle.wav',
    ]);
    expect(FakeAudio.made.every((audio) => audio.preload === 'auto')).toBe(true);
  });

  it('plays nothing while muted, and plays again once sound is turned on (L2-039 2)', () => {
    const { sound, muted } = soundWith({ muted: true });
    sound.play('jingle');
    expect(FakeAudio.made).toEqual([]);
    muted.set(false);
    sound.play('jingle');
    expect(made('sounds/jingle.wav')!.plays).toBe(1);
  });

  it('plays where the browser does not say whether the page was touched', () => {
    const { sound } = soundWith({ touched: null });
    sound.play('pop');
    expect(made('sounds/pop.wav')!.plays).toBe(1);
  });

  it('ignores a sound the browser refuses to play', async () => {
    FakeAudio.refuses = true;
    const { sound } = soundWith();
    expect(() => sound.play('pop')).not.toThrow();
    await Promise.resolve();
  });

  it('lets every sound go when it is destroyed (L2-048 3)', () => {
    const { sound } = soundWith();
    sound.play('pop');
    TestBed.resetTestingModule();
    for (const audio of FakeAudio.made) {
      expect(audio.paused).toBe(true);
      expect(audio.getAttribute('src')).toBeNull();
      expect(audio.loads).toBe(1);
    }
  });
});
