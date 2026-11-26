# Around the World

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-frontend-DD0031.svg)
![.NET](https://img.shields.io/badge/.NET-backend-512BD4.svg)

Around the World is the classroom flash-card game as a web game for children aged 10 to 12.
The classroom is a ring of desks and each desk is a country. A flash card appears, and **whoever
answers first wins**: the winner hops to the next desk. Hop all the way round the room and you
win. Play alone against the computer's classmates, or with friends in real time.

It is a responsive web application: an Angular frontend with a 3D classroom drawn in Three.js,
and a .NET backend that runs a game with friends over SignalR, scaled out through Azure SignalR
Service.

## Contents

- [The game](#the-game)
- [What Around the World leaves out](#what-around-the-world-leaves-out)
- [Design](#design)
- [Project status](#project-status)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Build and test](#build-and-test)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## The game

- **The duel.** The traveller stands beside a desk and duels the desk holder over one flash
  card, such as `6 × 4`. The first correct answer wins.
- **The hop.** If the traveller wins, they hop to the next desk and duel its holder. If the desk
  holder wins, they become the traveller, and the beaten traveller sits down at that desk.
- **The tour.** The first player all the way round wins. If time runs out, whoever travelled
  furthest wins. A tour is 6, 12 or 24 desks.
- **Shout it.** The child shouts the answer into the device. The number pad is there when the
  microphone is not.
- **Think first.** A wrong answer freezes the player for one second.

### The cast

| Kid | Colour | Who they are |
|---|---|---|
| **Zuri** | Yellow | Bold, first to shout the answer; holds a pencil like a sword |
| **Kenji** | Blue | The planner; collects a pin for every country |
| **Nia** | Red | The sprinter, always mid-jump |
| **Milo** | Green | Shy and quietly brilliant, with his robot Bolt |
| **Pip** | Purple | The dreamer, who flies a paper plane to each new desk |

In a solo game, the kids you do not pick are among your classmates, played by the computer.
Each classmate is an agent with its own skill, characteristics and preferred kinds of maths; in
Chrome they are driven by Gemini Nano, the browser's on-device model, and play from their
profiles alone where it is missing.

### The screens

1. **Home.** The classroom behind one big Play button.
2. **Pick Your Kid.** The five kids, and a generated nickname you can reroll.
3. **Solo Or Friends.** One choice.
4. **Room.** Make a room or join one with a 4-letter code. It says when a code is not found,
   the room is full (8 at most) or the game has already started.
5. **Lobby.** The code in huge type and the desks filling as friends join. The host starts.
6. **Game Setup.** The kinds of maths, the times tables, the tour length and the card speed
   (Chill, Normal or Lightning). The defaults start a game with no changes.
7. **Mic Check.** Shout "Ready!". If the microphone is refused, the number pad takes over.
8. **Duel.** The flash card, as big as the screen allows, with the timer bar and the world
   ring. In a game with friends, a player who is not in the duel watches it and can send a
   sticker.
9. **World Map.** The classroom from above, with every kid at their desk and the winner
   hopping to the next one.
10. **Podium.** The top three, and a passport stamped with every country you reached.

## What Around the World leaves out

Accounts, sign-in and real names: a nickname and a kid are kept on the device. Free-text chat:
six stickers are the only thing one player can send another. Adverts and purchases. Fractions
and word problems.

## Design

The design is the **Around The World** prototype in Magic Patterns (the *Around the World Math
Game* OS), with a *Character Sheet* for the 3D cast and the *Around The World Game Plan*
document beside it.

- **Every form factor, from XS to XL.** Duel fills the screen and never scrolls.
- **Phone:** the number pad sits under the flash card, and World Map zooms to your own kid.
- **Tablet, laptop and desktop:** the number pad sits beside the card so more of the classroom
  shows, and World Map shows the whole room.
- **Look:** light sky blue, white panels and navy text, with each kid's own bright colour;
  Fredoka for numbers and buttons.

Before a screen is built, its states are transcribed from the prototype into `docs/mocks/`, the
source of truth for the code.

## Project status

Around the World is designed, and its walking skeleton is built. The repository holds the agent
instructions ([`AGENTS.md`](AGENTS.md)), the skills that drive the work (`.claude/skills/`,
`.agents/skills/`), the requirements ([`docs/specs/`](docs/specs/)), the mocks
([`docs/mocks/`](docs/mocks/)), the design system ([`docs/design-system/`](docs/design-system/)),
the detailed designs ([`docs/detailed-designs/`](docs/detailed-designs/)), the journeys
([`docs/journeys.md`](docs/journeys.md)) and the architecture decisions
([`docs/adr/`](docs/adr/)). Journey 01 scaffolded the Angular workspace, the .NET solution, the
test harness and CI. What comes next is the game, one journey at a time, each with its failing
acceptance test first.

## How it works

```
Child ──voice or number pad──▶ domain/voice ──▶ domain/tour ──▶ game (screens) ──▶ world (3D classroom)
                                                     │
                                          api clients (HTTP and SignalR)
                                                     │
                                                     ▼
                                          backend (.NET): rooms, lobby, a game with friends
```

| Project | Responsibility |
|---|---|
| `frontend/projects/api` (`@atw/api`) | Contracts, types, injection tokens, and the HTTP and SignalR clients for the backend |
| `frontend/projects/domain` (`@atw/domain`) | The game and its rules: `questions/`, `tour/`, `voice/`, `storage/` |
| `frontend/projects/components` (`@atw/components`) | Presentation components, named as in the design system |
| `frontend/projects/world` (`@atw/world`) | The 3D classroom's renderer (Three.js), imported dynamically |
| `frontend/projects/game` | The app: pages, dialogs and the composition root |
| `backend/src/AroundTheWorld.*` | `Domain` ← `Application` ← `Infrastructure` ← `Api` |

This is the planned structure; each project is added by the first change that needs it.
Dependencies run one way, and ESLint enforces it. Every route is lazy-loaded. A solo game is
played on the device; in a game with friends the server decides who answered first. The full
rules are in [`AGENTS.md`](AGENTS.md).

## Prerequisites

- [Node.js](https://nodejs.org) 22.22 or later (or 24.15 or later), with npm, for the frontend
- The [.NET SDK](https://dotnet.microsoft.com/download) 10, for the backend
- Chromium for Playwright 1.63 (`cd frontend && npx playwright install chromium`, once)
- A current Chrome or Edge. Voice answers need a browser with speech recognition and a
  microphone; without them the number pad is used

## Getting started

```shell
git clone https://github.com/QuinntyneBrown/around-the-world.git
cd around-the-world
cd frontend && npm ci && npm start                      # the game on http://localhost:4200
cd backend && dotnet run --project src/AroundTheWorld.Api  # the backend on http://localhost:5189
```

The backend answers `GET /health/live`. A solo game needs no backend. A deployed backend applies
its room store's migrations with `dotnet run --project src/AroundTheWorld.Api -- migrate` before
it starts; the settings it needs are in [`docs/operations/settings.md`](docs/operations/settings.md).

## Build and test

| Task | Command | Scope |
|---|---|---|
| Format and lint | `cd frontend && npm run format:check && npm run lint` | Prettier, angular-eslint and its dependency boundaries |
| Unit tests | `cd frontend && npm test` | The unit tests of every frontend project (Vitest), on a fake clock |
| Build | `cd frontend && npm run build` | The production build of `game`, within the `angular.json` bundle budgets |
| Behaviour specs | `cd frontend && npm run build && npm run e2e` | Playwright on Chromium against the production build, with page objects and the shared fixture, with no request off localhost |
| End-to-end type check | `cd frontend && npm run e2e:typecheck` | The specs, fixtures and page objects |
| Backend | `cd backend && dotnet format --verify-no-changes && dotnet test` | Format, build and acceptance tests through the API on EF Core InMemory |
| Everything | `node tools/verify/verify.mjs` | All of the above, one after the other; run it before you push |

No automated test uses a real backend or database, or a network beyond localhost. CI
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs format, lint, the production
build, the backend's acceptance tests and the behaviour specs in under 5 minutes. Unit tests run
only locally.

## Repository structure

```
around-the-world/
├── AGENTS.md                        The purpose, the design, the architecture rules and the workflow
├── CLAUDE.md                        Points to AGENTS.md
├── frontend/                        The Angular workspace (npm commands run here)
│   ├── projects/
│   │   ├── game/                      The application: the shell, the routes and the foundations
│   │   ├── components/                @atw/components: one component per design-system page
│   │   ├── domain/                    @atw/domain: questions, tour, classmates, voice, storage
│   │   └── api/                       @atw/api: contracts, tokens and the backend's clients
│   ├── e2e/                           Behaviour specs, the shared fixture and page objects
│   ├── eslint.config.mjs              angular-eslint and the dependency boundaries
│   └── playwright.config.ts           Chromium only, traces off
├── backend/                         The .NET solution (dotnet commands run here)
│   ├── src/                           AroundTheWorld.Domain, Application, Infrastructure, Api
│   └── tests/                         AroundTheWorld.Api.Tests: acceptance tests through the API
├── docs/
│   ├── journeys.md                  The journeys, by value added, with % complete
│   ├── prompts/                     One implementation prompt per journey
│   ├── lessons-learned.md           What each journey taught
│   ├── specs/                       Requirements: L1 (high level), L2 (acceptance criteria)
│   ├── detailed-designs/            One design per feature, grouped by subsystem
│   ├── mocks/                       HTML mocks, the source of truth for the UI
│   ├── design-system/               Tokens and components extracted from the mocks
│   ├── adr/                         Architecture decision records
│   └── operations/                  The settings a deployed system needs
├── tools/verify/verify.mjs          Every CI check and the unit tests, locally
├── .claude/skills/, .agents/skills/ The skills, for Claude Code and other coding agents
├── .github/                         The CI workflow, issue and pull request templates
└── README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md, LICENSE
```

## Documentation

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | Around the World's purpose and scope, its design, the architecture rules and the required workflow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed and made |
| Skills (`.claude/skills/`, `.agents/skills/`) | Requirements, mocks, the design system, detailed designs, estimates, feature prompts, Angular and incremental implementation |
| [docs/journeys.md](docs/journeys.md) | The journeys in build order, with their prompts and % complete |
| [docs/adr/](docs/adr/README.md) | The architecture decision records |
| [docs/lessons-learned.md](docs/lessons-learned.md) | What each journey taught |
| [docs/operations/settings.md](docs/operations/settings.md) | The settings a deployed backend needs |
| [frontend/projects/components/README.md](frontend/projects/components/README.md) | How each design-system component is built once and reused |

Requirements, mocks, the design system, the detailed designs, the journeys and the architecture
decisions are written into `docs/` as the work reaches them, and are listed here when they are.

## Contributing

Contributions are welcome. Before you open a pull request, read
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`AGENTS.md`](AGENTS.md) for the
architecture rules. In summary:

- If it does not serve playing a duel and going round the room, it does not belong in Around the World.
- Every change to product code needs a requirement, a detailed design and a mock before any code
  is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code consistent with each other.
- Lazy loading and memory come first: a change that grows the initial bundle or leaks memory is
  not done.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code.

## Security

Do not report security vulnerabilities through public GitHub issues. See [`SECURITY.md`](SECURITY.md)
for how to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
