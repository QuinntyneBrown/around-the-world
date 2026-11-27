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

## Journey 11: Let Gemini Nano drive the classmates

**What slowed it.**

- The design put `SoloGame` in the `game` application and had it import the model code itself,
  but `SoloGame` has lived in `domain`'s `tour/` since journey 04. Binding `CLASSMATE_MODEL` to a
  small `LazyClassmateModel` in the solo group, as `LazyVoiceAnswer` is bound, kept the Prompt
  API code in a 2.4 kB chunk of its own and the initial bundle at 271.87 kB, unchanged.
- The fixture's fake model failed a spec as soon as the game prompted more often than the spec
  had answered, and a spec cannot know the card before the game deals it. A prompt held until
  the spec replies (`model.holds()`, `reply`) let a spec read the card first and then answer it,
  and doubles as the slow model.
- A model session can arrive in the middle of its classmate's duel. Keeping the profile's
  answer as a pending timer on the duel (`profileAnswer`) let a late session still be asked
  about the open card, and let the profile's time abort the prompt.
- The four slices were written test-first in one spec file, but the code for all four went in
  together, because the race between the profile's timer and the model's promise is one
  method; each slice's spec was then proved by breaking `askModel` by hand (seven of eleven
  specs failed as expected).

**New lessons.**

1. When a browser resource answers later than the game's clock, keep the clock's own decision
   as a pending timer and let the late answer replace it only while that timer is pending:
   nothing ever waits, and the abort is the timer firing.
2. Give a fake a mode that holds each request until the spec answers it: the spec can read
   what the game showed before it answers, and the same mode is the slow or silent case.
3. Make the fake record what a browser API was given (`model.asked()`), so a spec proves that
   nothing of the child reaches it, rather than trusting the prompt builder's unit test alone.
4. Let a fake refuse the call that would start a download or a permission prompt, and record
   it as a problem: every spec then proves the game never makes it.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): the build showed the model code in its
  own lazy chunk and `main` unchanged at 271.87 kB.
- *Check a fake once by hand* (01, 2): a `SoloGame` that never asked the model failed seven of
  the eleven new specs; restored at once.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): not needed; nothing on screen
  changes, and no component was added or extended.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0030 fills
  the design's gaps.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the chunk table shows the
  Prompt API code only in its lazy chunk.
- *Drive states through the fixture* (02, 3): extended with the model's holds, replies,
  failures, absence and record of what it was asked.
- *Tag one spec per feature `@critical`* (02, 5): a classmate answers what the model decides.
- *Put the page in the group that provides its service* (03, 1): `CLASSMATE_MODEL` is bound in
  the solo group, so leaving the game destroys every session with it.
- *Measure the initial bundle against the base commit* (03, 2): 271.87 kB before and after.
- *Prove a hand-over with a unit test* (03, 4): `SoloGame`'s model tests prove the order of the
  sessions, the floor, the abort, the late session and "Play again".
- *Drive game time from the wall clock* (04, 1): a model's time is scheduled on `GameClock`, so
  a held clock holds it as it holds a profile's.
- *Prefer signals and outputs to `effect()`* (04, 2): no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Let a rule with chance take a `RandomSource`* (04, 5): `Math.random` fixed through the
  fixture sets the profile's answer each spec races the model against.
- *Let the game service decide when the screen changes* (05, 2): `SoloGame` drops the sessions
  where it ends the tour, with no new listener.
- *A new game service method should reuse the start path* (06, 4): "Play again" and "Go!"
  open their sessions through the same `openSessions`.
- *Start and stop a browser resource with its owner* (07, 2): the sessions live as long as the
  tour, and the solo group's injector destroys any left.
- *Give a fake every answer the browser can give* (07, 3): available, downloadable, missing,
  slow, failing and nonsense replies.
- *Put a browser resource behind a count the fixture can read* (09, 1): `sessions()` counts what
  is still open, proving the release on the Podium and on "Go home".

## Journey 12: Make a room as host

**What slowed it.**

- Angular's `HttpClient`, provided only by Solo Or Friends' lazy route, still moved 25.3 kB of
  `@angular/common` into `main`; a worktree build of the base commit and the two stats files,
  compared module by module, found it at once. The game's few JSON requests use `fetch`
  (`FetchRoomsApi`), and the room group's route and the visit's room cost the last 0.31 kB,
  which moved the initial warning to 273 kB (ADR 0031).
- "Play solo works" with no network was not true: offline, the router could not fetch Game
  Setup's chunk, and then the classmates' agents. Nothing had ever fetched the solo game's
  code ahead; Solo Or Friends now does (`warmSoloGame`), and the spec plays a card offline.
- ASP.NET Core's test server does not enforce `[RequestSizeLimit]`, so the 1 KB limit is also
  read from the declared length by a small middleware, which both hosts share.
