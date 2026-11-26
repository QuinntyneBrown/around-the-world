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

## Journey 03: Choose solo and set up the game

**What slowed it.**

- "Go!" could not reach the game's session: the design put Game Setup outside the solo group
  that provides `GAME_SESSION`, and handing the setup over in the router's navigation state
  would have restarted a game on a reload, since the browser keeps that state in its history.
  Moving the solo Game Setup into the group, with Angular 22.2's
  `withAutoCleanupInjectors()` to destroy the game on leaving, settled it (ADR 0016).
- The initial bundle went over its 255 kB warning: the store of the player's choices, which
  is in `main`, pulled in the whole of Game Setup's rules. Splitting the defaults and the check
  of a kept setup (`tour/game-setup.ts`) from the screen's rules brought it back to 254.9 kB. A
  namespace re-export (`export * as`) made it worse, because the build splits by module, not
  by function.
- Angular drops the whitespace between two elements, so a choice read "12desks" to the
  browser and to a screen reader; `&ngsp;` keeps the space.
- Three states the prompt listed (Solo Or Friends' error, Game Setup's loading and error) are
  the room's, not a solo game's; the requirements won and they were left to journeys 12 and 14
  (ADR 0017).

**New lessons.**

1. When a page must act on a service a lazy route group provides, put the page in the group
   rather than passing data through the router's navigation state.
2. Keep what `main` needs to read the device in its own small module, apart from the rules a
   screen uses, and measure the initial bundle against the base commit (a worktree build)
   before raising a budget.
3. A design-system block that is a group of toggles (the toggle row, the table grid, the
   choice grid, the segmented track) is one component on the group's native `<div>`, which
   takes the options and which are on, and emits the one pressed; the page names the group.
4. Prove a hand-over nothing on screen shows yet (the setup handed to the solo game) with a
   unit test of the page against the real session, and break it once by hand.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): it caught the budget warning the
  moment the setup joined the store.
- *Check a fake once by hand* (01, 2): the rules were broken by hand (the last table, a tour's
  minutes) to see the specs written after the code fail for the expected reason.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): twelve components added,
  three extended (Panel's heading, Portrait's round and stacked look, two icons), each marked
  in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADRs 0016
  and 0017 fill the design's gaps.
- *Mark every library `"sideEffects": false` and read the chunk table* (02, 1): the table
  showed the rules in `main`, which lesson 2 above fixed.
- *A link or button block is an attribute component* (02, 2): extended to the groups of
  toggles (lesson 3 above).
- *Drive loading states through the fixture's `pictures` and `device`* (02, 3): Solo Or
  Friends' loading and drawn classmates, and the kept setup, are driven that way.
- *An unreachable state gets a unit test of the page* (02, 4): used for "Go!"'s hand-over.
- *Tag one spec per feature `@critical`* (02, 5): the way from Home through "Play solo" and
  "Go!" to Duel.

## Journey 04: Play a solo duel with the number pad

**What slowed it.**

- The time-driven rules needed a clock a spec could hold without sleeping, but Playwright's
  paused clock also stops `setTimeout` and `requestAnimationFrame`, which zoneless Angular
  renders with. The game's clock reads `Date.now` and is ticked by a real interval, so the
  fixture's `clock.hold()` (`page.clock.setFixedTime`) freezes game time while Angular keeps
  rendering (ADR 0020). Fixing `Math.random` through the fixture's `random` made a classmate
  answer as a spec needs.
- `effect()` and `model()` added 3.4 kB to `main`: the build splits by module, and
  `@angular/core` is one module that `main` holds, so a framework feature first used in a lazy
  chunk still lands in `main`. Plain signals and an output brought it back; the last 0.5 kB of
  framework instructions moved the warning budget by 1 kB (ADR 0021).
- A spec of the keyboard failed one run in five: the pad read its entry from an input that
  changes only on the next render, so a second key before it lost the first. The pad became
  stateless, emitting each key, and the page keeps the entry in a signal.
- `aria-label` on the flash card's `<p>` and the answer box's `<div>` named nothing, since ARIA
  does not let those roles be named; the mocks carried the same markup. Both are now
  `role="img"`, in the mocks and the design system too.
- The mocks' CSS cut the number pad off on a phone turned on its side; the pad now sits beside
  the card under 544 px tall at any width, in the design system as well.

**New lessons.**

1. Drive game time from the wall clock with a ticking interval, and hold `Date.now` in specs
   (`clock.hold()`, `clock.pass(ms)`); never pause Playwright's clock under zoneless Angular.
2. Prefer signals, `computed()` and outputs to `effect()`, `model()` and `linkedSignal()`, and
   read the chunk table after a new framework feature: shared framework code lands in `main`.
3. Keep fast-changing input (key presses) in the state of the component that owns it, never in
   an input waiting for the next render; run new specs with `--repeat-each` before committing.
4. Check a mock's accessible names with `toHaveAccessibleName`: an `aria-label` on a paragraph
   or a plain `div` is silently ignored.
5. Let a rule with chance take a `RandomSource`, so a unit test fixes the numbers and a spec
   fixes `Math.random`.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): it showed the budget and the
  framework code in `main` at once.
- *Check a fake once by hand* (01, 2): the clock and random fakes were checked by breaking the
  classmates, the time-up delay, the pad and the seating, each failing its spec as expected.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): TimerBar, WorldRing,
  NumberPad (with NumberEntry) and Pill added; DuelHud, FlashCard, Portrait, Bean and Icon
  extended; each marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0021 for the budget; the
  mocks' unnamed sum was corrected rather than kept.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the agents are their own
  chunk (`classmate-agent`), and the table showed the framework growth.
- *A link or button block is an attribute component* (02, 2): the Pill is `p[atw-pill]`.
- *Drive states through the fixture* (02, 3): extended with `clock` and `random`.
- *An unreachable state gets a unit test of the page* (02, 4): Duel's loading state, which
  stands only until the session publishes the first duel.
- *Tag one spec per feature `@critical`* (02, 5): answering with the pad and winning.
- *Put the page in the group that provides its service* (03, 1): Duel reads the solo group's
  `GAME_SESSION`.
- *Measure the initial bundle against the base commit* (03, 2): a worktree build located the
  0.54 kB before the budget moved.
- *A group of toggles is one component* (03, 3): the number pad is one component on a group.
- *Prove a hand-over with a unit test of the page* (03, 4): `SoloGame`'s unit tests prove the
  class, the clock, and the first card dealt before the agents arrive.

