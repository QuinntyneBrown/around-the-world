import { expect, test } from '../fixtures/test';
import {
  layoutProblems,
  restAt,
  scrollsDown,
  scrollsSideways,
  SWEEP_SIZES,
} from '../support/layout';
import { SCREENS } from '../support/screens';

/**
 * The responsive sweep of journey 19 (L2-050 criterion 1; docs/adr/0039). Each screen, dialog
 * and notification is brought to its state once, then laid out at every size of the sweep: at
 * none may the page scroll sideways, a control or its text be cut off, or two controls overlap;
 * Duel and World Map never scroll at all. It runs only when a person asks:
 * `npm run build && npm run e2e:sweeps -- --project responsive`.
 *
 * Traces to: L2-050
 */

for (const screen of SCREENS) {
  test(`${screen.mock} works at every width`, async ({
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
    await screen.reach(fakes);
    const problems: string[] = [];
    for (const size of SWEEP_SIZES) {
      await restAt(page, size);
      if (await scrollsSideways(page)) problems.push(`${size.name}: the page scrolls sideways`);
      if (screen.neverScrolls && (await scrollsDown(page))) {
        problems.push(`${size.name}: the screen scrolls, but it fills the viewport`);
      }
      for (const problem of await layoutProblems(page)) problems.push(`${size.name}: ${problem}`);
    }
    expect(problems).toEqual([]);
  });
}