- The rate limit counted every acceptance test's rooms, since the test server has one address:
  the fixture lifts the limit, and `ThrottledApiFixture` keeps production's.
- A hosted sweep on `PeriodicTimer` runs after `FakeTimeProvider.Advance` returns, on its own
  thread; a test awaits a sweep at or after the time it advanced to, through a pipeline
  behaviour that records each sweep, rather than the first sweep to arrive.
- The UI for every Solo Or Friends state went in with the first frontend slice, so the
  rate-limit and error specs were green on their first run; each was broken by hand
  (`roomRefusal` ignoring `rate_limited`) and failed as expected.

**New lessons.**

1. Before binding a framework service from a lazy route, read the chunk table: shared framework
   code lands in `main` whichever chunk asks for it, and a platform API (`fetch`) may cost
   nothing.
2. A requirement that a screen works offline needs that screen's next code already on the
   device: drive it with the fixture's `network.offline()` past the first lazy chunk, not just
   to the banner.
3. Give a backend acceptance fixture the production limits only in a fixture of its own, so a
   test of another rule is never refused by them.
4. Await a background job in a backend test through a pipeline behaviour that records what the
   job was asked, by the time it was asked at; never the first run after the clock moved.
5. Give the fixture's `backend` a record of the requests the game sent, so a spec proves that
   only closed values left the device.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build,
  which showed `HttpClient` in `main` at the first build.
- *Check a fake once by hand* (01, 2): the code generator with no blocked words failed its
  three cases, a `make-room` limit of 11 failed the rate-limit test, and `roomRefusal` ignoring
  `rate_limited` failed its spec.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): RoomCode, Summary, PlayerCard,
  PlayerList and Badge added; Alert (`urgent`, `banner`, `icon`, no title), ModeCard (`note`),
  PanelHead (`level`), Stack (on `<aside>`) and Icon (crown, wifi off) extended; each marked in
  `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0031 records `fetch` in
  place of `HttpClient` and the budget.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the Lobby and Solo Or
  Friends are their own chunks; `main` went from 251.04 kB to 251.35 kB.
- *A link or button block is an attribute component* (02, 2): RoomCode on `<section>`, Summary
  on `<dl>`, PlayerList on `<ul>`, PlayerCard on `<li>` and Badge on `<span>`.
- *Drive states through the fixture* (02, 3): extended with `backend.holdBack`,
  `backend.unreachable`, `backend.requests()` and `network`.
- *Tag one spec per feature `@critical`* (02, 5): a host makes a room and sees its Lobby.
- *Put the page in the group that provides its service* (03, 1): the visit holds the room, so
  the Lobby's group needs nothing handed through the router.
- *Measure the initial bundle against the base commit* (03, 2): a worktree build located the
  25.3 kB and then the 0.31 kB.
- *Prefer signals and outputs to `effect()`* (04, 2): the network is a signal over the
  browser's events; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the code ("B O L T") and the
  count ("1 of 8 players") were paragraphs whose names were lost; both are `role="img"` now,
  in the mocks too.
- *Put a browser resource behind a count the fixture can read* (09, 1): not needed; the
  network listener is released with its route.

## Journey 13: Join a room and wait in the Lobby

**What slowed it.**

- EF Core marks an entity with a client-made `Guid` key, found through a navigation, as
  modified rather than added; the first join answered 500 until `RoomPlayer.Id` was configured
  `ValueGeneratedNever`.
- EF Core InMemory has no transactions: a save that fails its concurrency check has already
  written its added rows, so two racing joins left 9 players in a room of 8. The rule is proved
  with a store double that refuses the whole save, as the room store does, injected through
  `IAppDbContext`; racing two real requests proves nothing on InMemory.
- After a join was refused, Backspace in the code field did nothing: Chrome put the caret at
  the start once the field was disabled and enabled again, and the fourth letter was then
  refused by `maxlength`. The field moves the caret to the end before each key.
- A room's link is the Lobby's own address, so joining from it navigates to the address already
  shown, which the router ignores; the join navigates with `onSameUrlNavigation: 'reload'`.
- `model()`, `afterNextRender` and `viewChild()` in one lazy component moved 1.25 kB of
  `@angular/core` into `main`: esbuild splits by module, and the framework's modules are in
  `main`.
- Reading the boxes' text straight after typing raced the zoneless render; retrying
  assertions (`toHaveText` on the list) fixed it.

**New lessons.**

1. Before using a framework API no screen used yet, build and compare `main`: a lazy chunk's
   first use of a framework module's export lands in the initial bundle.
2. A backend rule that relies on the store's unit of work is proved through a store double
   that refuses the whole save; EF Core InMemory writes part of a failed save.
3. Give an invisible input that stands in for drawn boxes a fixed caret, and test editing it
   after it was disabled and enabled again.
4. Fake a real-time channel in the shared fixture at its protocol (SignalR's JSON records over
   `routeWebSocket`), with the tokens presented and the methods invoked recorded, so specs
   prove what the game sends and that it closes the connection.
5. A notification that leaves by itself is timed by a small pausable timer with its own unit
   tests on a fake clock; the spec proves only that it leaves and that a failure stays.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build,
  which showed the 1.25 kB in `main` at once.
- *Check a fake once by hand* (01, 2): the join handler without its retry failed the race test,
  the join without its push failed the hub test with the state that did arrive, and Room
  ignoring `room_full` failed its spec.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place, and
  `@microsoft/signalr` is imported by `api` only, dynamically.
- *Build a component the first time a screen needs it* (01, 4): CodeField, FieldMessage, Toast
  and ToastRegion added; PlayerCard and PlayerList (`loading`), IconButton (`onCode`),
  TextButton (on `<a>`), Stack (`narrow`) and Icon (copy, person) extended; each marked in
  `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0032
  fills the designs' gaps and records the budget.
