import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/**
 * The measurements of L2-048 criterion 4: heap checks across repeated enter and leave of the
 * screens that draw the classroom and its cast. Like the visual and accessibility sweeps they
 * run only when a person asks (AGENTS.md, Lazy loading and memory; docs/adr/0038), never in
 * `verify.mjs` or CI: `npm run build && npm run e2e:measure`. One worker, so no other page
 * shares the machine while the heap is measured.
 */
export default defineConfig({
  ...base,
  testDir: './e2e/measure',
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  reporter: 'list',
});
