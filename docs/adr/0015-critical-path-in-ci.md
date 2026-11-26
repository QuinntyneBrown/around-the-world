# 0015. CI runs the behaviour specs tagged `@critical`

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`AGENTS.md` (CI) and ADR 0007 run one critical acceptance path per feature in CI, and the rest
of the behaviour specs locally. Journey 01 had only two specs, so CI ran them all; journey 02
is the first to add a feature's whole suite.

## Decision

- The one critical path of a feature carries `@critical` at the start of its title.
- CI runs `npm run e2e -- --grep @critical`. `node tools/verify/verify.mjs` runs every
  behaviour spec, as before.

## Consequences

A new feature tags exactly one spec. The suite of a feature never slows CI down, and is still
run before every push.
