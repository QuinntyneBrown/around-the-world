import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { test } from '../fixtures/test';
import { restAt, SWEEP_SIZES } from '../support/layout';
import { SCREENS } from '../support/screens';

/**
 * The visual sweep of journey 19 (L2-050; docs/adr/0039). Each screen, dialog and notification
 * is brought to its state and photographed at every size of the sweep beside its mock at the
 * same size (`?chrome=0`, served from `docs/` on localhost); both are saved in
 * `test-results/` and attached to the report for a person to compare. It keeps no pixel baseline: the game draws the 3D classroom
 * where the mocks show a still picture, so the pair is read by eye. It runs only when a person
 * asks: `npm run build && npm run e2e:sweeps -- --project visual`.
 *
 * Traces to: L2-050
 */

const DOCS = resolve(__dirname, '../../../docs');
const ORIGIN = `http://localhost:${process.env['ATW_TEST_PORT'] ?? 4300}`;
const MOCKS = `${ORIGIN}/__docs/mocks/`;
const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

for (const screen of SCREENS) {
  test(`${screen.mock} beside its mock at every width`, async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
    network,
    clipboard,
  }, testInfo) => {
    const fakes = { page, device, backend, roomHub, clock, voice, microphone, network, clipboard };
    const mockPage = await page.context().newPage();
    await mockPage.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== ORIGIN || !url.pathname.startsWith('/__docs/')) {
        await route.abort();
        return;
      }
      const file = normalize(join(DOCS, url.pathname.slice('/__docs/'.length)));
      if (!file.startsWith(DOCS)) {
        await route.abort();
        return;
      }
      const body = await readFile(file).catch(() => null);
      if (body === null) await route.fulfill({ status: 404 });
      else
        await route.fulfill({
          body,
          contentType: TYPES[extname(file)] ?? 'application/octet-stream',
        });
    });
    await screen.reach(fakes);
    for (const size of SWEEP_SIZES) {
      await restAt(page, size);
      await mockPage.setViewportSize({ width: size.width, height: size.height });
      await mockPage.goto(`${MOCKS}${screen.mock}.html?chrome=0`);
      for (const [which, shown] of [
        ['game', page],
        ['mock', mockPage],
      ] as const) {
        const path = testInfo.outputPath(`${size.name.replace(/ /g, '-')}-${which}.png`);
        await shown.screenshot({ path });
        await testInfo.attach(`${size.name} ${which}`, { path, contentType: 'image/png' });
      }
    }
    await mockPage.close();
  });
}
