# 0004. Vitest for the frontend, xUnit v3 for the backend

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Unit tests run locally, never in CI (`AGENTS.md`). Time-driven rules advance a fake clock.

## Decision

- **Frontend:** Vitest through Angular's `@angular/build:unit-test` builder, with jsdom, as the
  CLI makes it. `npm test` runs every project that has a `test` target. A library borrows
  `game`'s build options (`buildTarget: game:build:development`) because it has no build target
  of its own (`docs/adr/0001`). A library gets its `test` target with its first spec, since the
  builder fails a project with no spec. Vitest's fake timers advance the clock.
- **Backend:** xUnit v3 with `Microsoft.NET.Test.Sdk`. The acceptance tests run through the API
  on `WebApplicationFactory`'s in-memory test server with EF Core InMemory and
  `FakeTimeProvider` (`AroundTheWorld.Api.Tests`). A rule with a table of cases gets its own
  test project for the domain type or handler when it is first written.

## Consequences

CI runs the backend's acceptance tests (they are the critical path) and no unit test.
