import { expect, test as base, type Page, type Route, type WebSocketRoute } from '@playwright/test';
import { installBrowserFakes, type MicrophoneSetting } from './fakes/browser-fakes';

/**
 * The shared fixture (docs/adr/0006-playwright-fixture.md). Every spec imports `test` and
 * `expect` from here. It gives each spec:
 *
 * - `voice`: a fake speech recognizer that says what the spec tells it to;
 * - `microphone`: a fake microphone permission (no real microphone is ever opened);
 * - `model`: a fake on-device model that answers as the spec tells it to;
 * - `backend`: API and hub requests answered from fixtures (no real backend or database);
 * - `device`: what the game keeps on the device (docs/adr/0011-player-record-on-the-device.md);
 * - `pictures`: the game's pictures on localhost, held back or refused when a spec asks;
 * - `classroom`: the 3D classroom's scenes on localhost, held back or refused when a spec asks,
 *   WebGL taken away, and the WebGL contexts still open (docs/adr/0028);
 * - `sound`: the sounds the game played, never heard, and its audio elements still open
 *   (docs/adr/0029);
 * - `clock`: the game's clock, held still and moved on by the spec (docs/adr/0020);
 * - `random`: `Math.random`, fixed by the spec so a classmate answers as it needs (ADR 0020).
 *
 * It fails the spec on an unexpected microphone call, an unanswered API or hub request, a
 * request off localhost, or a page error.
 */
type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface FakeVoice {
  /** The recognizer hears the words; resolves to how many recognizers were listening. */
  say(transcript: string): Promise<number>;
  /** The browser has no speech recognition, so the number pad is the way to answer. */
  unsupported(): Promise<void>;
  /** The recognizers listening hear no speech (Chrome's `no-speech`); resolves to how many. */
  silence(): Promise<number>;
  /** The recognizers listening fail with the browser's error (`network` by default). */
  fail(error?: string): Promise<number>;
  /** How many recognizers are listening now. */
  listening(): Promise<number>;
}

export interface FakeMicrophone {
  grant(): Promise<void>;
  deny(): Promise<void>;
  /** The browser's question about the microphone stays open until `grant` or `deny`. */
  ask(): Promise<void>;
  /** How many microphone streams the game opened and has not closed. */
  openStreams(): Promise<number>;
}

export interface FakeModel {
  /** The model is available and gives these replies, in order, one per prompt. */
  answers(...replies: string[]): Promise<void>;
  /** The model can be downloaded but is not there yet. */
  downloadable(): Promise<void>;
  /** How many sessions were created and destroyed. */
  sessions(): Promise<{ created: number; destroyed: number }>;
}

export interface FakeBackend {
  /** Answers `method path` (e.g. `POST /api/rooms`) with a JSON body and a status. */
  answer(method: string, path: string, body?: Json, status?: number): void;
  /** Takes over the hub's WebSocket at a path (e.g. `/hubs/room`). */
  hub(path: string, handler: (socket: WebSocketRoute) => void): void;
}

/** The player's record as the game keeps it on the device (ADR 0011). */
export interface KeptRecord {
  version: number;
  kid?: string | null;
  nickname?: { adjective: number; animal: number } | null;
  setup?: { kinds: string[]; tables: number[]; tourLength: number; cardSpeed: string } | null;
  wayOfAnswering?: 'voice' | 'numberPad';
  soundMuted?: boolean;
}

export interface FakeDevice {
  /** The device already keeps this record (or this raw text) when the game first opens. */
  keeps(record: KeptRecord | string): Promise<void>;
  /** The browser's storage cannot be reached: reading it throws. */
  storageUnavailable(): Promise<void>;
  /** What the device keeps now: the parsed record, or null when nothing is kept. */
  kept(): Promise<KeptRecord | null>;
  /** Every key the game keeps on the device. */
  keys(): Promise<string[]>;
}

