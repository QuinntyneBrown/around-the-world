## Purpose

> Around the World is the classroom flash-card game as a web game for children aged 10 to 12.
> The classroom is a ring of desks and each desk is a country. A flash card appears, and whoever
> answers first wins the duel: the winner hops to the next desk. Hop all the way round the room
> and you win. A child plays alone against the computer's classmates or with friends in real
> time, and is playing within 20 seconds of opening it.

It is the game played at school: a child goes from desk to desk, the teacher flashes a maths
problem, and whoever answers fastest moves on to the next desk. Here it is fun, colourful and
entertaining, with 3D characters and a 3D classroom animated in Blender.

**Direction.** One question decides everything: who answers first? Everything else stays out of
its way.

- **The rules.** The traveller stands beside a desk and duels the desk holder over one flash
  card. If the traveller wins, they hop to the next desk and duel its holder. If the desk holder
  wins, they become the traveller and the beaten traveller sits down at that desk. The first
  player all the way round wins; if time runs out, whoever travelled furthest wins. A wrong
  answer freezes the player for one second, so guessing never beats thinking.
- **The answer is shouted.** The child shouts the answer into the device. The number pad is the
  fallback, used when the browser has no speech recognition or the microphone is refused.
- **The cast.** Five children to pick from, each with one colour: Zuri (yellow), Kenji (blue),
  Nia (red), Milo (green, with his robot Bolt) and Pip (purple). On the World Map each is a
  small bean-bodied character. In a solo game the children nobody picked are among the
  classmates, played by the computer.
- **The classmates are a diverse class.** Each classmate is an agent with its own skill level,
  characteristics and preferred kinds of maths. In Chrome they are driven by Gemini Nano, the
  browser's on-device model, on the device; where it is missing the classmates play from their
  profiles alone and the game is the same.
- **Solo or friends.** A solo game needs nothing but the device's own player. A game with
  friends is a room of up to 8, joined with a 4-letter code read aloud across the room.
- **The game is set up once.** The kinds of maths (times tables from 2 to 12, and +, −, ÷), the
  tour length (6, 12 or 24 desks) and the card speed (Chill, Normal, Lightning). The defaults
  start a game with no changes.
- **Safe for children.** No accounts and no real names: a generated nickname ("Speedy Otter")
  and a picked kid, kept on the device. No free-text chat anywhere: a player watching a duel can
  send one of six stickers and nothing else.

The screens, in order: **Home**, **Pick Your Kid**, **Solo Or Friends**, **Room**, **Lobby**,
**Game Setup**, **Mic Check**, **Duel**, **World Map** and **Podium**.

Around the World has no accounts, sign-in, free-text chat, real names, adverts, purchases,
fractions or word problems. Before adding or changing anything, ask how it serves playing a duel
and going round the room; if it does not, do not build it, and if a request works against it,
say so.

The mission, Around the World's single L0 requirement, is not written yet. When it is, it goes
in `docs/specs/L0.md` and this section quotes it word for word; everything then points back to
it. Do not invent a mission in its place.

## Design

The design is the **Around The World** prototype in Magic Patterns (the *Around the World Math
Game* OS): the frames Home, Pick Your Kid, Solo Or Friends, Room, Lobby, Game Setup, Mic Check,
Duel, World Map and Podium. Beside it are the *Character Sheet* prototype (the frame *The
Cast*), which is the brief for the 3D characters built in Blender, and the document *Around The
World Game Plan*. The OS's own design threads hold the decisions behind it.

The mocks in `docs/mocks/` are the design and the source of truth: every screen in every state,
with `docs/mocks/manifest.json` listing them. They are transcribed from the prototype before any
screen is built, and `docs/mocks/README.md` says where they depart from it, and why.
`docs/specs/`, the ADRs, `docs/detailed-designs/` and the code follow the mocks. When a mock
changes, the requirement, the ADR it touches and the detailed design are brought in line with it
in that order, before any code.

- **Every form factor, from XS to XL.** Each screen is designed for a phone held upright, a
  tablet, a laptop and a large desktop.
- **Duel fills the screen and never scrolls**, at any size. On a phone the number pad sits under
  the flash card; on a tablet and wider it sits beside the card, so more of the classroom shows.
  The flash card is the largest thing on the screen.
- **World Map.** A phone zooms to the player's own character and fills the screen; a tablet and
  wider show the whole room.
- **Colour.** Light sky blue backgrounds, white panels and navy text, with each kid's own bright
  colour for their name tag, their place on the world ring and their timer bar. Never beige.
- **Type.** Fredoka for numbers and buttons.
- **The 3D classroom** is drawn with Three.js from scenes built in Blender. In the prototype it
  is a still image behind each screen's interface; the interface layer is what the prototype
  designs.
