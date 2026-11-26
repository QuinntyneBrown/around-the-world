import { type Page } from '@playwright/test';

/**
 * Timings the browser itself measures (L2-047 criterion 4, docs/adr/0038): the Largest
 * Contentful Paint and the time from a press to the next frame drawn (Event Timing, as
 * Interaction to Next Paint measures it).
 */
declare global {
  interface Window {
    __atwResponses?: number[];
  }
}

/** Starts recording how long each press takes to show, before the game opens. */
export async function recordResponses(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const responses: number[] = [];
    window.__atwResponses = responses;
    const record = (list: PerformanceObserverEntryList) => {
      for (const entry of list.getEntries()) responses.push(entry.duration);
    };
    // Every press is reported once it takes 16 ms or more; the first one always.
    // `durationThreshold` is Event Timing's own option, not yet in TypeScript's DOM types.
    new PerformanceObserver(record).observe({
      type: 'event',
      durationThreshold: 16,
    } as PerformanceObserverInit);
    new PerformanceObserver(record).observe({ type: 'first-input', buffered: true });
  });
}

/** The longest time, in ms, any press took to show; 0 when none took 16 ms or more. */
export async function slowestResponse(page: Page): Promise<number> {
  // A press is reported once the frame after it is drawn.
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => setTimeout(done))));
  return page.evaluate(() => Math.max(0, ...(window.__atwResponses ?? [])));
}

/** The page's Largest Contentful Paint so far, in ms from the start of its navigation. */
export function largestContentfulPaint(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          resolve(entries[entries.length - 1]?.startTime ?? Number.POSITIVE_INFINITY);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      }),
  );
}

/** How many frames the page draws in a second of real time, counted over `ms`. */
export function framesPerSecond(page: Page, ms = 2000): Promise<number> {
  return page.evaluate(
    (span) =>
      new Promise<number>((resolve) => {
        let frames = 0;
        let from = 0;
        const count = (at: number) => {
          if (from === 0) from = at;
          else frames += 1;
          if (at - from >= span) resolve((frames * 1000) / (at - from));
          else requestAnimationFrame(count);
        };
        requestAnimationFrame(count);
      }),
    ms,
  );
}

/** Forgets the presses recorded so far, so the next `slowestResponse` reads only later ones. */
export async function forgetResponses(page: Page): Promise<void> {
  await page.evaluate(() => window.__atwResponses?.splice(0));
}
