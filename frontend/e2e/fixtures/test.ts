import { expect, test as base, type Page, type Route, type WebSocketRoute } from '@playwright/test';
import {
  installBrowserFakes,
  type MicrophoneSetting,
  type ModelAvailability,
} from './fakes/browser-fakes';

/**
 * The shared fixture (docs/adr/0006-playwright-fixture.md). Every spec imports `test` and
 * `expect` from here. It gives each spec:
 *
 * - `voice`: a fake speech recognizer that says what the spec tells it to;
 * - `microphone`: a fake microphone permission (no real microphone is ever opened);
 * - `model`: a fake on-device model that answers as the spec tells it to;
 * - `backend`: API and hub requests answered from fixtures (no real backend or database), held
 *   back or left unanswered as an unreachable backend, and the record of what the game sent;
 * - `roomHub`: the room hub's WebSocket (`/hubs/room`), speaking SignalR's JSON protocol: it
 *   sends the room and the game the spec sets, holds it back, refuses or drops connections,
 *   holds back or refuses a method, and records the
 *   tokens presented and the methods invoked (docs/adr/0032);
 * - `clipboard`: what the game copied, or a clipboard that refuses (docs/adr/0032);
 * - `network`: the device's network, taken away and given back (`navigator.onLine`);
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
  /** The model is available, and each prompt waits until the spec calls `reply` (a slow model). */
  holds(): Promise<void>;
  /** Answers the oldest waiting prompt with the text; resolves to how many it answered. */
  reply(text: string): Promise<number>;
  /** How many prompts are waiting for a reply. */
  waiting(): Promise<number>;
  /** How many prompts the game aborted while they waited. */
  aborted(): Promise<number>;
  /** The model is available, and every prompt fails. */
  fails(): Promise<void>;
  /** The model can be downloaded but is not there yet. */
  downloadable(): Promise<void>;
  /** The browser has no on-device model at all: `LanguageModel` is missing. */
  missing(): Promise<void>;
  /**
   * How many primed sessions were created and destroyed, and how many sessions and clones are
   * still open.
   */
  sessions(): Promise<{ created: number; destroyed: number; open: number }>;
  /** Every text the game gave the model: each session's system prompt and each prompt. */
  asked(): Promise<string[]>;
}

export interface FakeBackend {
  /** Answers `method path` (e.g. `POST /api/rooms`) with a JSON body and a status, from now on. */
  answer(method: string, path: string, body?: Json, status?: number): void;
  /** Holds the answers to `method path` until the returned function is called. */
  holdBack(method: string, path: string): () => void;
  /** `method path` gets no response at all, as when the backend cannot be reached, until answered. */
  unreachable(method: string, path: string): void;
  /** Every API request the game sent, in order, with its JSON body. */
  requests(): { method: string; path: string; body: Json }[];
  /** Takes over the hub's WebSocket at a path (e.g. `/hubs/room`). */
  hub(path: string, handler: (socket: WebSocketRoute) => void): void;
}

/**
 * The room hub (docs/adr/0032-joining-a-room-and-the-lobby.md): each connection is answered in
 * SignalR's JSON protocol, as the backend's `RoomHub` answers it.
 */
export interface FakeRoomHub {
  /** Each connection, once its handshake is done, receives this room (`RoomChanged`). */
  serves(room: Json): void;
  /** New connections wait for the room until the returned function is called. */
  holdBack(): () => void;
  /** Every new connection is closed at once for good, as for a token that names no player. */
  refuses(): void;
  /** Sends the room's new state to every open connection, and to every later one. */
  changes(room: Json): void;
  /** Closes every open connection for good, as when the room cannot be got back. */
  drop(): void;
  /** The connection tokens the connections presented, in order. */
  tokens(): string[];
  /** The hub methods the game invoked, in order. */
  invoked(): string[];
  /** The hub methods the game invoked with the arguments it sent, in order (L2-040 criterion 1). */
  invocations(): { target: string; args: Json[] }[];
  /** The answers to the method wait until the returned function is called. */
  holdBackMethod(target: string): () => void;
  /** The method is refused with a hub error holding the code, as the backend refuses it. */
  refusesMethod(target: string, code: string): void;
  /** The method is answered again after `refusesMethod`. */
  acceptsMethod(target: string): void;
  /** Sends the game's new state (`GameChanged`) to every open connection, and to every later one. */
  game(state: object | null): void;
  /** How many connections are open now. */
  openConnections(): number;
}