- *Mark libraries side-effect free and read the chunk table* (02, 1): the SignalR client is its
  own lazy chunk, imported dynamically by the room group's chunk only.
- *A link or button block is an attribute component* (02, 2): CodeField on `<label>`,
  FieldMessage on `<p>`, ToastRegion on `<div>`.
- *Drive states through the fixture* (02, 3): `roomHub` (serves, holds back, refuses, drops,
  changes) and `clipboard` (refuses, copied).
- *Tag one spec per feature `@critical`* (02, 5): a friend joins and waits; a friend who joins
  appears in the host's Lobby with a passing message.
- *Put the page in the group that provides its service* (03, 1): the room group provides the
  connection and `FriendsGame`, so leaving the group leaves the room and closes the
  connection.
- *Measure the initial bundle against the base commit* (03, 2): a worktree build of journey
  12's commit, compared module by module, found the framework code and then the 0.96 kB.
- *Prove a hand-over with a unit test* (03, 4): `FriendsGame`'s tests prove the connect, the
  lost room, "Try again", the leave and the release when the group is destroyed.
- *Prefer signals and outputs to `effect()`* (04, 2): the Lobby's messages are a
  `linkedSignal` over the room; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Check accessible names with `toHaveAccessibleName`* (04, 4): the count of a full room reads
  "8 of 8 players".
- *Put a browser resource behind a count the fixture can read* (09, 1): `roomHub` counts the
  open connections, proving the release on "Leave the room" and on Back.
- *Read the chunk table before binding a framework service* (12, 1): CDK `Clipboard` stays in
  the Lobby's chunk.
- *Give the production limits a fixture of their own* (12, 3): the `join-room` limit is lifted
  in `ApiFixture` and kept in `ThrottledApiFixture`.
- *Await a background job through a pipeline behaviour* (12, 4): hub tests await each room state
  through a client that records what arrived, by what it holds.
- *Record what the game sent* (12, 5): the join's body and the tokens the connections presented.

## Journey 14: Play a game with friends in real time

**What slowed it.**

- The rules live on the device for a solo game and had to be written again on the server for a
  game with friends. One table of cases (`docs/specs/tour-cases.json`), played by a Vitest spec
  of `domain` and an xUnit theory of the backend, keeps the two equal; the device's rules passed
  every case first, which proved the table, and the server's port then failed only where it was
  broken by hand (a freeze ending one millisecond late failed two cases) (ADR 0033).
- The design's seven hub events (`GameStarted`, `FlashCardShown`, `DuelDecided`…) would each have
  needed a handler and a fake. One `GameChanged` carrying the whole game, with durations left
  rather than the server's times, let the device keep the last state only and let a pure helper
  (`FriendsView`) work out the duel, the tour, the result and the screen from it.
- A mutable domain object stored as a JSON column is not seen as changed by EF Core unless the
  converter has a `ValueComparer` that compares and snapshots it by its JSON; the domain's
  private setters are written through a `System.Text.Json` resolver modifier in Infrastructure,
  so the domain knows nothing of storage.
- A hosted service on `PeriodicTimer` with `FakeTimeProvider` runs at the final time of an
  `Advance`, so every event of the game (the first card, a classmate's answer, a card's time)
  runs at its own due time inside `RoomGame.Advance`, in order, however late the tick.
- `RoomHubClient.WaitForAsync` returned the first matching state ever received, so "the room
  waiting again" matched the Lobby before the race; `WaitForNextAsync` waits from now on.
- `RoomSession.start` and `GameSession.start` clashed on `FriendsGame`, which implements both;
  the Lobby's is `startRace`.
