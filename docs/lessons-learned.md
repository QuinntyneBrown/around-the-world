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

## Journey 05: Hop round the ring on the World Map

**What slowed it.**

- Drawing World Map's room inside `@defer`, so its placeholder and error blocks would be the
  loading and error states, put 6.6 kB of Angular's defer runtime into `main`; loading the room
  through `NgComponentOutlet` instead cost 3 kB. Both went over the 256 kB warning. The room is
  drawn with the page, in World Map's lazy chunk; the loading state follows the tour, and the
  error state waits for the 3D classroom, which can fail (ADR 0023).
- The design's `GameScreenNavigator` watched the session with an effect, which ADR 0021 had
  already measured at 3.4 kB in `main`. The session tells a plain listener instead
  (`watchScreen`), and the navigator stops listening with its group.
- The mock `world-map/hop` put the child above Kenji at the same distance, the opposite of how
  `L2-006` orders the end of a tour. The mock was redrawn and the order written into `L2-034`.
- `SoloGame`'s flow for the sit, the classmates' duels and the child as the desk holder was
  written with the first slice's rules, so the second and third slices' specs were green on
  their first run. Each was broken by hand (the desk holder never dealt in, every desk labelled,
  the whole room never shown) to see it fail for the expected reason.

**New lessons.**

1. Measure a template feature (`@defer`, `NgComponentOutlet`) on the chunk table before a state
   is designed around it: its runtime lands in `main` whichever lazy chunk uses it.
2. Let the game service decide when the screen changes and tell a plain listener, and keep every
   wait between screens on the game's clock, so a spec moves them all with `clock.pass(ms)`.
3. Draw a picture once in `<defs>` and show it in two views with `<use>` (the room and the zoom);
   the encapsulated styles still apply to the copies in Chromium.
4. Share SVG parts between components with an attribute component on `g` whose template uses
   `svg:`-prefixed elements (`g[atw-bean-parts]`), rather than copying the drawing.
5. Work out a rule with chance that no one watches (the classmates' duels) at its start with a
   pure helper, and play its result on the clock: it can then be played out at once on demand.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): it showed the defer runtime in `main`
  at the first build.
- *Check a fake once by hand* (01, 2): the specs written after the flow were broken by hand
  once each, as above.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): StampCard, WorldMap (with
  RoomLayout), MapToast, Standings and BeanParts added; TextButton (`sunken`), Pill
  (`--pill-bg`) and Bean extended; each marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0023 for the listener in
  place of an effect, and for the room drawn without `@defer`.
- *Mark libraries side-effect free and read the chunk table* (02, 1): read after every slice;
  `main` stayed at 234.6 kB.
- *A link or button block is an attribute component* (02, 2): the quiet pill is
  `button[atw-text-button]` and Back to the card `button[atw-icon-button]`.
- *Drive states through the fixture* (02, 3): `clock` and `random` drive every hop, sit and
  classmates' duel; nothing new was needed in the fixture.
- *An unreachable state gets a unit test of the page* (02, 4): World Map's loading state.
- *Tag one spec per feature `@critical`* (02, 5): a traveller who wins, hops on and duels the
  next desk.
- *Put the page in the group that provides its service* (03, 1): World Map and the navigator
  are in the solo group.
- *Measure the initial bundle against the base commit* (03, 2): 255.46 kB before, 255.44 kB
  after.
- *A group of toggles is one component* (03, 3): not needed.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s unit tests prove the stamp, the
  waits and the classmates' duels.
- *Drive game time from the wall clock* (04, 1): the three new waits are on `GameClock`.
- *Prefer signals and outputs to `effect()`* (04, 2): applied to the navigator (lesson 2 above).
- *Keep fast-changing input in the component that owns it* (04, 3): new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the room's name and the
  standings' distances.
- *Let a rule with chance take a `RandomSource`* (04, 5): `ClassmatesDuel` takes the agents,
  so its unit tests fix every answer and time.

## Journey 06: Finish the tour on the Podium

**What slowed it.**

- The passport rule of ADR 0022 (a stamp only for a desk reached by a hop) gave a child who went
  all the way round 11 stamps of 12, while the mocks read "12 of 12 countries". Desk 1, where
  the tour starts, now counts, as the distance travelled already does (ADR 0024). The mocks had
  also stamped "the first n countries", which no tour can give, since Egypt, where the first
  duel is, is reached only by the hop past the last desk; five mocks and the Passport page were
  redrawn.