export interface FakePictures {
  /** Holds back the pictures whose path matches until the returned function is called. */
  holdBack(pattern: RegExp): () => void;
  /** Refuses the pictures whose path matches until the returned function is called. */
  refuse(pattern: RegExp): () => void;
}

export interface FakeClassroom {
  /** The browser gives no WebGL context, so the classroom cannot be drawn (L2-036 3). */
  cannotDraw(): Promise<void>;
  /** Holds back the classroom's scenes until the returned function is called. */
  holdBack(): () => void;
  /** Refuses the classroom's scenes, so they fail to load. */
  refuse(): () => void;
  /** How many WebGL contexts the game opened and has not released (L2-048 criterion 3). */
  openContexts(): Promise<number>;
}

export interface FakeSound {
  /** The sounds the game played, in order, by name: `pop`, `chime`, `jingle` (L2-039). */
  played(): Promise<string[]>;
  /** How many audio elements the game made and has not let go (L2-048 criterion 3). */
  openSounds(): Promise<number>;
}

export interface FakeClock {
  /** Holds the game's clock still (the page's `Date.now`); the browser's timers keep running. */
  hold(): Promise<void>;
  /** Moves the held clock on by that many milliseconds. */
  pass(ms: number): Promise<void>;
}

export interface FakeRandom {
  /**
   * `Math.random` always returns this value: 0 makes a classmate answer right at its fastest,
   * 0.999 wrong at its slowest (docs/adr/0019-classmate-profiles.md).
   */
  always(value: number): Promise<void>;
  /**
   * From now on the page's `Math.random` throws, as a broken browser would: the next flash
   * card breaks the game (docs/adr/0027). The fixture expects the error the game logs.
   */
  breaks(): Promise<void>;
}

interface Fixtures {
  problems: string[];
  /** Console errors a spec has set up, which are not problems. */
  expectedErrors: RegExp[];
  clock: FakeClock;
  random: FakeRandom;
  device: FakeDevice;
  pictures: FakePictures;
  classroom: FakeClassroom;
  sound: FakeSound;
  voice: FakeVoice;
  microphone: FakeMicrophone;
  model: FakeModel;
  backend: FakeBackend;
}

/** Where a held clock starts: any fixed moment will do. */
const HELD_AT = Date.parse('2026-01-05T09:00:00Z');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const PLAYER_KEY = 'atw.player';
const BACKEND_PATH = /^\/(api|hubs)\//;
/** Where the classroom's scenes are served from (docs/adr/0028). */
const CLASSROOM_SCENES = /^\/classroom\//;

/** A change to the fakes in the page. */
interface FakesPatch {
  microphone?: MicrophoneSetting;
  speechSupported?: boolean;
  modelAvailability?: 'downloadable' | 'available';
  modelReplies?: string[];
  webglSupported?: boolean;
}

function applyPatch(patch: FakesPatch): void {
  const fakes = window.__atwFakes;
  if (patch.microphone !== undefined) fakes.microphone = patch.microphone;
  if (patch.speechSupported !== undefined) fakes.speechSupported = patch.speechSupported;
  if (patch.modelAvailability !== undefined) fakes.modelAvailability = patch.modelAvailability;
  if (patch.modelReplies !== undefined) fakes.modelReplies.push(...patch.modelReplies);
  if (patch.webglSupported !== undefined) fakes.webglSupported = patch.webglSupported;
}

/** Changes the fakes now (when a page is open) and again on every page loaded after. */
async function setFake(page: Page, patch: FakesPatch): Promise<void> {
  await page.addInitScript(applyPatch, patch);
  if (page.url() !== 'about:blank') await page.evaluate(applyPatch, patch);
}

/** Pictures held back or refused by a spec, by the path they match. */
class PictureFixtures implements FakePictures {
  readonly rules: { pattern: RegExp; mode: 'hold' | 'refuse'; waiting: Route[] }[] = [];