- The backend's code for every slice, and the frontend's for slices 2 to 6, was written before
  their specs ran, so most specs were green on their first run. Each was broken by hand (the
  room's timers not registered; the loser's World Map, the Podium's lost room and Mic Check
  switched off) and failed for the expected reason.

**New lessons.**

1. When the server and the device must apply the same rules, write one table of cases in a
   neutral file both test projects read, and let the table name the requirement of each case.
2. Send a real-time game as one state with durations left, not as events with the server's
   times: a device then needs no clock of the server's, keeps one state, and a missed message
   is put right by the next.
3. Give a hosted service's work a "due at" column with an index and let the domain run every
   event due by `now` at its own time, so a fake clock moved in one step plays out exactly.
4. Store a domain aggregate as JSON only with a value comparer that snapshots it, or EF Core
   saves nothing of a change made in place.
5. A test helper that waits for "a state like this" must say whether it means any received so
   far or the next one; offer both.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build.
- *Check a fake once by hand* (01, 2): the room's timers, the freeze, the loser's World Map,
  the Podium's lost room and Mic Check were each broken by hand.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): no new component; Icon
  (`sliders`) and TableKeys (`locked`) extended; Alert, Spinner, Skeleton, TextButton and
  ToyButton reused in the Lobby, Game Setup and Podium in a room.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADRs 0033 and
  0034 fill the designs' gaps. `L2-030` criterion 8 (Mic Check's Back to the Lobby) was changed,
  since the race has started when Mic Check shows.
- *Mark libraries side-effect free and read the chunk table* (02, 1): `main` grew 0.15 kB, the
  room guard; everything else is in the room group's chunks.
- *Drive states through the fixture* (02, 3): `roomHub` gained `game`, `invocations`,
  `holdBackMethod`, `refusesMethod` and `acceptsMethod`.
- *Tag one spec per feature `@critical`* (02, 5): the host starts, answers, hops and ends on the
  Podium.
- *Put the page in the group that provides its service* (03, 1): Game Setup, Mic Check, Duel,
  World Map and the Podium join the room group, which provides `GAME_SESSION`.
- *Drive game time from the wall clock* (04, 1): `FriendsGame` counts durations left on
  `GameClock`, so `clock.pass` moves the timer bar, the freeze and the screens.
- *Prefer signals and outputs to `effect()`* (04, 2): no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Let the game service decide when the screen changes* (05, 2): `FriendsView.screen` decides it,
  and the navigator listens.
- *Design the browser's Back on every screen* (08, 2): Back on Duel and World Map asks "Leave the
  game?" in a race.
- *Prove a backend rule through a store double* (13, 2): two answers saved together are proved
  with `WithFirstSaveRacedBy` over the hub.
- *Fake a real-time channel at its protocol* (13, 4): the fake hub completes, holds and refuses
  invocations as SignalR does.

## Journey 15: Watch a duel and send a sticker

**What slowed it.**

- ADR 0034 had a player not in the duel watch it on World Map, as a solo player who has sat down
  does, while `L2-028` criterion 1 has them watch it on Duel. `FriendsView` had to publish the
  duel with the role `watching` and send everyone to Duel while a card is open; journey 14's
  spec that pinned the old screen was changed with the requirement (ADR 0035).
- The mocks put the stickers 8.5 rem above the bottom of Duel. A spec that measured the stickers
  against the flash card at 360, 390 and 768 px failed at all three: under 992 px the watching
  player's bar wraps into two or three rows and the card leaves no room above it. The region now
  passes over the bar there, and the bar still takes a press through it; a screenshot of each
  size, taken by a throwaway line and then removed, showed where the room was.
- A spec that asserted "no switch" by counting the footer's buttons broke as soon as the sticker
  bar joined the footer; it now names the two switches.
- The stack's bound was built with the buffer in slice 2, so slice 3's stacked spec was green
  on its first run; it was broken by hand (four shown) and failed as expected.

**New lessons.**

1. When a spec says something must not cover something else, measure the two boxes at a
   phone, a tablet and a desktop in the behaviour spec: a mock drawn at one size can hide the
   overlap at the others.
2. Keep a per-connection limit in the hub connection's own `Context.Items`: it needs no
   dictionary, nothing to forget on disconnect, and cannot grow with the connections made.
3. A message that should leave in silence (a sticker the server ignores) is proved by a later
   message that does arrive: SignalR keeps one connection's order, so when the later one is
   received, anything sent before it would have been too.
4. Let a short-lived thing on screen (a sticker) live on the game's clock that already ticks,
   in a fixed-size buffer worked by a pure helper, rather than a timer of its own.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build;
  `main` stayed at 252.46 kB and the stickers are in Duel's lazy chunk.