- The design system's Podium page reads the steps in place order while the mocks' markup put
  2nd first. The mocks now list 1st, 2nd, 3rd and draw 2nd first through CSS `order`.
- A child placed outside the top three needs three kids to travel further than them, which no
  spec could drive through the classmates' profiles with `random.always(0)`; it is proved by a
  unit test of the page, beside the loading state.
- Probing what the classmates do with a throwaway spec (printing the Podium for several tour
  lengths and waits) found the deterministic paths for the second-place and Grand tour specs in
  one run, rather than guessing.

**New lessons.**

1. When a rule fixes a count the mocks show (stamps, places, distances), work one example of the
   mock through the rule before building: a mock's numbers can be an illustration no game can
   reach.
2. A time limit on the game's clock lets a spec end a tour at once with one `clock.pass(ms)`, so
   the end of a long tour (a Grand tour of 24 desks) costs a spec no more than a short one.
3. Keep the placing table in one domain method (`Tour.result`) with one unit test per row, and
   let the screens' filtering (the five kids only) be an argument of it, so World Map and the
   Podium cannot disagree about a place.
4. A new game service method that restarts state (`playAgain`) should reuse the start path
   (`begin`) rather than repeat it, and drop every timer first with the clock's `clear()`.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build;
  `main` went from 255.44 kB to 255.39 kB.