  holdBack(pattern: RegExp): () => void {
    return this.add(pattern, 'hold');
  }

  refuse(pattern: RegExp): () => void {
    return this.add(pattern, 'refuse');
  }

  /** Handles a request when a rule matches it; false lets it through. */
  handle(route: Route, path: string): boolean {
    const rule = this.rules.find((candidate) => candidate.pattern.test(path));
    if (!rule) return false;
    if (rule.mode === 'refuse') void route.abort('failed');
    else rule.waiting.push(route);
    return true;
  }

  private add(pattern: RegExp, mode: 'hold' | 'refuse'): () => void {
    const rule = { pattern, mode, waiting: [] as Route[] };
    this.rules.push(rule);
    return () => {
      this.rules.splice(this.rules.indexOf(rule), 1);
      for (const route of rule.waiting.splice(0)) void route.continue().catch(() => undefined);
    };
  }
}

class BackendFixtures implements FakeBackend {
  readonly answers = new Map<string, { body: Json; status: number }>();
  readonly hubs = new Map<string, (socket: WebSocketRoute) => void>();

  answer(method: string, path: string, body: Json = null, status = 200): void {
    this.answers.set(`${method.toUpperCase()} ${path}`, { body, status });
  }

  hub(path: string, handler: (socket: WebSocketRoute) => void): void {
    this.hubs.set(path, handler);
  }
}

/** Answers API and hub requests from the spec's fixtures and refuses anything off localhost. */
async function guardRequests(
  page: Page,
  backend: BackendFixtures,
  pictures: PictureFixtures,
  problems: string[],
) {
  await page.route('**/*', async (route: Route) => {
    const url = new URL(route.request().url());
    if (!LOCAL_HOSTS.has(url.hostname)) {
      problems.push(`Request off localhost: ${route.request().method()} ${url.origin}`);
      return route.abort('blockedbyclient');
    }
    if (pictures.handle(route, url.pathname)) return;
    if (!BACKEND_PATH.test(url.pathname)) return route.continue();
    const key = `${route.request().method()} ${url.pathname}`;
    const answer = backend.answers.get(key);
    if (!answer) {
      problems.push(`Unanswered request: ${key}`);
      return route.abort('failed');
    }
    return route.fulfill({ status: answer.status, json: answer.body });
  });

  await page.routeWebSocket(/.*/, (socket) => {
    const url = new URL(socket.url());
    if (!LOCAL_HOSTS.has(url.hostname)) {
      problems.push(`WebSocket off localhost: ${url.origin}`);
      return socket.close();
    }
    const handler = backend.hubs.get(url.pathname);
    if (handler) return handler(socket);
    problems.push(`Unanswered WebSocket: ${url.pathname}`);
    return socket.close();
  });
}

