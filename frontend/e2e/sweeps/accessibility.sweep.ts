import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';
import { layoutProblems, restAt, scrollsSideways, smallTargets } from '../support/layout';
import { SCREENS } from '../support/screens';

/**
 * The accessibility sweep of journey 19 (L2-051 criteria 2, 6 and 7; docs/adr/0039). Each
 * screen, dialog and notification is brought to its state and checked by axe-core against
 * WCAG 2.2 A and AA (roles, names, contrast, target size), with every control at least
 * 44 x 44 px, on a desktop and on a phone; then at 200% zoom on a 1280 px screen (laid out as
 * 640 px) nothing is lost and the page does not scroll sideways. It runs only when a person
 * asks: `npm run build && npm run e2e:sweeps -- --project accessibility`.
 *
 * Traces to: L2-051
 */

const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map(
      (node) =>
        `${violation.id}: ${node.target.join(' ')} (${node.failureSummary?.split('\n')[1]?.trim() ?? violation.help})`,
    ),
  );
}

for (const screen of SCREENS) {
  test(`${screen.mock} meets WCAG 2.2 AA by touch, keyboard and zoom`, async ({
    page,
    device,
    backend,
    roomHub,
    clock,
    voice,
    microphone,
    network,
    clipboard,
  }) => {
    const fakes = { page, device, backend, roomHub, clock, voice, microphone, network, clipboard };
    await page.setViewportSize({ width: 1280, height: 800 });
    await screen.reach(fakes);
    const problems: string[] = [];
    for (const [form, size] of [
      ['desktop', { width: 1280, height: 800 }],
      ['phone', { width: 360, height: 800 }],
    ] as const) {
      await restAt(page, size);
      for (const violation of await violations(page)) problems.push(`${form}: ${violation}`);
      for (const target of await smallTargets(page)) problems.push(`${form}: ${target}`);
    }
    // 200% zoom on a 1280 x 800 screen lays the page out at 640 x 400 CSS pixels.
    await restAt(page, { width: 640, height: 400 });
    if (await scrollsSideways(page)) problems.push('200% zoom: the page scrolls sideways');
    for (const problem of await layoutProblems(page)) problems.push(`200% zoom: ${problem}`);
    expect(problems).toEqual([]);
  });
}