- *Check a fake once by hand* (01, 2): the time limit, the long passport, the headline, "Play
  again" and the Visit hand-over were each broken by hand and failed their specs as expected.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): Podium, Passport and the
  `ordinal` helper added; Icon (`home`) and Stack (`flush`) extended; each marked in
  `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0024 fills the design's
  gaps and supersedes ADR 0022's first-stamp rule.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the Podium is its own
  13 kB chunk; nothing new reached `main`.
- *A link or button block is an attribute component* (02, 2): "Play again" is
  `button[atw-toy-button]` and "Home" `a[atw-toy-button]` with `routerLink`.
- *Drive states through the fixture* (02, 3): `clock` and `random` drive every ending; nothing
  new was needed in the fixture.
- *An unreachable state gets a unit test of the page* (02, 4): the Podium's loading state and a
  child placed 4th.
- *Tag one spec per feature `@critical`* (02, 5): the child who goes all the way round.
- *Put the page in the group that provides its service* (03, 1): the Podium is in the solo
  group, so "Play again" reaches the same `SoloGame` and "Home" destroys it.
- *Measure the initial bundle against the base commit* (03, 2): 255.44 kB before, 255.39 kB
  after.
- *A group of toggles is one component* (03, 3): not needed.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s unit tests prove the ending, the
  result and "Play again".
- *Drive game time from the wall clock* (04, 1): the time limit is on `GameClock`.
- *Prefer signals and outputs to `effect()`* (04, 2): the Podium tells `VISIT` from its
  constructor, with no effect.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the steps are "The top 3".
- *Let a rule with chance take a `RandomSource`* (04, 5): not needed; the ending has no chance.
- *Measure a template feature on the chunk table* (05, 1): no `@defer`; the loading state follows
  the result (ADR 0024).
- *Let the game service decide when the screen changes* (05, 2): `SoloGame` moves to `podium`
  after the last message, and the navigator follows.
- *Draw a picture once in `<defs>`* (05, 3) and *share SVG parts* (05, 4): not needed.
- *Work out a rule with chance at its start* (05, 5): "Back to the card" ends the tour at once
  when a classmates' duel played out reaches the time limit.


## Journey 07: Shout answers after the Mic Check

**What slowed it.**

- CDK Dialog, which `AGENTS.md` requires, put 14.7 kB of `@angular/core` and RxJS into `main`
  although `@angular/cdk` and the dialog load lazily on the first press of the settings button.
  The initial budget moved to 272 kB (ADR 0026); no other route kept CDK out of `main`.
- The CDK overlay's pane is a popover whose dialog container had no size while the dialog's
  backdrop and panel were `position: fixed`, so Playwright saw the dialog as hidden. A pane
  that fills the screen, filled by the dialog, fixed it and kept the sheet-or-card layout in CSS.
- Every earlier spec that pressed "Go!" met Mic Check, since the fake browser has speech
  recognition. The specs of the number pad now keep `wayOfAnswering: 'numberPad'` (Mic Check is
  skipped, `L2-012` criterion 13), and journey 03's critical path a browser with no recognition.
- Waits between screens passed too quickly in a row (`clock.pass` three times without an
  `expect` between) left World Map on screen: each wait is scheduled when the one before it
  fires, so a spec waits for each screen before moving the clock on.

**New lessons.**

1. Before choosing a library a rule mandates (CDK Dialog), build it once and read the chunk
   table: a lazily loaded library still moves the framework code it calls into `main`.
2. Start and stop a browser resource with the element that shows it: a directive on the
   "Shout it!" pill listens while it exists, so every rule that hides the pill (a freeze, a
   decided duel, the pad, leaving Duel) stops recognition, with no effect.
3. Give a fake every answer the browser can give, and the time it takes: a question held open
   (`microphone.ask()`), silence, a failure, and counts of what is still open
   (`voice.listening()`, `microphone.openStreams()`) to prove a release.
4. Keep a contract's state where the whole game keeps it (`PlayerChoices`, `Visit`), so a
   service a lazy route binds (the way of answering, on Home and in the solo group) can be
   bound more than once without disagreeing.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): it showed CDK's cost at the first build.
- *Check a fake once by hand* (01, 2): Mic Check's "no speech", the freeze that stops listening
  and the refusal on "Shout instead" were each broken by hand and failed their specs.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): Listener, LevelMeter with
  Shout, Spinner, Switch and Dialog added; Icon extended (mic, mic off, keypad, settings,
  close); each marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0025 fills the designs'
  gaps; ADR 0026 records CDK Dialog's cost and leaves the native `<dialog>` to journey 18.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the speech code is its own
  2.9 kB chunk (`speech-voice-answer`), and Settings with CDK its own (`open-settings`).
- *A link or button block is an attribute component* (02, 2): "Shout it!" is `p[atw-shout]`.
- *Drive states through the fixture* (02, 3): extended with the voice and microphone fakes.
- *An unreachable state gets a unit test of the page* (02, 4): not needed; every state is
  reached through the fakes.
- *Tag one spec per feature `@critical`* (02, 5): Mic Check hears "Ready!" and opens the card.
- *Put the page in the group that provides its service* (03, 1): Mic Check is in the solo group,
  which binds the voice and the way of answering.
- *Measure the initial bundle against the base commit* (03, 2): a worktree build and the stats'
  inputs located every byte of the growth before ADR 0026.
- *A group of toggles is one component* (03, 3): not needed.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s unit test proves that the first
  card waits for Mic Check and that the classmates still answer.
- *Drive game time from the wall clock* (04, 1): criterion 8 is proved by passing 10 seconds on
  Mic Check and reading a full timer bar.
- *Prefer signals and outputs to `effect()`* (04, 2): listening follows the page through a
  directive's life, and the contract is a listener (ADR 0025).
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the switch's description and
  the dialog's name.
- *Let a rule with chance take a `RandomSource`* (04, 5): not needed.
- *Measure a template feature on the chunk table* (05, 1): CDK measured (lesson 1 above).
- *Let the game service decide when the screen changes* (05, 2): leaving Mic Check calls
  `continue()`, and the navigator opens Duel.
- *Work one example of a mock through the rule* (06, 1): the mocks' "“Ready!”" holds, since the
  contract carries no transcript.
- *A new game service method should reuse the start path* (06, 4): the first card after Mic
  Check is dealt by the same `begin` that "Play again" uses.

## Journey 08: Pause, leave and find the way back

**What slowed it.**

- A modal CDK dialog hides the screen behind it from assistive technology, so the page object's
  role locators (the timer bar) found nothing while Pause was open. A second locator with
  `includeHidden` reads the screen behind a dialog; the usual one stays strict.
- The browser's Back during a game was undesigned: from Duel it opened Game Setup over a game
  whose clock ran on. Holding it with a `canDeactivate` guard needed the router's
  `canceledNavigationResolution: 'computed'`, and CDK Dialog's `closeOnNavigation` then closed
  the Pause dialog on the router's own restoring `popstate` until it was turned off (ADR 0027).
- A spec that clicks a button whose dialog loads lazily and then presses Escape at once sends
  the key before the dialog exists; each spec now waits for the dialog before acting on it.
- An assertion that something did not happen while paused passes before the next tick of the
  game's interval, so a broken pause could slip through. The specs check after "Keep playing",
  when many ticks have run, and each was proved by breaking `pause()` by hand.
- The leave-game dialog needs a game with friends, which journey 14 builds: its states are
  proved by unit tests of the dialog and of Duel with a game of kind `friends`.

**New lessons.**

1. Put a rule that stops time on the one clock everything waits on: `GameClock.pause()` held
   the card, the freeze, the classmates, the waits between screens and the tour's time limit
   with no rule of their own.
2. Design the browser's Back on every screen, not only the drawn Back button, and hold it with
   a `canDeactivate` guard that reads the navigation's `trigger`, never one that blocks the
   game's own navigations.
3. Break the game in a spec through a browser API the fixture already owns (`random.breaks()`),
   and declare the console error it expects; add no hook for tests to the product.
4. Prove "nothing happened while paused" after the pause ends, once the clock has ticked many
   times, rather than straight after moving the clock on.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build;
  `main` went from 270.72 kB to 271.38 kB with the error handler and the two routes.
- *Check a fake once by hand* (01, 2): a `pause()` that did not stop the clock failed both pause
  specs; `random.breaks()` was seen to fail the spec until the error page existed.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): Notice added; Dialog
  (`closeLabel`, `closable`) and Icon (alert, globe, leave, pause, play) extended; each marked
  in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0027 fills
  the designs' gaps.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the Pause and leave-game
  dialogs and both notice pages are their own lazy chunks.
- *A link or button block is an attribute component* (02, 2): extended to Notice, on the page's
  `<main>`, as Screen body is.
- *Drive states through the fixture* (02, 3): extended with `random.breaks()`.
- *An unreachable state gets a unit test of the page* (02, 4): the leave-game dialog's two
  states and Duel's "Leave the game".
- *Tag one spec per feature `@critical`* (02, 5): Pause and "Keep playing", and Not Found.
- *Put the page in the group that provides its service* (03, 1): the Pause dialog is opened
  with the solo group's injector, so it reaches the same `SoloGame`.
- *Measure the initial bundle against the base commit* (03, 2): 270.72 kB before, 271.38 kB
  after.
- *A group of toggles is one component* (03, 3): not needed.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s unit tests prove the held time
  limit, the held freeze, leaving, and a new game from Game Setup after the Podium.
- *Drive game time from the wall clock* (04, 1): a paused game is proved by passing a minute.
- *Prefer signals and outputs to `effect()`* (04, 2): `paused` is a signal Duel reads in a
  `computed`; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the dialogs are found by their
  names ("Paused"), and the close buttons by "Keep playing" and "Stay and play".
- *Let a rule with chance take a `RandomSource`* (04, 5): not needed.
- *Measure a template feature on the chunk table* (05, 1): no new template feature.
- *Let the game service decide when the screen changes* (05, 2): "Go home" leaves the game and
  opens Home; the navigator stops listening as the game stops.
- *Work one example of a mock through the rule* (06, 1): the mock's "Your desk at Italy" is the
  duel's desk, which is what the dialog names.
- *Keep the placing table in one method* (06, 3): not needed.
- *A new game service method should reuse the start path* (06, 4): "Go!" after the Podium drops
  the ended tour and takes the same `start` path.
- *Build CDK-mandated libraries once and read the chunk table* (07, 1): the dialogs reuse CDK
  Dialog's chunk, and `main` did not grow from them.
- *Start and stop a browser resource with the element that shows it* (07, 2): while paused
  "Shout it!" is gone, so listening stops and starts again on "Keep playing".
- *Give a fake every answer the browser can give* (07, 3): `voice.listening()` proves that
  nothing listens while paused.
- *Keep a contract's state where the whole game keeps it* (07, 4): `paused` lives in the
  session, which the guard, Duel and the dialog share.

## Journey 09: Draw the 3D classroom and its cast

**What slowed it.**

- The Blender exports the design names are not in the repository. A script builds a stand-in of
  both scenes from three.js primitives with `GLTFExporter` under Node (which needs a small
  `FileReader`), in the same glTF format and at the same paths (ADR 0028). Sharing one geometry
  per shape took the cast from 450 kB to 77 kB.
- World Map's labels had to sit over the 3D room. Rather than project each label, the 3D room
  is laid out on the plan World Map's drawn room already uses: an orthographic camera at 30°
  and 100 px a metre draws the ring as `RoomLayout`'s ellipse, and frames the same rectangle
  as the SVG's `viewBox` (`meet`, or `slice` for the zoom).
- In headless Chromium (SwiftShader) a transparent canvas drew the room's materials white
  after its shadow map was used; an opaque canvas, coloured from the page's own token, fixed it
  and is the cheaper canvas to composite anyway. Two more white rooms came from the test set-up,
  not the game: `Math.random` fixed by a script (three.js makes its ids from it) and a second
  page in the same browser. Screenshots for a visual check need a fresh browser and the real
  `Math.random`.
- The behaviour specs now draw the classroom on every Home, Duel and World Map: the full suite
  went from 38 s to about 100 s locally, mostly the scenes loaded and shaders compiled again on
  each screen. CI runs only the `@critical` specs, so it stays well under its 5 minutes.

**New lessons.**

1. Put a browser resource the game must release behind a count the fixture can read (WebGL
   contexts not yet lost, as the microphone's open tracks), and lose the context on dispose so
   the count proves the release.
2. When a new drawing must line up with an existing one, share the existing one's coordinate
   plan and frame the camera to its `viewBox`, rather than projecting each label.
3. A library reached only through `import()` needs ESLint's boundaries to count dynamic
   imports (`boundaries/dependency-nodes`), or nothing stops another library reaching it.
4. Split a loop from what it draws (`AnimationLoop`) so its pause and its release are unit
   tested with fake frames, without WebGL.
5. Keep a page's still picture and the mocks' classes in the page, and add the canvas beside
   it with a directive, so the fallback is the markup the mocks already draw.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): it showed the initial bundle at
  271.53 kB with the loader binding (271.38 kB before) and Three.js in its own lazy chunk.
- *Check a fake once by hand* (01, 2): the loop's pause and the scene's hop were broken by hand
  and failed their unit tests; `cannotDraw()` and `refuse()` were seen to fail the Home specs
  before the words existed.
- *Check an ESLint boundary by hand* (01, 3): `world` importing `domain`, and `domain`
  importing `world` dynamically, each failed lint (the second only after lesson 3 above).
- *Build a component the first time a screen needs it* (01, 4): no new component; WorldMap
  (`labelsOnly`), Alert (Home, World Map) and MapToast (`inside`) reused or extended, each
  marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0028
  fills the design's gaps.
- *Mark libraries side-effect free and read the chunk table* (02, 1): `@atw/world` is
  `"sideEffects": false`; the table shows Three.js and the renderer in one lazy chunk.
- *A link or button block is an attribute component* (02, 2): the classroom is a directive on
  the native `<canvas>`.
- *Drive states through the fixture* (02, 3): extended with `classroom` (hold back, refuse,
  cannot draw, open contexts).
- *An unreachable state gets a unit test of the page* (02, 4): not needed; every state is
  reached through the fixture, and the animations are proved by unit tests of the domain and
  the scene.
- *Tag one spec per feature `@critical`* (02, 5): Home's classroom, and World Map's from above
  with each screen's release.
- *Put the page in the group that provides its service* (03, 1): not needed; the renderer's
  loader is bound in `app.config.ts`, holding no reference to Three.js.
- *Measure the initial bundle against the base commit* (03, 2): 271.38 kB before, 271.53 kB
  after; the 272 kB warning was not moved.
- *Prefer signals and outputs to `effect()`* (04, 2): the directive pushes state from
  `ngOnChanges` and reports through an output; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): Duel's state for the
  classroom is a `computed` with a structural `equal`, so the timer's ticks do not reach the
  renderer; the new specs ran with `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): World Map's room keeps its name
  over the 3D classroom; the still picture is "A picture of the classroom".
