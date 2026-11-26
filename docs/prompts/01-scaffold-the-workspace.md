# Feature: Scaffold the workspace

Journey 01 of `docs/journeys.md`. Angular and .NET workspaces, test fixtures, verify script and CI pipeline.

## Goal

The repository holds instructions, skills and docs, and no code. This journey lays down the walking
skeleton every later journey builds on, so that the first screen journey only adds behaviour:

- `frontend/`: an Angular workspace with the baseline projects `api`, `domain` (with the empty
  folders `questions/`, `tour/`, `classmates/`, `voice/`, `storage/`), `components` and the
  application `game`. Current Angular: standalone, signals, `OnPush`, zoneless. `atw-*`
  selectors and `@atw/<library>` path aliases. Prettier and angular-eslint, with the
  dependency direction from `AGENTS.md` enforced as ESLint boundaries. Tight `angular.json`
  budgets on `game`'s production build. The global styles hold only foundations: the tokens
  from `docs/design-system/tokens/tokens.css`, the self-hosted fonts from
  `docs/design-system/assets/fonts/` (Fredoka and Nunito) as `@font-face`, a reset and utilities.
  The `world` library is not added here; it joins when the classroom is first drawn (journey 09).
- `frontend/` end-to-end tests: Playwright, Chromium only, trace off by default, a shared
  fixture that every spec imports `test`/`expect` from, and a page-object folder. The fixture
  installs a fake speech recognizer that says what the spec tells it to, a fake microphone
  permission and a fake on-device model that answers as the spec tells it to. It answers API
  and hub requests from fixtures, and fails the spec on an unexpected microphone call, an
  unanswered request, a request off localhost or a page error.
- `backend/`: a .NET solution with `AroundTheWorld.Domain`, `AroundTheWorld.Application`
  (MediatR, validators, `IAppDbContext`), `AroundTheWorld.Infrastructure` (EF Core) and
  `AroundTheWorld.Api`, in that dependency direction, and test projects whose acceptance tests
  run through the API on the in-memory test server with EF Core InMemory (one store per
  fixture), `FakeTimeProvider` and a real SignalR client. A CLI command applies migrations; the
  API never does on startup.
- `tools/verify/verify.mjs`: runs every CI check and the unit tests locally.
- `.github/workflows/`: one CI pipeline that runs lint, format, the production builds with
  budgets, the backend acceptance tests and the Playwright behaviour specs, and finishes in
  under 5 minutes.

The only behaviour is the skeleton's: opening `/` shows the `game` app shell with the page title
"Around the World" on the light sky blue background, and the backend reports that it is live as
`docs/detailed-designs/platform/operate-backend/README.md` describes. No screen of
`docs/mocks/` is built here.

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
- The scaffold is build and tooling work, but it still ships the skeleton's two behaviours test-first: write the Playwright spec for the app shell and the backend acceptance test for liveness first, and see each fail for the expected reason.
- Never write architecture tests. ESLint enforces the dependency direction; no test checks structure, layout or naming.
- Fonts and tokens come from `docs/design-system/`. Copy them into `frontend/`; never load anything from a CDN.
- Update `README.md`'s Prerequisites, Getting started, Build and test and Repository structure sections so they match what now exists.

## Phase 1: Read before you write

- `AGENTS.md`, then `docs/lessons-learned.md` (if it exists): apply the lessons that fit.
- The requirements: `L2-047`, `L2-052`, `L2-053`, `L2-054` in `docs/specs/L2.md`, and the L1s they detail in `docs/specs/L1.md`.
- The detailed designs:
  - `docs/detailed-designs/platform/load-lazily-and-release/README.md`
  - `docs/detailed-designs/platform/operate-backend/README.md`
  - `docs/detailed-designs/platform/keep-children-safe/README.md`
  - `docs/detailed-designs/platform/show-every-screen-to-everyone/README.md`
- The mocks (`docs/mocks/manifest.json` lists every state):
  - None. The scaffold builds no screen. Read `docs/mocks/README.md` and `docs/design-system/README.md` for the tokens, fonts and breakpoints the foundations must carry.
