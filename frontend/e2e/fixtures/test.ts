import { expect, test as base, type Page, type Route, type WebSocketRoute } from '@playwright/test';
import { installBrowserFakes, type MicrophoneSetting } from './fakes/browser-fakes';

/**
 * The shared fixture (docs/adr/0006-playwright-fixture.md). Every spec imports `test` and
 * `expect` from here. It gives each spec:
 *
 * - `voice`: a fake speech recognizer that says what the spec tells it to;
 * - `microphone`: a fake microphone permission (no real microphone is ever opened);
 * - `model`: a fake on-device model that answers as the spec tells it to;
 * - `backend`: API and hub requests answered from fixtures (no real backend or database).
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
}

export interface FakeMicrophone {
  grant(): Promise<void>;
  deny(): Promise<void>;
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

interface Fixtures {
  problems: string[];
  voice: FakeVoice;
  microphone: FakeMicrophone;
  model: FakeModel;
  backend: FakeBackend;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const BACKEND_PATH = /^\/(api|hubs)\//;

/** A change to the fakes in the page. */
interface FakesPatch {
  microphone?: MicrophoneSetting;
  speechSupported?: boolean;
  modelAvailability?: 'downloadable' | 'available';
  modelReplies?: string[];
}

function applyPatch(patch: FakesPatch): void {
  const fakes = window.__atwFakes;
  if (patch.microphone !== undefined) fakes.microphone = patch.microphone;
  if (patch.speechSupported !== undefined) fakes.speechSupported = patch.speechSupported;
  if (patch.modelAvailability !== undefined) fakes.modelAvailability = patch.modelAvailability;
  if (patch.modelReplies !== undefined) fakes.modelReplies.push(...patch.modelReplies);
}

/** Changes the fakes now (when a page is open) and again on every page loaded after. */
async function setFake(page: Page, patch: FakesPatch): Promise<void> {
  await page.addInitScript(applyPatch, patch);
  if (page.url() !== 'about:blank') await page.evaluate(applyPatch, patch);
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
async function guardRequests(page: Page, backend: BackendFixtures, problems: string[]) {
  await page.route('**/*', async (route: Route) => {
    const url = new URL(route.request().url());
    if (!LOCAL_HOSTS.has(url.hostname)) {
      problems.push(`Request off localhost: ${route.request().method()} ${url.origin}`);
      return route.abort('blockedbyclient');
    }
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
  backend: async ({}, use) => {
    await use(new BackendFixtures());
  },

  page: async ({ page, problems, backend }, use) => {
    await page.addInitScript(installBrowserFakes);
    await guardRequests(page, backend as BackendFixtures, problems);
    page.on('pageerror', (error) => problems.push(`Page error: ${error.message}`));
    // Angular's global error listeners hand an uncaught error to its ErrorHandler, which
    // logs it instead of letting it reach the browser as a page error. A failed resource
    // load is the request guard's business, and a refused answer may be what a spec set up.
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        problems.push(`Page error: ${message.text()}`);
      }
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

  voice: async ({ page }, use) => {
    await use({
      say: (transcript) => page.evaluate((words) => window.__atwFakes.say(words), transcript),
      unsupported: () => setFake(page, { speechSupported: false }),
    });
  },

  microphone: async ({ page }, use) => {
    await use({
      grant: () => setFake(page, { microphone: 'granted' }),
      deny: () => setFake(page, { microphone: 'denied' }),
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