- *Check a fake once by hand* (01, 2): the bound (four shown) was broken by hand and failed the
  stacked spec; the backend's limit test failed with all five stickers before the filter.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): StickerBar, StickerPop and
  StickerRegion added, reusing Portrait; marked in `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0035
  fills the design's gaps and amends ADR 0034.
- *A link or button block is an attribute component* (02, 2): the bar on `<div>`, a pop on
  `<p>`, the region on `<div>`.
- *Drive states through the fixture* (02, 3): `roomHub.sticker(id, from)` sends `StickerShown`.
- *Tag one spec per feature `@critical`* (02, 5): a watching player sends a sticker and everyone
  sees it.
- *Drive game time from the wall clock* (04, 1): a sticker leaves after `clock.pass(2000)`.
- *Prefer signals and outputs to `effect()`* (04, 2): the stickers showing are a `computed` over
  the buffer and the game's clock; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Let the game service decide when the screen changes* (05, 2): `FriendsView.screen` sends a
  watching player to Duel.
- *Give a fake every answer the browser can give* (07, 3): the voice and microphone fakes prove
  that a watching player who answers by voice opens no microphone.
- *Fake a real-time channel at its protocol* (13, 4): `StickerShown` is a SignalR record like
  `GameChanged`.
- *Say whether a test helper waits for any or the next* (14, 5): `WaitForStickerAsync` takes any
  received, and the tests then compare every sticker received.

## Journey 16: Come back after a lost connection

**What slowed it.**

- The design's `GameSnapshot` and `TourEnded` were types and events the game no longer needed:
  ADR 0033's single `GameChanged`, sent to every connection as it opens, is already the snapshot
  a returning device needs, so the return is the existing `RoomChanged` and `GameChanged` pair.
- SignalR's retry delays run on real timers, which the fixture's `clock` does not move. The
  30 seconds are counted on the game's clock, ticked every 100 ms, which now also ticks while
  the connection is being tried again, even in the Lobby; the fake hub holds a returning
  connection's handshake until `returns()`, so a return is instant and a give-up is a
  `clock.pass(30_000)`, with no spec waiting on SignalR's back-off.
- A backend test needs to know the server has noticed a lost connection before it moves the
  clock 30 seconds on. A pipeline behaviour that records every request handled, by the token of
  the connection it came from, let the tests await `MarkPlayerAwayCommand` for one player
  without the command existing yet, so the first run failed for the right reason.
- The host mark passed to "the earliest joiner" by `MinBy(JoinedAt)`, and every player of a test
  joined at the same fake time: the store's order decided. Ties now fall to the place taken.
- `FriendsGame`'s injected connection was named `connection`, the name `GameSession` now needed
  for the connection's state; it is `hub` now.
- The device's slices were written together, so most frontend specs passed at their first run
  after the first slice's; the dropped-out banner, "You're back!", World Map's filter and the
  wobbly rule were each broken by hand and failed their specs as expected. Breaking the
  standings' numbering did not fail a spec, since World Map draws only the players it is given;
  the spec guards the players' list, and a unit test of `FriendsView` the numbering.

**New lessons.**

1. When a library retries on its own timers, keep its back-off for the real network and decide
   the deadline on the game's clock as well, and let the fake hold a connection's handshake rather
   than refuse it, so a spec can return it at once or give up with one `clock.pass`.
2. A server that holds a spot for a lost connection must record which connection it was: a
   device that reconnects before the server notices the old one is gone must not be marked away
   by the old one's disconnect.
3. Let a test fixture record every request handled, with the caller's token, through one open
   generic pipeline behaviour: a test can await a request that has no handler yet, and fails
   naming what was handled.
4. When "the earliest" decides something, give it a tie-breaker that does not depend on the
   store's order: fake clocks make ties the rule in tests.
5. Give a page that can be covered by an overlay an `inert` binding on everything else, and
   hide the controls that would send while the overlay shows, so neither keyboard nor touch
   reaches them.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every spec ran against the build;
  `main` stayed at 252.46 kB and the initial total at 273.28 kB.
- *Check a fake once by hand* (01, 2): four behaviours were broken by hand, as above.
- *Check an ESLint boundary by hand* (01, 3): the boundary caught `ConnectionBanner`'s value
  import of `@atw/api`; it is `import type` now.
- *Build a component the first time a screen needs it* (01, 4): StatusOverlay and
  ConnectionBanner (composing Alert) added; Icon extended (`wifi`); marked in
  `frontend/projects/components/README.md`.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0036 fills
  the design's gaps and supersedes ADR 0032's Lobby retries.
- *Drive states through the fixture* (02, 3): `roomHub` gained `loses()` and `returns()`.
- *Tag one spec per feature `@critical`* (02, 5): a lost connection comes back to the same spot.
- *Measure the initial bundle against the base commit* (03, 2): 252.46 kB before and after.
- *Drive game time from the wall clock* (04, 1): the 30 seconds and every banner's time are on
  the game's clock.
- *Prefer signals and outputs to `effect()`* (04, 2): `connection` and `notice` are `computed`
  signals; no effect was added.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Let the game service decide when the screen changes* (05, 2): `FriendsGame` opens Duel when
  the connection is away, and `FriendsView` the Podium 3 seconds after everyone left.
- *Await a background job through a pipeline behaviour* (12, 4): the removal sweep is awaited by
  the time it swept at.
- *Prove a backend rule through a store double* (13, 2): not needed; a return and a removal that
  race are taken one at a time by the room's `Version`, as joins are.
- *Fake a real-time channel at its protocol* (13, 4): a lost connection is a WebSocket closed
  with no SignalR close message, and a refused return a handshake followed by a close message.
- *A test helper that waits must say any or next* (14, 5): the traveller test first matched the
  room state of the join; it waits for a room without the removed host now.
- *Measure overlap at three sizes* (15, 1): the wobbly banner was measured against the flash card
  on a phone, a tablet and a desktop.
- *Let a short-lived thing live on the game's clock* (15, 4): the banners are times on the clock
  that already ticks, not timers of their own.

## Journey 17: Run the backend in a deployed system

**What slowed it.**

- Azure SignalR Service never sees a client's query string or headers at the hub: the hub sees
  only the claims its negotiation put in the service's access token. `CurrentPlayerFilter` read
  the token from `access_token`, which would have known nobody once deployed, and the device
  skipped the negotiation the service needs (ADR 0032). The token became a claim of an
  authentication scheme, and the device negotiates; the self-served tests guard the claim (a
  wrong claim type failed 52 of them), and a negotiation through the SDK showed the claim in the
  service's token.
- The server SDK refuses a negotiation while the instance has no connection to the service, but
  counts a new endpoint online until its first try fails, so the same test answered a redirect
  in one run and a 500 in the next. The test now accepts either, and checks each fully.
- Its count of its connections to the service is internal, so readiness asks the service's
  public health API instead, through a named `HttpClient` the test answers in memory.
- An activity source is seen by every tracer in a process: the telemetry test caught another
  test server's `SubmitAnswerCommand` span about one run in three. It runs in an xUnit
  collection with parallelization off.
- The test server gives a request no remote address, so the forwarded headers were proved
  behind an `IStartupFilter` that sets the ingress's address first.
- `WebApplication` adds `UseAuthentication` by itself when a scheme is registered, so taking the
  explicit call out by hand failed nothing; the claim was broken instead.

**New lessons.**

1. A managed relay (Azure SignalR Service) changes what a hub can read about its caller: carry
   identity as claims from the negotiation, never as the request's query or headers, and do not
   let the client skip the negotiation.
2. When a vendor SDK's state is not public, probe the vendor's public health API through a
   named `HttpClient` the test can answer in memory, rather than reflect on internals.
3. Prove telemetry holds nothing about a child by exporting it in memory after the scrubber and
   searching every span, metric point and log record for the values the test sent; break each
   scrubber by hand once, and run that test alone, since activity sources are process-wide.
4. A test of a background state an SDK reaches in its own time must accept each state the
   product allows and assert each fully, not pin the one that happened to show first.
5. Prove forwarded headers with a known and an unknown proxy, each in its own fixture: the rate
   limit is what shows whose address was counted.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): the new spec ran against the build;
  `main` stayed at 252.46 kB and the initial total at 273.28 kB.
- *Check a fake once by hand* (01, 2): each scrubber, the claim and the answers' limit were
  broken by hand and failed their tests.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): not needed; no screen changed.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0037 records the decisions
  and supersedes ADR 0032's skipped negotiation; ADR 0009's proposed `AGENTS.md` exception for
  the live endpoint stands.
- *Tag one spec per feature `@critical`* (02, 5): a host's device follows the instance to the
  service and opens the Lobby.
- *Give the production limits a fixture of their own* (12, 3): the health limit is lifted in
  `ApiFixture` and kept in `ThrottledApiFixture` and the ingress fixtures.
- *Await a background job through a pipeline behaviour* (12, 4): the answers' limit counts the
  requests handled by token through the same request log.
- *Fake a real-time channel at its protocol* (13, 4): the fixture answers SignalR's negotiation,
  and the service's redirect and second negotiation, as the instance and the service would.
- *Let a test fixture record every request handled* (16, 3): `HandledCount` reads the same log.
- *Keep a per-connection limit in the connection's own items* (15, 2): the answers' limit is a
  ring of 5 times there, and the stickers' a ring of 1.

## Journey 18: Open fast and stay smooth on any device

**What slowed it.**

- The specs' server sent every file uncompressed, so the first measurement of Home on a phone on
  slow 4G (4.1 seconds) mostly measured `main` at 252 kB on the wire. The server now gzips text
  as the deployed host must, and the host's duty is in `docs/operations/settings.md`.
- With the compression fixed Home still took 2.5 seconds: its picture was asked for only once
  Home's code had run, and the 3D classroom's 133 kB shared the connection with it. A request
  waterfall, read from a short Playwright script on the throttled page, showed both at once.
- The first heap checks failed at 17.6% and 69.7%. Heap snapshot diffs showed the leak was the
  specs' own WebGL fake, which kept every context it counted and with it each released canvas
  and its page; V8's compiled code made up the rest of the growth.
- Event Timing measured a pressed digit at 144 to 264 ms. The digit was quick; the frame after
  it was not, since headless Chromium draws WebGL in software at about 10 frames a second.
- The 20-second spec passed at its first run, as journeys 01 to 17 had built the way; it was
  broken by hand (a 1-second limit) to prove it measures.

**New lessons.**

1. Before tuning a timing, serve the build as production does (compressed) and read the
   request waterfall under the throttled profile: it names the cause, where a single number
   only says something is slow.
2. Make the largest content of the first screen the first thing asked for, and let heavy
   extras (the 3D classroom, the next screens' code) wait until it is in.
3. A test fake that counts resources must let go of the ones the game released, or it is the
   leak a heap check finds. Diff two heap snapshots by kind of object before suspecting the game.
4. Measure a heap from a snapshot with compiled code left out: V8's optimising compiler grows
   the code space over the first runs, which is not memory the game holds.
5. Time a press with Event Timing against a screen without software-drawn WebGL; the machine
   that runs the specs is not a child's device, and a frame-bound measure there times the
   software renderer.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): every timing ran against the
  production build, now served compressed; `main` is 253.31 kB and the initial total 274.13 kB.
- *Check a fake once by hand* (01, 2): the 20-second limit was broken by hand, and the fakes'
  release was proved by the heap checks passing only once they let go.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): not needed; no screen changed
  its markup, and no component was added.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0038 measured CDK Dialog
  against the native `<dialog>` and keeps the `AGENTS.md` rule; no correction is proposed.
- *Tag one spec per feature `@critical`* (02, 5): the first flash card within 20 seconds on a
  school connection.
- *Measure the initial bundle against the base commit* (03, 2): module by module, `main` grew
  0.4 kB for the picture's request only; with no lazy route `main` would be 204 kB, so the rest
  is framework code the screens need.
- *Prefer signals and outputs to `effect()`* (04, 2): `linkedSignal` in the Lobby was measured
  and costs `main` nothing; nothing was changed.
- *Keep fast-changing input in the component that owns it* (04, 3): the new specs ran with
  `--repeat-each 3`.
- *Let a short-lived thing live on the game's clock* (15, 4): confirmed by the audit: the duel's
  timers and the stickers are bounded by the game's clock, so no general buffer was built.


## Journey 19: Make every screen work for every child

**What slowed it.**

- Duel on a phone 320 × 568 px held upright had no height to spare. Each extra (a frozen line,
  a banner, a two-line nickname) pushed the pad under the footer, and the prototype's own mock
  overlapped the same way. Measuring each part's top and height at that size, for each state,
  showed the budget in pixels; moving the desk into the duel strip cost more than it saved
  (the strip grew 150 px at 320 px wide), so the line of text gives way to a banner instead.
- A sweep that measures straight after a resize catches entrances mid-flight: a dialog sheet
  still sliding up, a podium step still rising (contrast 1.76 to 1 on a step fading in), the
  skip link still sliding down. Waiting for every animation that plays once fixed all three;
  waiting for every animation hung on the infinite ones (the level meter, the shimmer).
- Playwright needs a test's fixtures destructured, so a sweep cannot take `(fakes) =>`; and
  `import.meta` is unavailable in specs, which Playwright loads as CommonJS.
- The first overlap rule flagged messages by design over the screen (a toast over "Start the
  race", a received sticker over the sticker bar, ADR 0035). A message is now a live region
  placed over the screen and is measured against itself.
- The design described seven parts (`Viewport`, `LiveRegion`, `AlertMessage`, `ChoiceButton`,
  `duelAnnouncement`, `messageForCode`, a `breakpoints` partial) that earlier journeys had
  built under other names or done without; matching each to the code took a pass of its own.

**New lessons.**

1. Keep one registry of the states a sweep visits, each reached through the page objects and
   the fixture, and run every sweep and the default-run checks (targets, Tab order, skip link)
   over it: a new screen joins all of them with one entry.
2. Walk a screen with Tab by numbering its controls in page order first, then check each step
   goes to the next: it proves every control is reached, in order, with no positive
   `tabindex`, without a selector per screen.
3. Type and press Enter as a child does (`keyboard.type` then `press('Enter')` at once): a
   handler that reads an input signal sees the value before zoneless change detection has run.
   Read the native element on Enter.
4. A fragment link (`#main`) under `<base href="/">` resolves to the root and leaves the
   screen; a skip link must move the focus itself.
