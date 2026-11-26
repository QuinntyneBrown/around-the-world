# 0001. Angular 22 workspace of source libraries

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`AGENTS.md` asks for current Angular (standalone components, signals, `OnPush`, zoneless) in a
multi-project workspace under `frontend/projects/`: the libraries `api`, `domain` and
`components` and the application `game`, imported as `@atw/<library>`. No library is
published; each exists to keep a concern apart and to be lazy-loaded on its own.

## Decision

- The workspace is made with Angular CLI 22.3 (`@angular/build`, esbuild), TypeScript 6.0, and
  no `zone.js`: change detection is zoneless, which is Angular 22's default.
- Every component sets `ChangeDetectionStrategy.OnPush`, and the CLI's schematics default to it.
- The libraries are **source libraries**: `tsconfig.json` maps `@atw/api`, `@atw/domain` and
  `@atw/components` to each library's `src/public-api.ts`, and the libraries have no build
  target and no `ng-packagr`. `game` compiles them with its own code, so the build tree-shakes
  across them and a dynamic `import()` of a library makes it a lazy chunk.
- `strict`, `strictTemplates`, `noUnusedLocals` and `noUnusedParameters` are on.
- `game` reads its global foundations (tokens, `@font-face`, reset, utilities) from
  `projects/game/src/styles/`, copied from `docs/design-system/`.

## Consequences

- A library that one day must be published adds `ng-packagr` and a build target in its own ADR.
- Adding a library adds its path alias, its ESLint element (`docs/adr/0005`) and its place in
  the dependency direction of `AGENTS.md` in the same change.
