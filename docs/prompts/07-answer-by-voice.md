# Feature: Shout answers after the Mic Check

Journey 07 of `docs/journeys.md`. Mic Check, spoken answers, and switching between voice and number pad.

## Goal

Before the first duel of a visit, Mic Check asks for the microphone and asks the child to
shout "Ready!". From then on the child shouts the answer to each flash card. The number pad
takes over whenever the browser has no speech recognition, the microphone is refused, or the
child chooses it in the settings dialog, and the child can switch back. Microphone audio is
never recorded, stored or sent; only the number heard is used.

This journey builds on journeys 01 to 06 in `docs/journeys.md`. Before you start, check
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
- Nothing outside `domain`'s `voice/` touches the microphone or speech recognition. Every feature still runs end to end with the number pad.
- Playwright uses the fixture's fake speech recognizer and fake microphone permission; an unexpected microphone call fails the spec.
- Release every recognition session and microphone stream when its owner is destroyed. Speech helpers are imported dynamically.
- The settings dialog is a CDK Dialog, never a hand-rolled modal.

## Phase 1: Read before you write

- `AGENTS.md`, then `docs/lessons-learned.md` (if it exists): apply the lessons that fit.
- The requirements: `L2-009`, `L2-011`, `L2-012`, `L2-040` in `docs/specs/L2.md`, and the L1s they detail in `docs/specs/L1.md`.
- The detailed designs:
  - `docs/detailed-designs/answering/check-mic/README.md`
  - `docs/detailed-designs/answering/answer-by-voice/README.md`
  - `docs/detailed-designs/platform/keep-children-safe/README.md`
- The mocks (`docs/mocks/manifest.json` lists every state):
  - `docs/mocks/pages/mic-check/` (default, loading, listening, not-heard, heard, denied, error)
  - `docs/mocks/pages/duel/` (default, wrong, no-speech, voice-failed)
  - `docs/mocks/dialogs/settings/` (default, no-speech; muted belongs to journey 10)
- The design system: `docs/design-system/README.md` and the component pages the mocks use.
- Every ADR in `docs/adr/` that covers the areas this journey touches.

## Phase 2: Mocks, then design system (`writing-html-mocks`, `extracting-design-systems`)

- If a state this journey needs is missing or wrong in `docs/mocks/`, add or fix it there first,
  update `docs/mocks/manifest.json` and `docs/mocks/README.md`, then bring `docs/design-system/`
  in line. If the mocks already cover the journey, change nothing here.

## Phase 3: Requirements (`engineering-requirements`)

- If a mock changed in Phase 2, or a criterion of `L2-009`, `L2-011`, `L2-012`, `L2-040` is silent on a behaviour this journey
  must decide, update `docs/specs/L2.md` (and `docs/specs/L1.md` if needed). Cross-reference
  existing requirements rather than copying them. Otherwise change nothing here.

## Phase 4: ADRs and detailed design (`writing-software-design-documents`)

- Resolve the items marked TO SUPPLY in `docs/detailed-designs/answering/check-mic/README.md` and `docs/detailed-designs/answering/answer-by-voice/README.md` (for example how spoken number words are read, and the language of recognition).
- For each decision that departs from best practice or fills a gap, add an ADR in `docs/adr/`
  (create the folder and an index if they do not exist yet), and bring the detailed design in
  line with it. Replace each resolved TO SUPPLY marker in the design with the decision.

## Phase 5: Incremental implementation (`angular-developer`, `implementing-incrementally`, test-first)

- Plan thin vertical slices, for example:
  1. Mic Check asks for the microphone and hears "Ready!" (default, listening, heard).
  2. Mic Check when nothing is heard, when the microphone is refused and on error (not-heard, denied, error, loading).
  3. A shouted number answers the flash card on Duel (default, wrong).
  4. No speech recognition or a recognition failure hands over to the number pad (no-speech, voice-failed).
  5. The settings dialog switches between voice and the number pad (settings default, no-speech).
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

- Set journey 07's **% complete** in `docs/journeys.md` to its true value (100 when every item
  of "Done means" holds), and in `docs/detailed-journeys.md` too if that file exists.
- Add this journey's entry to `docs/lessons-learned.md` (create it if it does not exist): what
  slowed it, new lessons, and how each earlier lesson it applied worked.
- If `docs/estimates/` exists, refresh it with the `estimating-designs` skill.

## Done means

- A child checks the microphone, shouts answers in duels, and falls back to or chooses the number pad whenever voice is not available or not wanted.
- All the new and existing tests pass: `node tools/verify/verify.mjs` is green.
- The requirements, mocks, design system, ADRs and detailed designs agree with the code.
- `docs/journeys.md` and `docs/lessons-learned.md` are updated as Phase 6 says.
- The work is on a branch with a PR to `main` that fills in `.github/PULL_REQUEST_TEMPLATE.md`.
  Fetch and rebase onto `main` first, because another session may have pushed to it.
- Only then end the run, with a short summary of what was built, the decisions made along the way, and
  anything deferred.

### Deferred (out of scope here)

- Muting sound (journey 10)