- The design system: `docs/design-system/README.md` and the component pages the mocks use.
- Every ADR in `docs/adr/` that covers the areas this journey touches.

## Phase 2: Mocks, then design system (`writing-html-mocks`, `extracting-design-systems`)

- If a state this journey needs is missing or wrong in `docs/mocks/`, add or fix it there first,
  update `docs/mocks/manifest.json` and `docs/mocks/README.md`, then bring `docs/design-system/`
  in line. If the mocks already cover the journey, change nothing here.

## Phase 3: Requirements (`engineering-requirements`)

- If a mock changed in Phase 2, or a criterion of `L2-047`, `L2-052`, `L2-053`, `L2-054` is silent on a behaviour this journey
  must decide, update `docs/specs/L2.md` (and `docs/specs/L1.md` if needed). Cross-reference
  existing requirements rather than copying them. Otherwise change nothing here.

## Phase 4: ADRs and detailed design (`writing-software-design-documents`)

- Add `docs/adr/` with an ADR for each decision the scaffold makes that no design records yet: the Angular and .NET versions, the package manager, the unit test runner for `frontend/` and `backend/`, the ESLint boundaries plugin, the shape of the Playwright fixture, and the CI layout. Keep each ADR short: context, decision, consequences.
- Resolve the items marked TO SUPPLY in `docs/detailed-designs/platform/load-lazily-and-release/README.md` and `docs/detailed-designs/platform/operate-backend/README.md` that the scaffold needs (the budget values, the health endpoint's path, the migrations command). Record each choice in an ADR and write it into the design in place of the marker.
- Create `docs/lessons-learned.md` with a one-paragraph introduction, ready for each journey's entry.
- For each decision that departs from best practice or fills a gap, add an ADR in `docs/adr/`
  (create the folder and an index if they do not exist yet), and bring the detailed design in
  line with it. Replace each resolved TO SUPPLY marker in the design with the decision.

## Phase 5: Incremental implementation (`angular-new-app` to create the workspace, `angular-developer` for Angular choices, `implementing-incrementally`, test-first)

- Plan thin vertical slices, for example:
  1. The `game` app boots at `/` and shows its shell with the page title; Playwright with the shared fixture proves it. Prettier, angular-eslint and the production budget pass.
  2. The `api`, `domain` and `components` libraries exist with their `@atw/*` aliases, and ESLint fails a wrong-way import (check this once by hand; do not keep a test for it).
  3. The fixture's fakes (speech recognizer, microphone permission, on-device model, request answering and the off-localhost guard) are in place and used by the shell spec.
  4. The backend solution builds, and an acceptance test through the API proves the liveness endpoint.
  5. `tools/verify/verify.mjs` runs everything locally, and the CI workflow runs the high-value checks in under 5 minutes.
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

- Set journey 01's **% complete** in `docs/journeys.md` to its true value (100 when every item
  of "Done means" holds), and in `docs/detailed-journeys.md` too if that file exists.
- Add this journey's entry to `docs/lessons-learned.md` (create it if it does not exist): what
  slowed it, new lessons, and how each earlier lesson it applied worked.
- If `docs/estimates/` exists, refresh it with the `estimating-designs` skill.

## Done means

- `npm` commands in `frontend/` and `dotnet` commands in `backend/` build, lint, format-check and test cleanly.
- Opening `/` shows the app shell, and the backend reports that it is live, each proven by its acceptance test.
- `node tools/verify/verify.mjs` passes, and the CI workflow is green in under 5 minutes.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green.
- The requirements, mocks, design system, ADRs and detailed designs agree with the code.
- `docs/journeys.md` and `docs/lessons-learned.md` are updated as Phase 6 says.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`.
  Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.

### Deferred (out of scope here)

- Every screen (journeys 02 onward)
- The `world` library and Three.js (journey 09)
- Azure SignalR Service and OpenTelemetry exporters (journey 17)