5. Before raising a sweep's measurement to a rule, let the page rest: one frame for the layout,
   then every finite animation finished.
6. Replace a design's literal breakpoints with a named partial in a library every build shares
   (`includePaths`), and compare the built CSS's media queries before and after.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): the sweeps and the new spec ran
  against the build; `main` is 253.53 kB and the initial total 274.39 kB.
- *Check a fake once by hand* (01, 2): the duel strip's name test was run against a build
  without the portrait fix and failed on "Cosmic Llama" breaking inside a word; the skip link
  and Enter specs failed on the real bugs first.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place (the
  partial is a stylesheet).
- *Build a component the first time a screen needs it* (01, 4): no component was added;
  Portrait, FlashCard, NumberPad, ConnectionBanner, ModeCard, SkipLink and CodeField were
  extended in `@atw/components` and the design system's CSS, and marked in its README.
- *An ADR for a rule that conflicts with best practice* (01, 5): none conflicted; ADR 0039
  records the sweeps, axe-core, the named breakpoints and why no `Viewport` contract was built.
- *Tag one spec per feature `@critical`* (02, 5): a whole solo tour by keyboard alone.
- *Measure the initial bundle against the base commit* (03, 2): `main` grew 0.22 kB, the skip
  link's handler, within the 275 kB warning.