export interface FakeClipboard {
  /** Copying fails, as in a browser that refuses the clipboard. */
  refuses(): Promise<void>;
  /** What the game copied, in order. */
  copied(): Promise<string[]>;
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

export interface FakeNetwork {
  /** The device loses its network: `navigator.onLine` is false and every request fails. */
  offline(): Promise<void>;
  /** The device has its network back. */
  online(): Promise<void>;
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
  roomHub: FakeRoomHub;
  clipboard: FakeClipboard;
  network: FakeNetwork;
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
  modelAvailability?: ModelAvailability;
  modelWhenNoReply?: 'problem' | 'hold' | 'fail';
  modelReplies?: string[];
  webglSupported?: boolean;
  clipboardWorks?: boolean;
}

function applyPatch(patch: FakesPatch): void {
  const fakes = window.__atwFakes;
  if (patch.microphone !== undefined) fakes.microphone = patch.microphone;
  if (patch.speechSupported !== undefined) fakes.speechSupported = patch.speechSupported;
  if (patch.modelAvailability !== undefined) fakes.modelAvailability = patch.modelAvailability;
  if (patch.modelWhenNoReply !== undefined) fakes.modelWhenNoReply = patch.modelWhenNoReply;
  if (patch.modelReplies !== undefined) fakes.modelReplies.push(...patch.modelReplies);
  if (patch.webglSupported !== undefined) fakes.webglSupported = patch.webglSupported;
  if (patch.clipboardWorks !== undefined) fakes.clipboardWorks = patch.clipboardWorks;
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
  readonly held = new Map<string, Route[]>();
  readonly unreachables = new Set<string>();
  readonly sent: { method: string; path: string; body: Json }[] = [];
  readonly hubs = new Map<string, (socket: WebSocketRoute) => void>();

  answer(method: string, path: string, body: Json = null, status = 200): void {
    const key = `${method.toUpperCase()} ${path}`;
    this.unreachables.delete(key);
    this.answers.set(key, { body, status });
  }

  holdBack(method: string, path: string): () => void {
    const key = `${method.toUpperCase()} ${path}`;
    const waiting: Route[] = [];
    this.held.set(key, waiting);
    return () => {
      this.held.delete(key);
      for (const route of waiting.splice(0)) void this.fulfil(route, key);
    };
  }

  unreachable(method: string, path: string): void {
    this.unreachables.add(`${method.toUpperCase()} ${path}`);
  }

  requests(): { method: string; path: string; body: Json }[] {
    return [...this.sent];
  }

  /** Answers a request from the fixtures; false when the spec set up no answer for it. */
  async fulfil(route: Route, key: string): Promise<boolean> {
    if (this.unreachables.has(key)) {
      await route.abort('failed').catch(() => undefined);
      return true;
    }
    const answer = this.answers.get(key);
    if (!answer) return false;
    await route.fulfill({ status: answer.status, json: answer.body }).catch(() => undefined);
    return true;
  }

  hub(path: string, handler: (socket: WebSocketRoute) => void): void {
    this.hubs.set(path, handler);
  }
}

/** The record separator that ends each message of SignalR's JSON protocol. */
const RS = '\u001e';
const ROOM_HUB = '/hubs/room';

class RoomHubFixtures implements FakeRoomHub {
  private room: Json | null = null;
  private mode: 'serve' | 'hold' | 'refuse' = 'serve';
  private readonly held: WebSocketRoute[] = [];
  private readonly open = new Set<WebSocketRoute>();
  private readonly presented: string[] = [];
  private readonly calls: { target: string; args: Json[] }[] = [];
  private readonly heldMethods = new Map<string, (() => void)[]>();
  private readonly refusedMethods = new Map<string, string>();
  private gameState: object | null = null;

  serves(room: Json): void {
    this.room = room;
    this.mode = 'serve';
  }

  holdBack(): () => void {
    this.mode = 'hold';
    return () => {
      this.mode = 'serve';
      for (const socket of this.held.splice(0)) this.sendRoom(socket);
    };
  }

  refuses(): void {
    this.mode = 'refuse';
  }

  changes(room: Json): void {
    this.room = room;
    for (const socket of this.open) if (!this.held.includes(socket)) this.sendRoom(socket);
  }

  drop(): void {
    for (const socket of [...this.open]) this.closeForGood(socket);
  }

  tokens(): string[] {
    return [...this.presented];
  }

  invoked(): string[] {
    return this.calls.map(({ target }) => target);
  }

  invocations(): { target: string; args: Json[] }[] {
    return this.calls.map((call) => ({ target: call.target, args: [...call.args] }));
  }

  holdBackMethod(target: string): () => void {
    this.heldMethods.set(target, []);
    return () => {
      const waiting = this.heldMethods.get(target) ?? [];
      this.heldMethods.delete(target);
      for (const answer of waiting) answer();
    };
  }

  refusesMethod(target: string, code: string): void {
    this.refusedMethods.set(target, code);
  }

  acceptsMethod(target: string): void {
    this.refusedMethods.delete(target);
  }

