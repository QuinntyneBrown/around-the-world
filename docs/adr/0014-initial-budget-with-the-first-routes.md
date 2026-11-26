# 0014. The initial budget of `game` once its first routes are lazy

- **Status:** Accepted (supersedes the `initial` row of ADR 0008)
- **Date:** 2026-11-26

## Context

ADR 0008 set the `initial` budget at 225 kB (warning) and 250 kB (error) against the
scaffold's shell, which had no route. Journey 02 adds the first three routes, each a lazy
chunk, and binds the player's store and its storage at the composition root, as Home needs them
at once. Two causes grew the initial bundle:

- the router's lazy-loading and title machinery, which an empty route table let the build drop;
- the libraries' barrels: every component the screens import through `@atw/components` was
  pulled into `main`, because `main` imports the skip link from the same barrel. Marking
  `api`, `domain` and `components` free of side effects (`"sideEffects": false` in each
  project's `package.json`) lets the build leave the unused ones in the screens' chunks.

With both, the initial bundle measures 249.4 kB raw, 66.0 kB transferred: under the old error
budget by less than 1 kB, so the next shared provider would break the build.

## Decision

| Budget | Warning | Error |
|---|---|---|
| `initial` | 255 kB | 270 kB |
| `anyComponentStyle` | 4 kB | 8 kB (unchanged) |

## Consequences

Every screen stays a lazy chunk and every library stays free of side effects. Journey 18
measures Home against `L2-047` criterion 4 and tightens the numbers if it can.