- *Keep fast-changing input in the component that owns it* (04, 3): the code field's Enter
  now reads its own element.
- *Measure overlap at three sizes* (15, 1): extended to eight sizes and 200% zoom by the
  responsive and accessibility sweeps.

## Journey 20: Prove the game is safe for children

**What slowed it.**

- Angular's production build inlines the critical CSS with Beasties, which writes an inline
  `<script>` to switch the full stylesheet on; a policy with `script-src 'self'` refuses it.
  `autoCsp` would have hashed it but hides `main` from the preload scanner, so critical CSS is
  no longer inlined (3.35 kB compressed, fetched beside `main`; ADR 0040).
- Playwright's `routeWebSocket` replaces the page's `WebSocket`, so the browser's own
  `connect-src` check of a WebSocket never runs in a spec. `EventSource`, under the same
  directive, stands for it.
- Chrome words a refusal differently by kind ("Fetch API cannot load … Refused to connect",
  "Loading the image … violates the following Content Security Policy directive"), and the
  fixture fails a spec on any console error; the expected errors needed both forms.
- Most rules held at the audit's first run, built by journeys 02 to 17; each such audit was
  broken by hand in the product (an answer sent with its words, recognition off the device, a
  stored extra column) to see it fail for that reason.

**New lessons.**