export const test = base.extend<Fixtures>({
  // eslint-disable-next-line no-empty-pattern
  problems: async ({}, use) => {
    await use([]);
  },

  // eslint-disable-next-line no-empty-pattern
  expectedErrors: async ({}, use) => {
    await use([]);
  },

  // eslint-disable-next-line no-empty-pattern
  backend: async ({}, use) => {
    await use(new BackendFixtures());
  },

  // eslint-disable-next-line no-empty-pattern
  pictures: async ({}, use) => {
    await use(new PictureFixtures());
  },

  page: async ({ page, problems, expectedErrors, backend, pictures }, use) => {
    await page.addInitScript(installBrowserFakes);
    await guardRequests(page, backend as BackendFixtures, pictures as PictureFixtures, problems);
    page.on('pageerror', (error) => problems.push(`Page error: ${error.message}`));
    // Angular's global error listeners hand an uncaught error to its ErrorHandler, which
    // logs it instead of letting it reach the browser as a page error. A failed resource
    // load is the request guard's business, and a refused answer may be what a spec set up.
    page.on('console', (message) => {
      const text = message.text();
      if (message.type() !== 'error' || text.startsWith('Failed to load resource')) return;
      if (expectedErrors.some((expected) => expected.test(text))) return;
      problems.push(`Page error: ${text}`);
    });

    await use(page);

    if (!page.isClosed()) {
      const inPage = await page
        .evaluate(() => window.__atwFakes?.problems ?? [])
        .catch(() => [] as string[]);
      problems.push(...inPage);
    }
    expect(problems, 'The spec met something it did not set up').toEqual([]);
  },

  device: async ({ page }, use) => {
    const readKept = () =>
      page
        .evaluate((key) => localStorage.getItem(key), PLAYER_KEY)
        .then((text) => {
          return text === null ? null : (JSON.parse(text) as KeptRecord);
        });
    await use({
      keeps: async (record) => {
        await page.addInitScript(
          ([key, text]) => {
            // Only before the game first writes, so a reload finds what the game kept.
            if (localStorage.getItem(key) === null) localStorage.setItem(key, text);
          },
          [PLAYER_KEY, typeof record === 'string' ? record : JSON.stringify(record)] as const,
        );
      },
      storageUnavailable: async () => {
        await page.addInitScript(() => {
          Object.defineProperty(window, 'localStorage', {
            get() {
              throw new DOMException('The storage is blocked', 'SecurityError');
            },
          });
        });
      },
      kept: readKept,
      keys: () => page.evaluate(() => Object.keys(localStorage)),
    });
  },

  clock: async ({ page }, use) => {
    let now = HELD_AT;
    await use({
      hold: () => page.clock.setFixedTime(now),
      pass: async (ms) => {
        now += ms;
        await page.clock.setFixedTime(now);
      },
    });
  },

  random: async ({ page, expectedErrors }, use) => {
    await use({
      always: async (value) => {
        await page.addInitScript((fixed) => {
          Math.random = () => fixed;
        }, value);
      },
      breaks: async () => {
        expectedErrors.push(/Math\.random broke/);
        await page.evaluate(() => {
          Math.random = () => {
            throw new Error('Math.random broke');
          };
        });
      },
    });
  },

  classroom: async ({ page, pictures }, use) => {
    await use({
      cannotDraw: () => setFake(page, { webglSupported: false }),
      holdBack: () => pictures.holdBack(CLASSROOM_SCENES),
      refuse: () => pictures.refuse(CLASSROOM_SCENES),
      openContexts: () => page.evaluate(() => window.__atwFakes.openContexts()),
    });
  },

  sound: async ({ page }, use) => {
    await use({
      played: () => page.evaluate(() => [...window.__atwFakes.played]),
      openSounds: () => page.evaluate(() => window.__atwFakes.openSounds()),
    });
  },

  voice: async ({ page }, use) => {
    await use({
      say: (transcript) => page.evaluate((words) => window.__atwFakes.say(words), transcript),
      unsupported: () => setFake(page, { speechSupported: false }),
      silence: () => page.evaluate(() => window.__atwFakes.silence()),
      fail: (error = 'network') => page.evaluate((code) => window.__atwFakes.fail(code), error),
      listening: () => page.evaluate(() => window.__atwFakes.listening()),
    });
  },

  microphone: async ({ page }, use) => {
    await use({
      grant: () => setFake(page, { microphone: 'granted' }),
      deny: () => setFake(page, { microphone: 'denied' }),
      ask: () => setFake(page, { microphone: 'asking' }),
      openStreams: () => page.evaluate(() => window.__atwFakes.openTracks()),
    });
  },

  model: async ({ page }, use) => {
    await use({
      answers: (...replies) =>
        setFake(page, { modelAvailability: 'available', modelReplies: replies }),
      downloadable: () => setFake(page, { modelAvailability: 'downloadable' }),
      sessions: () => page.evaluate(() => ({ ...window.__atwFakes.modelSessions })),
    });
  },
});

export { expect };