- **Motion and sound.** The hop is the reward and lasts about a second. Losing a desk is gentle:
  no red screen, no buzzer. Every sound can be muted, and reduced motion replaces hops and card
  flips with quick fades.

Before a screen is built or changed, its states are drawn in `docs/mocks/`. The prototype's
names and numbers (the nicknames, the desks' countries, the demo that starts two desks from the
finish) are the cast, not rules.

## Where things are

- **The frontend is the game.** `frontend/` is an Angular workspace and holds every screen, the
  3D classroom, the voice answer and its number pad, and a solo game, which is played on the
  device against classmates who are agents. It is built for current Chrome and uses its newest
  capabilities (the built-in Gemini Nano model, speech recognition) where they are present,
  never as something the game cannot start without.
- **The backend is the room.** `backend/` is a .NET service for what one browser cannot do
  alone: rooms and their codes, the lobby, and a game with friends in real time over SignalR,
  where the server decides who answered first. SignalR is its one real-time channel
  (WebSockets), scaled out in a deployed system through Azure SignalR Service. It holds no
  account and no personal data.
- Before building a feature, read its requirement (`docs/specs/`, `docs/journeys.md`), its
  detailed design (`docs/detailed-designs/`) and its mocks (`docs/mocks/`, the source of truth
  for the UI; `docs/design-system/` is extracted from them).
- Read the relevant ADRs in `docs/adr/` before changing the areas they cover.
- Where a rule below names something that does not exist yet (a project, a command, a fixture,
  a helper, a folder, a document), the first change that needs it adds it. The repository starts
  with these instructions and the skills, and nothing else.
- Run npm commands from `frontend/` and `dotnet` commands from `backend/`.
  `node tools/verify/verify.mjs` runs every CI check and the unit tests locally; run it before
  pushing.

Use the words the specs use in code, docs and UI; no synonyms. A player's character is their
"kid" and their made-up name their "nickname". The game is a "tour" of "desks", each a
"country". The player moving round is the "traveller" and the one seated the "desk holder";
their contest over one "flash card" is a "duel", and winning it earns a "hop". A group playing
together is a "room", joined with its "code"; the one who made it is the "host". The children
the computer plays are "classmates". What a watching player sends is a "sticker"; the record of
countries reached is the "passport" and each mark in it a "stamp".

## Prefer best practice

Choose the platform's established best practice (Angular, .NET, Playwright, WCAG) over the
expedient way. A departure needs an ADR giving its reason. If a rule here or in an ADR conflicts
with best practice, say so and propose the correction; do not work around it silently.

## Frontend

A multi-project workspace under `frontend/projects/`. The baseline is three libraries, `api`
(contracts, types, injection tokens, and the HTTP and SignalR clients for the backend), `domain`
(the game and its rules: `questions/`, `tour/`, `classmates/`, `voice/`, `storage/`) and `components`
(presentation), and one application, `game`. A `world` library (the 3D classroom's renderer,
Three.js, imported dynamically) joins them when the classroom is first drawn.

That baseline is where the organisation starts, not a limit on it. When a concern earns its own
library (a `browser` project for browser-only implementations, as `world` is for the classroom's
rendering, and so on), add it. A smaller, focused library that can be lazy-loaded on its own is
better than one that keeps growing. A further application needs its own ADR.

- **Dependency direction.** `game` → `components`, `api`, `domain`, `world`; `domain` → `api`;
  `components` → `api` for types only; `world` → `api`; `api` → nothing. No library imports an
  app. `game`'s `app.config.ts` is the composition root and binds every token, except those a
  lazy route brings, which that route binds so their code stays out of the initial bundle.
  ESLint enforces it. A new library takes its place in this direction, and the same change adds
  it to this rule and to the ESLint boundaries; it never depends on `game`, and `api` still
  depends on nothing.
- The rules of the game (who wins a duel, the hop, the freeze after a wrong answer, how a tour
  ends) live in `domain`'s `tour/` only, and making a flash card in `questions/`. Nothing
  outside `voice/` touches the microphone or speech recognition. Every feature runs end to end
  with a simulated voice and with the number pad.
- A classmate's profile and its agent live in `domain`'s `classmates/`, and nothing outside it
  touches the browser's on-device model. The model decides only a classmate's answer and when
  it comes, read as a number and a time: it never decides a rule, and nothing it writes is
  shown to a child. A flash card never waits for the model, the game never waits for the model
  to download, and every feature runs end to end with classmates who play from their profiles
  alone.
