import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';

/**
 * The visual, responsive and accessibility sweeps of journey 19 (docs/adr/0039). Like the heap
 * checks they run only when a person asks (AGENTS.md, E2E), never in `verify.mjs` or CI:
 * `npm run build && npm run e2e:sweeps`, or one of them with `-- --project responsive`,
 * `-- --project accessibility` or `-- --project visual`. Chromium only.
 */
export default defineConfig({
  ...base,
  testDir: './e2e/sweeps',
  timeout: 120_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'game-plan',
      testMatch: 'game-plan.sweep.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'magic-patterns',
      testMatch: 'magic-patterns.sweep.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'responsive',
      testMatch: 'responsive.sweep.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'accessibility',
      testMatch: 'accessibility.sweep.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: 'visual.sweep.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