- *Measure a template feature on the chunk table* (05, 1): no `@defer`, which would have put
  its runtime in `main`; the directive's dynamic `import()` costs nothing there.
- *Draw a picture once in `<defs>`* (05, 3): the drawn room's labels are still drawn once and
  shown in both views.
- *Start and stop a browser resource with the element that shows it* (07, 2): the renderer
  lives exactly as long as its canvas.
- *Give a fake every answer the browser can give* (07, 3): WebGL is the browser's own, and the
  fixture takes it away or counts it.

## Journey 10: Feel the hop with motion and sound

**What slowed it.**

- Most of the motion the design planned (the shake, the stamp, the Podium's rise, the 3D hop)
  had already been built by journeys 04 to 09, each in its own stylesheet or renderer, so the
  design's `MomentPlan`, `MomentPlayer` and `MotionPreference` would have duplicated it. Working
  out what was left (the flip, the sounds, the mute, and two reduced forms that ended at once)
  came before any code, and ADR 0029 trimmed the design to it.
- Under reduced motion every duration token drops to 0.01 ms, so the stamp's and the Podium's
  "fade" ended at once and a spec that only asked for "no more than 200 ms" passed it. A new
  token, `--duration-fade`, keeps its 200 ms, and the specs ask for at least 100 ms.
- A new card that flips in changes its bounding box for 200 ms, so an older layout spec that
  measured the card at once failed under the full suite's load. Duel's page object now waits
  for the card's animations to finish before it measures.
- A flip and a shake on the same element replay each other when the class that adds the shake
  comes and goes; giving each its own property (`transform`, `translate`) and listing both
  while frozen keeps the flip from running again.
- No sound files existed. A small script makes three licence-clean WAV files from sine tones,
  as the classroom's stand-in did for the scenes (ADR 0028).

**New lessons.**

1. Before building a design written ahead of the code, list what earlier journeys already
   built for it, and cut the design to the gap with an ADR rather than building its plan.
2. Prove a reduced-motion fade with a lower bound as well as an upper one: a token that drops
   to nothing passes "no more than".
3. A layout check on an element that animates in waits for its animations to finish
   (`getAnimations()` and `finished`), or it measures a moving box.
4. Read a browser record the platform already keeps (`navigator.userActivation`) before adding
   a listener of your own: it needs no release and holds on every screen.
5. Keep a fake's record of what played by the file's name, and count the elements still holding
   a source, so a spec proves both what was heard and that it was let go.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): `main` grew from 271.55 kB to
  271.87 kB with the mute in the player's record; the sound code is in the solo group's chunk.
