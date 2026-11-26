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

## Journey 02: Start from Home and pick a kid

**What slowed it.**

- Importing one component from the `@atw/components` barrel in the shell pulled every component
  the screens use into `main`: the build assigns a module to a chunk by what reaches it, and a
  barrel reaches everything. `"sideEffects": false` in each library's `package.json` let the
  build leave them in the screens' chunks (ADR 0014).
- The design-system blocks that are links or buttons could not be element components without
  either injecting the router or reloading the page; they became attribute components on the
  native element, as Angular Material's buttons are (ADR 0012), and ESLint's selector rule had
  to accept the attribute type.
- The prompt put a storage failure in Pick Your Kid's error state, but `L2-015` criterion 2 says
  an unreadable storage shows no error. The requirement won; the error state is the pictures'
  (ADR 0013).
- The presentation library for both screens was written before the second slice's spec, so
  slices 2 to 5 had green specs on their first run. Each was then broken once by hand (a
  storage that reads nothing) to see it fail for the expected reason.

**New lessons.**

1. Mark every workspace library `"sideEffects": false` from its first export, and read the
   build's chunk table after adding a screen: a component in `main` is a barrel leak.
2. A design-system block that is an `<a>` or a `<button>` is an attribute component on that
   element (`a[atw-toy-button]`); the page keeps `routerLink`, `(click)` and `aria-label`.
3. Drive loading and error states that depend on files through the fixture's `pictures`
   (`holdBack`, `refuse`) and what the device keeps through `device` (`keeps`, `kept`,
   `storageUnavailable`); never put a selector or a storage key in a spec.
4. A state no journey can reach yet (Home's "Play again" before the Podium) gets a unit test of
   the page with the token set, and its behaviour spec with the journey that reaches it.
5. Tag one spec per feature `@critical`: CI runs only those (ADR 0015).

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against
  `dist/game/browser`, which caught the initial budget at once.
- *Check a fake once by hand* (01, 2): the `device` and `pictures` fixtures were checked by a
  hand-broken `LocalPlayerStorage`, then restored; no test of the harness was kept.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): sixteen components and two
  shared parts, each marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADRs 0012 and 0013.