  game(state: object | null): void {
    this.gameState = state;
    for (const socket of this.open) if (!this.held.includes(socket)) this.sendGame(socket);
  }

  openConnections(): number {
    return this.open.size;
  }

  /** Speaks SignalR's JSON protocol on one connection of the game's. */
  handle(socket: WebSocketRoute): void {
    this.presented.push(new URL(socket.url()).searchParams.get('access_token') ?? '');
    this.open.add(socket);
    socket.onClose(() => this.open.delete(socket));
    socket.onMessage((message) => {
      for (const record of String(message).split(RS)) {
        if (record === '') continue;
        const data = JSON.parse(record) as {
          protocol?: string;
          type?: number;
          target?: string;
          invocationId?: string;
          arguments?: Json[];
        };
        if (data.protocol !== undefined) {
          socket.send(`{}${RS}`);
          this.afterHandshake(socket);
        } else if (data.type === 1) {
          const target = data.target ?? '';
          this.calls.push({ target, args: data.arguments ?? [] });
          if (data.invocationId !== undefined) {
            const id = data.invocationId;
            const answer = () => this.complete(socket, target, id);
            const held = this.heldMethods.get(target);
            if (held) held.push(answer);
            else answer();
          }
        } else if (data.type === 7) {
          this.open.delete(socket);
          void socket.close();
        }
      }
    });
  }

  /** Completes an invocation, with the hub error the backend sends for a refusal. */
  private complete(socket: WebSocketRoute, target: string, invocationId: string): void {
    const code = this.refusedMethods.get(target);
    const completion =
      code === undefined
        ? { type: 3, invocationId }
        : {
            type: 3,
            invocationId,
            error: `An unexpected error occurred invoking '${target}' on the server. HubException: ${code}`,
          };
    socket.send(JSON.stringify(completion) + RS);
  }

  private afterHandshake(socket: WebSocketRoute): void {
    if (this.mode === 'refuse') this.closeForGood(socket);
    else if (this.mode === 'hold') this.held.push(socket);
    else this.sendRoom(socket);
  }

  private sendRoom(socket: WebSocketRoute): void {
    if (this.room === null) return;
    socket.send(JSON.stringify({ type: 1, target: 'RoomChanged', arguments: [this.room] }) + RS);
    this.sendGame(socket);
  }

  private sendGame(socket: WebSocketRoute): void {
    if (this.gameState === null) return;
    socket.send(
      JSON.stringify({ type: 1, target: 'GameChanged', arguments: [this.gameState] }) + RS,
    );
  }

  private closeForGood(socket: WebSocketRoute): void {
    socket.send(
      JSON.stringify({
        type: 7,
        error: 'Connection closed with an error.',
        allowReconnect: false,
      }) + RS,
    );
    this.open.delete(socket);
    void socket.close();
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
    const text = route.request().postData();
    backend.sent.push({
      method: route.request().method(),
      path: url.pathname,
      body: text ? (JSON.parse(text) as Json) : null,
    });
    const waiting = backend.held.get(key);
    if (waiting) {
      waiting.push(route);
      return;
    }
    if (await backend.fulfil(route, key)) return;
    problems.push(`Unanswered request: ${key}`);
    return route.abort('failed');
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

  roomHub: async ({ backend }, use) => {
    const hub = new RoomHubFixtures();
    backend.hub(ROOM_HUB, (socket) => hub.handle(socket));
    await use(hub);
  },

  clipboard: async ({ page }, use) => {
    await use({
      refuses: () => setFake(page, { clipboardWorks: false }),
      copied: () => page.evaluate(() => [...window.__atwFakes.copied]),
    });
  },

  network: async ({ page }, use) => {
    await use({
      offline: () => page.context().setOffline(true),
      online: () => page.context().setOffline(false),
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
      holds: () => setFake(page, { modelAvailability: 'available', modelWhenNoReply: 'hold' }),
      reply: (text) => page.evaluate((reply) => window.__atwFakes.modelReply(reply), text),
      waiting: () => page.evaluate(() => window.__atwFakes.modelWaiting()),
      aborted: () => page.evaluate(() => window.__atwFakes.modelAborted),
      fails: () => setFake(page, { modelAvailability: 'available', modelWhenNoReply: 'fail' }),
      downloadable: () => setFake(page, { modelAvailability: 'downloadable' }),
      missing: () => setFake(page, { modelAvailability: 'missing' }),
      sessions: () =>
        page.evaluate(() => ({
          ...window.__atwFakes.modelSessions,
          open: window.__atwFakes.modelOpen(),
        })),
      asked: () => page.evaluate(() => [...window.__atwFakes.modelAsked]),
    });
  },
});

export { expect };
