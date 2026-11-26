# Feature: Hop round the ring on the World Map

Journey 05 of `docs/journeys.md`. Winners hop to the next desk, losers sit, the map shows everyone.

## Goal

After each duel the result moves the players. A traveller who wins hops to the next desk and
duels its holder. A desk holder who wins becomes the traveller, and the beaten traveller sits at
that desk. World Map shows the classroom from above with every kid at their desk, the traveller
on the path, the desk they are at and the next stop lit, and each kid's colour on their name tag
and place on the world ring. A phone zooms to the player's own character; a tablet and wider
show the whole room. Until journey 09, the room is the still picture the mocks use; until
journey 10, the hop is a plain change of place.

This journey builds on journeys 01 to 04 in `docs/journeys.md`. Before you start, check
their % complete there and in the code. If one this journey needs is not done, build the smallest
part of it this journey needs first, record that in your summary, and go on.

## Finish the whole feature in one run. Do not stop. (CRITICAL)

- You are authorised to take this feature all the way: aligning the mocks, requirements, ADRs and
  detailed design, test-first implementation in slices, progress and lessons learned, green tests
  and a PR. Go through every phase and every slice in one continuous run. Do not pause between
  phases to report, ask for approval, or wait for "continue".
- Do not end your turn until the "Done means" list at the bottom is fully true. A partial result, a plan, or
  "the next steps would be..." is not done.
