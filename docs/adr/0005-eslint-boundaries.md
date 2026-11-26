# 0005. `eslint-plugin-boundaries` enforces the dependency direction

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`AGENTS.md` fixes the direction: `game` -> `components`, `api`, `domain`; `domain` -> `api`;
`components` -> `api` for types only; `api` -> nothing; no library imports an app. ESLint
enforces it, and no test checks structure.

## Decision

`frontend/eslint.config.mjs` uses `eslint-plugin-boundaries` 5 with
`eslint-import-resolver-typescript`, so `@atw/*` aliases and relative paths both resolve to
their project. Each project under `projects/` is an element; `boundaries/element-types`
disallows by default and allows only the direction above. The `components` -> `api` rule
carries `importKind: 'type'`, so a value import from `api` fails. The same file runs
angular-eslint (`atw` selectors, `OnPush`, encapsulation, no inline template or styles outside
specs) and typescript-eslint.

## Consequences

A new library adds its element and its rule in the same change. A wrong-way import fails
`npm run lint` locally and in CI.
