# Lessons learned

Each journey of [`journeys.md`](journeys.md) adds its entry here when it finishes, before it
merges (`AGENTS.md`, *Lessons learned and progress*): what slowed it, the new lessons it taught,
and how each earlier lesson it applied worked. Before a journey starts, read this file and apply
the lessons that fit.

## Journey 01: Scaffold the workspace

**What slowed it.**

- Angular's unit-test builder fails a project that has no spec, and a library with no build
  target cannot run it until its `test` target borrows `game`'s build options. The libraries
  `api` and `domain` have no `test` target until their first spec.
- Angular's global error listeners (`provideBrowserGlobalErrorListeners`) hand an uncaught
  error to the `ErrorHandler`, which logs it; it never reaches Playwright as a `pageerror`. The
  fixture had to treat a console error as a page error to fail the spec.
- EF Core 10 keeps a context's provider in `IDbContextOptionsConfiguration<T>` as well as in
  `DbContextOptions<T>`; the test fixture removes both before it adds EF Core InMemory.
- MediatR from version 13 needs a commercial licence key; the backend pins 12.5.0.

**New lessons.**

1. Write the Playwright spec against the production build served on localhost, not
   `ng serve`: it starts in under a second and proves the budgets' build is the one that works.
2. Check a fake or a guard of the shared fixture once by hand with a throwaway spec that must
   fail, then delete it; keep no test of the test harness.
3. Check an ESLint boundary once by hand with a throwaway wrong-way import (a value import from
   `@atw/api` in `components` must fail, a type import must pass), then delete it.
4. Build a design-system component in `@atw/components` the first time a screen needs it, and
   mark it in `frontend/projects/components/README.md`; the shell's `atw-skip-link` is the first.
5. A rule of `AGENTS.md` that conflicts with best practice gets an ADR and a proposed
   correction, as the live endpoint did (`docs/adr/0009-health-and-migrations.md`).

**Earlier lessons applied.** None: this is the first journey.
