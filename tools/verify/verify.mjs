#!/usr/bin/env node
// Runs every CI check and the unit tests locally (AGENTS.md): `node tools/verify/verify.mjs`.
// Run it before every push. `--frontend` or `--backend` runs one side only.
//
// Frontend (from frontend/): format, lint, the end-to-end type check, the unit tests, the
// production build with its budgets, and the Playwright behaviour specs.
// Backend (from backend/): format, the build with warnings as errors, and every test.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const frontend = join(root, 'frontend');
const backend = join(root, 'backend');
const only = process.argv.slice(2);
const wants = (side) => only.length === 0 || only.includes(`--${side}`);

const steps = [];
if (wants('frontend')) {
  if (!existsSync(join(frontend, 'node_modules'))) {
    steps.push(['frontend: install', frontend, 'npm', ['ci']]);
  }
  steps.push(
    ['frontend: format', frontend, 'npm', ['run', '--silent', 'format:check']],
    ['frontend: lint', frontend, 'npm', ['run', '--silent', 'lint']],
    ['frontend: e2e type check', frontend, 'npm', ['run', '--silent', 'e2e:typecheck']],
    ['frontend: unit tests', frontend, 'npm', ['run', '--silent', 'test']],
    ['frontend: production build and budgets', frontend, 'npm', ['run', '--silent', 'build']],
    ['frontend: behaviour specs', frontend, 'npm', ['run', '--silent', 'e2e']],
  );
}
if (wants('backend')) {
  steps.push(
    ['backend: format', backend, 'dotnet', ['format', '--verify-no-changes']],
    ['backend: build', backend, 'dotnet', ['build', '--configuration', 'Release']],
    ['backend: tests', backend, 'dotnet', ['test', '--configuration', 'Release', '--no-build']],
  );
}

const results = [];
for (const [name, cwd, command, args] of steps) {
  console.log(`\n=== ${name} ===`);
  const started = Date.now();
  const run = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const passed = run.status === 0;
  results.push({ name, passed, seconds });
  if (!passed) break;
}

console.log('\n=== verify ===');
for (const { name, passed, seconds } of results) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name} (${seconds}s)`);
}
const failed = results.some((result) => !result.passed);
const skipped = steps.length - results.length;
if (skipped > 0) console.log(`SKIP  ${skipped} later step(s) after the first failure`);
process.exit(failed ? 1 : 0);