1. Prove a Content Security Policy by asking another origin from the page and reading the
   browser's `securitypolicyviolation` events, one kind of request per directive; with no
   policy the spec fails on an empty list and the fixture's off-localhost guard.
2. Audit what leaves the device by reading every frame and body the game sent and allowing
   only closed values (a code, a kid, a setup word, a hub method, a number); then search all of
   it for the words the child said and their nickname. A list of the allowed is stricter than a
   list of the forbidden.
3. A value from the backend that the device turns into words must be checked on the device,
   even when the backend validates it: index a fixed list only with an index inside it.
4. Prove what a store holds by reading every column of every row through the converters that
   write it, after a whole game from devices that name their address and browser; break it once
   with an extra column.
5. Read the ARIA snapshot of every state of the sweeps' registry to prove what a screen asks
   for: its fields and its controls' names, without a selector per screen.

**Earlier lessons applied.**

- *Write the spec against the production build* (01, 1): the policy is proven in the very
  `index.html` the build writes; `main` is 253.53 kB and the initial total 274.39 kB.
- *Check a fake once by hand* (01, 2): the fixture's new records (frames, off-device
  recognition) were proven by breaking the product, which they caught.
- *Check an ESLint boundary by hand* (01, 3): not needed; no library changed its place.
- *Build a component the first time a screen needs it* (01, 4): not needed; no component was
  added or changed.
- *An ADR for a rule that conflicts with best practice* (01, 5): ADR 0040 records why the
  policy is a meta element with `style-src 'unsafe-inline'`, and asks the host for the
  `frame-ancestors` header a meta element cannot carry.
- *Tag one spec per feature `@critical`* (02, 5): the browser refuses another origin.
- *Measure the initial bundle against the base commit* (03, 2): unchanged; the stylesheet left
  the HTML, which is not in the budget.
- *Keep one registry of the states a sweep visits* (19, 1): the fields-and-controls audit runs
  over all 29 states with one loop.
