import { defineConfig, devices } from '@playwright/test';

const port = 4300;

/**
 * Behaviour specs only, on Chromium only (AGENTS.md, E2E). They run against the production
 * build in dist/game/browser, served on localhost by e2e/support/serve.mjs, so build first:
 * `npm run build && npm run e2e`.
 */
export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['list'], ['github']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'off',
    serviceWorkers: 'block',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node e2e/support/serve.mjs ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
  },
});