- Prettier and angular-eslint own formatting and lint; CI fails on either.
- Current Angular: standalone components, signals for state, `OnPush` everywhere, zoneless.
- **Responsive at every width.** Every screen works from the narrowest phone to the widest
  desktop, as the mocks draw it; no screen is built for one form factor and patched for the
  rest.
- **Lazy loading and memory management come first.** They outrank convenience and any other
  frontend rule they conflict with; see *Lazy loading and memory* below.
- Selectors are `atw-*`; class, file and folder names omit the prefix. Libraries are imported
  as `@atw/<library>`.
- **Presentation lives in `components`.** A presentation component takes inputs, emits outputs
  and injects no app service, token or router. Pages and dialogs that orchestrate stay in the
  app.
- **File per type.** A component is `name.ts` + `name.html` + `name.scss` with
  `templateUrl`/`styleUrl`, never inline `template`/`styles`. No inline `style` in templates.
- **One encapsulated BEM stylesheet per component.** Default encapsulation, never
  `ViewEncapsulation.None`. The component is the block, named as in the design system;
  `block__element`, `block--modifier`; a state assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `aria-pressed`, `disabled`) and is styled through it. Never
  style another component's block. Keep the mocks' BEM classes: e2e locators depend on them.
- Global styles are foundations only (tokens, `@font-face`, reset, utilities). Read tokens by
  role, never hex. Fonts are bundled and self-hosted, never loaded from a CDN.
- **Declare each `ng-content` slot once.** A component rendering `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` rendered with `ngTemplateOutlet` in both
  branches. A consumer `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if`
  per node.
- Logic with many cases (a store, a tracker, a pure helper) lives in a service or helper with
  its unit tests, never in a component.
- Each service has a contract and an injection token in `api`; components depend on the token.
- **No inline forms.** Button-triggered editing opens a CDK Dialog or navigates to a screen.
  Never hand-roll modals.
- A contract refuses with an error whose `code` a screen branches on; the player sees a generic
  message. Names and error strings from the backend or from storage are data, rendered as text,
  never as HTML.
- **Nothing a child types or says leaves the device as text or sound.** A room receives an
  answer as a number and a sticker as its id. Nicknames are generated, never typed. Microphone
  audio is never recorded, stored or sent to the backend.
- Every interaction works by touch on a phone and by keyboard on a desktop; touch targets are
  at least 44 × 44 px; colour is never the only carrier of a state.

## Backend

Clean architecture, strict dependency direction: `AroundTheWorld.Domain` (entities, zero deps) ←
`AroundTheWorld.Application` (MediatR handlers, validators, DTOs, `IAppDbContext`) ←
`AroundTheWorld.Infrastructure` (EF Core, migrations, auth) ← `AroundTheWorld.Api` (controllers, SignalR
hubs).

- Business rules live in handlers and domain services. A controller or hub method checks nothing
  itself and sends one MediatR request.
- The API does not apply migrations on startup; a CLI command does. Seed data is idempotent.
- Endpoints and hub methods accept only what a room's own player may do; anything open to
  anyone (making a room, joining with a code) is marked so explicitly and is rate limited.
- Errors are ProblemDetails with a `code` extension where a client branches on them.
- Telemetry is OpenTelemetry. No log, metric or span carries a contact detail, a token, message
  text, a query string or a body; a route is recorded as its template.
- **The server decides a game with friends.** Who answered first, the freeze, the hop and the
  end of the tour are decided by the server from the answers it receives, never by a client's
  claim. A solo game is decided on the device.
- A room is anonymous and short-lived: it holds a code, nicknames, kids and positions, and is
  gone when the game is over. The backend stores no account, no real name and no audio.
- A player sees and changes only the room they are in.
- A setting a deployed system needs is documented in the same change.

### Backend tests

- **No real database.** Every test runs on EF Core InMemory (one store per fixture); never
  SQLite, LocalDB, SQL Server or a file. Inject database faults through `IAppDbContext`.
- **Never sleep.** Await an event with a timeout that fails naming what did arrive, or advance
  `FakeTimeProvider`; no `Task.Delay`, no `Thread.Sleep`. Hub tests connect a real SignalR client
  to the in-memory test server.
- The acceptance test through the API proves each slice. A rule with a table of cases also gets a
  direct test of the domain type or handler, one case per row.

## E2E (Playwright)

- **No real microphone, on-device model, backend or database, and no network beyond
  localhost.** A fixture installs a fake speech recognizer that says what the spec tells it to,
  a fake microphone permission and a fake on-device model that answers as the spec tells it to; API and hub requests are answered by fixtures; the 3D classroom's assets are
  served from localhost. An unexpected microphone call, an unanswered request, a request off
  localhost or a page error fails the spec.
- Page Object Model: one page object per screen or dialog owns the selectors. Never put a
  selector in a test. Specs import `test`/`expect` from the shared fixture.
