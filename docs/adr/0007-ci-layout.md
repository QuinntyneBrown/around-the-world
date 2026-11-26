# 0007. One CI workflow of two parallel jobs

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

CI is always green, finishes in under 5 minutes, and runs lint, format, the production builds,
and one critical acceptance path per feature; unit tests run locally (`AGENTS.md`, CI). Pull
requests are stacked, so a pull request's base is often another journey's branch.

## Decision

`.github/workflows/ci.yml` runs on every `pull_request`, whatever its base, and on a push to
`main`, and cancels a superseded run. Two jobs run in parallel, each with a 5-minute timeout:

- **Frontend:** `npm ci`, format, lint, the end-to-end type check, the production build with its
  budgets, the Chromium headless shell, then the Playwright behaviour specs.
- **Backend:** format, a Release build with warnings as errors, then the acceptance tests.

`node tools/verify/verify.mjs` runs the same checks plus the frontend's unit tests locally.

## Consequences

A check that becomes slow or flaky is fixed or removed, never retried. A new feature adds its
one critical acceptance path, not its whole suite.