- *Check a fake once by hand* (01, 2): a mute that was ignored failed "while muted"; the Podium
  on the old token failed its reduced-motion spec.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): no new component; FlashCard
  (flip and fades), StampCard and Podium (the fade token), Icon (sound, mute), IconButton
  (Home's sound button) and Switch (Settings' "Sound") extended or reused, each marked in
  `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0029
  fills the design's gaps.
- *Mark libraries side-effect free and read the chunk table* (02, 1): `BrowserSound` and
  `MomentSounds` are in `solo-game-routes`, and Home's button in `home`.
- *Drive states through the fixture* (02, 3): extended with `sound` (what played, what is
  still open), and reduced motion through Playwright's own `emulateMedia`.
- *An unreachable state gets a unit test of the page* (02, 4): the first touch and the 3D
  hop's fade are proved by unit tests of `BrowserSound` and `ClassroomScene`.
- *Tag one spec per feature `@critical`* (02, 5): the flip, the shake and the stamp.
- *Put the page in the group that provides its service* (03, 1): `SOUND` is bound in the solo
  group, so leaving the game lets every sound go.
- *Measure the initial bundle against the base commit* (03, 2): 271.55 kB before, 271.87 kB
  after; the 272 kB warning was not moved.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s tests prove which moments are
  reported, and that a stopped listener hears no more.
- *Prefer signals and outputs to `effect()`* (04, 2): moments are a listener, as screens are
  (ADR 0023); no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new and the Duel specs
  ran with `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the sound button's "Mute
  sound" and "Turn sound on", and the "Sound" switch first in Settings.
- *Let the game service decide when the screen changes* (05, 2): the session decides the
  moments; the pages only play them.
- *Start and stop a browser resource with the element that shows it* (07, 2): the audio
  elements live as long as the solo group.
- *Give a fake every answer the browser can give* (07, 3): a refused `play()` is covered by a
  unit test; the fake resolves it.
- *Put a browser resource behind a count the fixture can read* (09, 1): `openSounds()` proves
  the release when the child goes home.
- *Split a loop from what it draws* (09, 4): the hop's fade is tested on `ClassroomScene` with
  fake frames, without WebGL.
