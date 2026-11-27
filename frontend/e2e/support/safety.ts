import { type Page } from '@playwright/test';

/**
 * What the safety specs look for (L2-040, L2-041, L2-042;
 * docs/detailed-designs/platform/keep-children-safe/, docs/adr/0040). Each reads what the game
 * did: what it sent, what it fetched, what it keeps, what the browser refused. None reads code.
 */

/** A request the browser refused under the game's Content Security Policy. */
export interface Refusal {
  /** The directive that refused it: `connect-src`, `img-src`, `script-src-elem`, `font-src`. */
  directive: string;
  /** The address it was refused for. */
  blocked: string;
}

/**
 * Code in the page asks another origin for data, a stream of events, a picture, a script and a
 * font, as an advert, a tracker or an analytics package would. What the browser refuses is
 * recorded, and read with `refusals`. A WebSocket falls under the same `connect-src` as data,
 * but the fixture's WebSocket routing stands in for the page's `WebSocket`, so the browser's
 * own check of one cannot be watched here; the fixture fails a spec whose page opens one off
 * localhost.
 */
export async function askAnotherOrigin(page: Page, origin: string): Promise<void> {
  await page.evaluate((other) => {
    const seen = window as unknown as { __atwRefusals?: { directive: string; blocked: string }[] };
    const refusals = (seen.__atwRefusals ??= []);
    document.addEventListener('securitypolicyviolation', (event) =>
      refusals.push({ directive: event.effectiveDirective, blocked: event.blockedURI }),
    );
    void fetch(`${other}/pixel`).catch(() => undefined);
    const picture = new Image();
    picture.src = `${other}/banner.png`;
    const script = document.createElement('script');
    script.src = `${other}/tracker.js`;
    document.head.append(script);
    void new FontFace('Advert', `url(${other}/advert.woff2)`).load().catch(() => undefined);
    const events = new EventSource(`${other}/events`);
    events.onerror = () => events.close();
  }, origin);
}

/** The requests the browser refused under the game's policy, in order. */
export function refusals(page: Page): Promise<Refusal[]> {
  return page.evaluate(
    () => (window as unknown as { __atwRefusals?: Refusal[] }).__atwRefusals ?? [],
  );
}

/** A value of a client message, in JSON. */
type Value = string | number | boolean | null | Value[] | { [key: string]: Value };

/** The kids a player can be (L2-002). */
const KIDS = new Set(['zuri', 'kenji', 'nia', 'milo', 'pip']);
/** The values Game Setup offers that are words: the kinds of maths and the card speeds (L2-016). */
const SETUP_WORDS = new Set(['times', 'plus', 'minus', 'divide', 'chill', 'normal', 'lightning']);
/** The room hub's methods, fixed by the game (docs/adr/0032 to 0036). */
const HUB_METHODS = new Set([
  'SaveSetup',
  'StartGame',
  'SubmitAnswer',
  'SendSticker',
  'PlayAgain',
  'LeaveRoom',
]);
/** SignalR's own words in its JSON protocol: the protocol's name in the handshake. */
const PROTOCOL_WORDS = new Set(['json']);
/** A room code: four capital letters (L2-022). */
const CODE = /^[A-Z]{4}$/;
/** An invocation's id, which SignalR numbers. */
const INVOCATION_ID = /^\d+$/;

/**
 * Every string in the messages that is not a closed value (L2-040 criterion 1): a room code, a
 * kid, a setup word, a hub method or SignalR's own word. A number is a closed value: an answer,
 * a sticker id, a nickname's index, a setup number. Free text in any message is returned.
 */
export function notClosed(messages: Value[]): string[] {
  const open: string[] = [];
  const walk = (value: Value, key: string): void => {
    if (typeof value === 'string') {
      const closed =
        KIDS.has(value) ||
        SETUP_WORDS.has(value) ||
        CODE.test(value) ||
        (key === 'target' && HUB_METHODS.has(value)) ||
        (key === 'invocationId' && INVOCATION_ID.test(value)) ||
        (key === 'protocol' && PROTOCOL_WORDS.has(value));
      if (!closed) open.push(`${key}: ${value}`);
    } else if (Array.isArray(value)) {
      value.forEach((item) => walk(item, key));
    } else if (value !== null && typeof value === 'object') {
      Object.entries(value).forEach(([name, item]) => walk(item, name));
    }
  };
  messages.forEach((message) => walk(message, ''));
  return open;
}

/** The JSON messages of SignalR's frames, each frame split at its record separator. */
export function framesAsMessages(frames: string[]): Value[] {
  return frames.flatMap((frame) =>
    frame
      .split('\u001e')
      .filter((record) => record !== '')
      .map((record) => JSON.parse(record) as Value),
  );
}

/** Everything the game keeps in the browser's storage, keys and values, as one text. */
export function keptText(page: Page): Promise<string> {
  return page.evaluate(() =>
    [localStorage, sessionStorage]
      .flatMap((storage) =>
        Array.from({ length: storage.length }, (_, index) => {
          const key = storage.key(index) ?? '';
          return `${key}=${storage.getItem(key) ?? ''}`;
        }),
      )
      .join('\n'),
  );
}