- Where the repo's instructions say "stop and ask", treat this prompt as the confirmation in advance for
  everything in scope here. Choose the simplest option that fits the existing architecture, record it (an ADR
  or the design's open-questions section, if the repo has them), and keep going.
- If a shared library, component or design asset lacks something, that is not a reason to stop. Update it
  first, as the repo's rules require, then go on.
- When a test, build or command fails, find the root cause and fix it, then go on. Never weaken a test to make
  it pass, and never skip a step quietly.
- Only stop for a real blocker you cannot resolve yourself, such as missing credentials, or an action outside
  this repo that can't be undone, such as production deploys or data changes. If that happens, finish
  everything else first, then report the blocker clearly.
- Keep track of progress (a todo list), so that nothing gets left out after context is summarised.

## Rules (read first, binding)

- Follow `AGENTS.md` exactly, especially:
  - Ask how each change serves playing a duel and going round the room. Build nothing outside this
    journey's scope; put anything nearby under "deferred" in your summary.
  - The mocks in `docs/mocks/` are the source of truth. When a mock changes, bring the requirement
    (`docs/specs/`), the ADR it touches (`docs/adr/`) and the detailed design
    (`docs/detailed-designs/`) in line with it, in that order, before any code.
  - Use the specs' words in code, docs and UI, with no synonyms: kid, nickname, tour, desk,
    country, traveller, desk holder, flash card, duel, hop, room, code, host, classmate, sticker,
    passport, stamp.
  - Frontend: current Angular (standalone, signals, `OnPush`, zoneless); `atw-*` selectors;
    `@atw/<library>` imports; the dependency direction enforced by ESLint; one file per type
    (`name.ts`, `name.html`, `name.scss`, never inline templates or styles); one encapsulated BEM
    stylesheet per component, keeping the mocks' BEM classes; tokens read by role, never hex;
    presentation in `components`; each service has a contract and token in `api`; logic with many
    cases in a service or helper with unit tests; CDK Dialog for dialogs; touch targets of at least
    44 x 44 px; colour never the only carrier of a state.
  - Lazy loading and memory come first: `loadComponent`/`loadChildren` for every route, `@defer`
    for heavy UI, dynamic imports for heavy libraries, everything acquired released when its owner
    is destroyed, nothing growing without a bound, state scoped to its use, budgets kept tight.
  - Backend: clean architecture (`AroundTheWorld.Domain` <- `Application` <- `Infrastructure` <-
    `Api`); a controller or hub method checks nothing and sends one MediatR request;
    ProblemDetails with a `code`; OpenTelemetry with nothing about a child; the server decides a
    game with friends.
  - Safety: no accounts, real names, free-text chat, adverts or purchases; nothing a child types
    or says leaves the device as text or sound.
  - Tests: ATDD. Playwright on Chromium only, page objects own the selectors, specs import
    `test`/`expect` from the shared fixture, no real microphone, on-device model, backend, database
    or network beyond localhost. Backend tests on EF Core InMemory, never sleeping
    (`FakeTimeProvider`, events awaited with a timeout). Unit tests advance a fake clock. Only
    behaviour specs run by default. Never write architecture tests.
  - CI stays green and under 5 minutes, running lint, build and one critical acceptance path per
    feature. Unit tests run locally. Run `node tools/verify/verify.mjs` before every push.
  - Run npm commands from `frontend/` and `dotnet` commands from `backend/`. Where a rule names
    something that does not exist yet, this change adds it.
- Work through the phases below **in order**, using the repo skill each phase names.
- Copy the house style of each folder. Read the existing neighbours before you write anything new.
- The hop and the sit are rules of the game and live in `domain`'s `tour/` only, with one unit test per case.
- The world ring, the name tags and the map toasts are presentation components in `components`.

## Phase 1: Read before you write

- `AGENTS.md`, then `docs/lessons-learned.md` (if it exists): apply the lessons that fit.
- The requirements: `L2-002`, `L2-003`, `L2-007`, `L2-034` in `docs/specs/L2.md`, and the L1s they detail in `docs/specs/L1.md`.
- The detailed designs:
  - `docs/detailed-designs/tour/travel-round-ring/README.md`
  - `docs/detailed-designs/tour/play-duel/README.md`
- The mocks (`docs/mocks/manifest.json` lists every state):
  - `docs/mocks/pages/world-map/` (default, hop, sit, desk-holder, short, long, loading, error)
  - `docs/mocks/pages/duel/hop.html` (the passport stamp landing on Duel)
  - `docs/mocks/notifications/map-toast/` (info, success, warning)
- The design system: `docs/design-system/README.md` and the component pages the mocks use.
- Every ADR in `docs/adr/` that covers the areas this journey touches.

## Phase 2: Mocks, then design system (`writing-html-mocks`, `extracting-design-systems`)

- If a state this journey needs is missing or wrong in `docs/mocks/`, add or fix it there first,
  update `docs/mocks/manifest.json` and `docs/mocks/README.md`, then bring `docs/design-system/`
  in line. If the mocks already cover the journey, change nothing here.

## Phase 3: Requirements (`engineering-requirements`)

- If a mock changed in Phase 2, or a criterion of `L2-002`, `L2-003`, `L2-007`, `L2-034` is silent on a behaviour this journey
  must decide, update `docs/specs/L2.md` (and `docs/specs/L1.md` if needed). Cross-reference
  existing requirements rather than copying them. Otherwise change nothing here.

## Phase 4: ADRs and detailed design (`writing-software-design-documents`)

- Resolve the items marked TO SUPPLY in `docs/detailed-designs/tour/travel-round-ring/README.md` (for example how long World Map stays before the next duel).
- For each decision that departs from best practice or fills a gap, add an ADR in `docs/adr/`
  (create the folder and an index if they do not exist yet), and bring the detailed design in
  line with it. Replace each resolved TO SUPPLY marker in the design with the decision.

## Phase 5: Incremental implementation (`angular-developer`, `implementing-incrementally`, test-first)

- Plan thin vertical slices, for example:
  1. A traveller who wins hops to the next desk and duels its holder; Duel shows the stamp (duel hop) and World Map shows the hop.
  2. A desk holder who wins becomes the traveller and the beaten traveller sits (sit, desk-holder).
  3. World Map at every width: zoomed to the player on a phone, the whole room on a tablet and wider (default, short, long).
  4. Map toasts, and World Map's loading and error states.
- For each slice:
  - Write the Given-When-Then criteria.
  - Write the acceptance test, following the repo's test approach and locations (frontend:
    Playwright through page objects and the shared fixture; backend: through the API).
  - Run it and show that it fails for the expected reason.
  - Implement the minimum that makes it pass, and refactor while the tests are green.
  - Run the regression checks (`node tools/verify/verify.mjs`), then commit.
- When all slices are green, keep the requirements, mocks and detailed designs aligned with what
  was built.

## Phase 6: Progress and lessons learned

- Set journey 05's **% complete** in `docs/journeys.md` to its true value (100 when every item
  of "Done means" holds), and in `docs/detailed-journeys.md` too if that file exists.
- Add this journey's entry to `docs/lessons-learned.md` (create it if it does not exist): what
  slowed it, new lessons, and how each earlier lesson it applied worked.
- If `docs/estimates/` exists, refresh it with the `estimating-designs` skill.

## Done means

- Duels move the players round the ring as the rules say, and World Map shows every player's place at every width.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green.
- The requirements, mocks, design system, ADRs and detailed designs agree with the code.
- `docs/journeys.md` and `docs/lessons-learned.md` are updated as Phase 6 says.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`.
  Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.

### Deferred (out of scope here)

- The hop's motion and sound (journey 10)
- The 3D room from above (journey 09)
- The end of the tour (journey 06)
