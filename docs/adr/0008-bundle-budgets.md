# 0008. The production budgets of `game`

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`L2-047` criterion 1 asks for a budget in `angular.json` that fails the build above it, and no
requirement states a number; `docs/detailed-designs/platform/load-lazily-and-release/` marked
the size `<TO SUPPLY>`. The scaffold's shell (the router, the skip link, the foundations and
both fonts' `@font-face`) measures 216.6 kB raw, 57.1 kB transferred, in its initial bundle.

## Decision

| Budget | Warning | Error |
|---|---|---|
| `initial` | 225 kB | 250 kB |
| `anyComponentStyle` | 4 kB | 8 kB |

The sizes are raw, as Angular measures them. Every screen is a lazy chunk and adds nothing to
the initial bundle, so the shell's size is what the budget guards.

## Consequences

A change that raises a budget states its reason in the change and updates this table.
Journey 18 measures Home against `L2-047` criterion 4 and tightens the numbers if it can.