- Only behaviour specs run by default. Visual, responsive and accessibility sweeps are written
  and kept current but run only when a person asks; no agent runs them or updates baselines
  unprompted. Update baselines only for intentional design changes, after changing the mock.
- Chromium only; never configure or run another browser.
- In unit tests, time-driven rules (the freeze after a wrong answer, the timer bar, reconnecting) advance a fake clock; never sleep.

## CI (GitHub Actions)

- The pipeline is always green and finishes in under 5 minutes in total. A flaky or slow check is
  fixed or removed, never retried.
- It runs only the few highest-value tests per feature: lint, build and one critical acceptance
  path each. Unit tests run locally, never in CI.
- A setting a deployed system needs is documented in the same change.

## Lazy loading and memory (the top frontend priority)

A child plays Around the World on whatever is to hand: a school laptop, an old tablet, a
parent's phone. It has to open fast and stay as smooth on the last desk of a 24-desk tour as on
the first. A change that grows the initial bundle or leaks memory is not done, whatever else it
achieves.

- **Load only what is needed now.** Every route uses `loadComponent`/`loadChildren`; heavy or
  below-the-fold UI uses `@defer`; large libraries (Three.js, the classroom's renderer, speech recognition helpers, the classmates' agents) and
  whole feature libraries are imported dynamically, never from the initial chunk. Keep the
  initial bundle small and the `angular.json` budgets tight; raising a budget needs a reason in
  the change.
- **Release everything you acquire.** Whatever a component, service or scene creates, it tears
  down when its owner is destroyed: subscriptions (`takeUntilDestroyed`/`DestroyRef`), timers,
  intervals and `requestAnimationFrame` loops,
  event listeners, SignalR connections and their handlers, speech recognition sessions and
  microphone streams, on-device model sessions (`destroy()`), observers, `AbortController`s, object URLs, audio elements, and every
  Three.js geometry, material, texture, render target and renderer (`dispose()`).
- **Bound what grows.** Live data held during a game (the duels played, the stickers received, the positions
  of every player) uses a fixed-size or windowed buffer, or is paged and dropped
  from memory. Nothing accumulates without a limit for the length of a game.
- **Scope state to its use.** Provide services at the route or component that needs them, not
  in `root`, unless the whole app shares them. A screen's state goes when the player leaves it.
- **Prove it.** Leaving a screen returns its memory: a feature that allocates heavily
  (the classroom, the cast) is checked for a stable heap across repeated enter and leave, and
  like the visual and accessibility sweeps, these heap checks run only when a person asks.

## Low-power rendering

The frontend, the classroom's rendering (Three.js) and their
detail are scaled back to run smoothly on low-power devices, while still giving a beautiful,
toy-like picture. Choose the cheap form of a technique (baked, lower resolution, fewer samples,
LOD) before dropping it.

## Incremental implementation and ATDD (mandatory for product code)

Every change to user-impacting product code (the app, its libraries and the backend) needs a
requirement, a detailed design and a mock before implementation, and is built incrementally.
Mocks, designs, the design system, docs and test-only changes are exempt and get no tests.

Before writing product code, invoke and follow the `implementing-incrementally` skill, with ATDD:
plan small slices and finish one at a time. For each, write Given-When-Then criteria, write the
acceptance test (backend: through the API; frontend: Playwright with page objects), run it to
prove it fails for the expected reason, then implement only that slice, refactor green and run
the regression checks before the next. No bulk implementation, no tests added afterwards, no
weakening tests to pass. Keep requirement, design, mock, tests and code aligned throughout.

Never write architecture tests: no structure, layout, naming, banned-API or spec-traceability
tests. A test suite proves behaviour.

## Skills

The skills are in `.claude/skills/` and, as the same files, in `.agents/skills/`; a change to one
is made in both. They are used in this order as the product is built:
`engineering-requirements` (`docs/specs/`), `writing-html-mocks` (`docs/mocks/`, from the Magic
Patterns prototype), `extracting-design-systems` (`docs/design-system/`),
`writing-software-design-documents` (`docs/detailed-designs/`), `estimating-designs`,
`writing-feature-prompts`, then `angular-new-app`, `angular-developer` and
`implementing-incrementally` for the code. `grilling` stress-tests a plan and `creating-videos`
films a finished slice.

## Lessons learned and progress

Before a slice of `docs/detailed-journeys.md`, read `docs/lessons-learned.md` and apply the lessons
that fit. When the slice finishes, before it merges, add its entry there (what slowed it, new
lessons, and how each earlier lesson it applied worked) and update **% complete** in
`docs/detailed-journeys.md` and `docs/journeys.md`.
