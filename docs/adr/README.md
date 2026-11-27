# Architecture decision records

Each record states one decision: its context, the decision and its consequences. A record is
never edited to change its decision; a later record supersedes it. `AGENTS.md` requires a
record for every departure from best practice and for every choice that fills a gap the
requirements and designs leave.

| # | Decision | Status |
|---|---|---|
| [0001](0001-angular-workspace.md) | Angular 22 workspace of source libraries, zoneless, signals and `OnPush` | Accepted |
| [0002](0002-dotnet-backend.md) | .NET 10 backend with MediatR 12.5, FluentValidation and EF Core 10 | Accepted |
| [0003](0003-npm.md) | npm is the package manager | Accepted |
| [0004](0004-unit-test-runners.md) | Vitest for the frontend's unit tests, xUnit v3 for the backend's tests | Accepted |
| [0005](0005-eslint-boundaries.md) | `eslint-plugin-boundaries` enforces the dependency direction | Accepted |
| [0006](0006-playwright-fixture.md) | The shape of the shared Playwright fixture | Accepted |
| [0007](0007-ci-layout.md) | One CI workflow of two parallel jobs | Accepted |
| [0008](0008-bundle-budgets.md) | The production budgets of `game` | Accepted; `initial` superseded by 0014 |
| [0009](0009-health-and-migrations.md) | The live endpoint, the room store's engine and the migrations command | Accepted |
| [0010](0010-design-system-components.md) | Each design-system component is built once, in `@atw/components` | Accepted |
| [0011](0011-player-record-on-the-device.md) | The player's record is one versioned JSON entry in `localStorage` | Accepted |
| [0012](0012-interactive-components-on-native-elements.md) | A design-system component that is a link or a button sits on the native element | Accepted |
| [0013](0013-pictures-arriving-and-failing.md) | Home's and Pick Your Kid's loading and error states follow their pictures | Accepted |
| [0014](0014-initial-budget-with-the-first-routes.md) | The initial budget of `game` once its first routes are lazy | Accepted; `initial` warning superseded by 0021; `anyComponentStyle` superseded by 0038 |
| [0015](0015-critical-path-in-ci.md) | CI runs the behaviour specs tagged `@critical` | Accepted |
| [0016](0016-solo-game-route-group.md) | The solo game is a lazy route group that holds Game Setup and the game screens | Accepted |
| [0017](0017-game-setup-rules-and-states.md) | Game Setup's rules, how the setup is kept, and the states a solo game reaches | Accepted |
| [0018](0018-flash-card-ranges.md) | The numbers of a flash card, how its kind is picked and what counts as the same card | Accepted |
| [0019](0019-classmate-profiles.md) | The classmates' profiles, how the class is seated and how a classmate answers | Accepted |
| [0020](0020-solo-duel-clock-and-states.md) | The solo duel: its clock, its timings, the states journey 04 reaches and how specs drive it | Accepted |
| [0021](0021-initial-budget-with-the-duel.md) | The initial budget of `game` once Duel plays a duel | Accepted; `initial` superseded by 0026 |
| [0022](0022-moving-round-the-ring.md) | Moving round the ring: timings, stamps, words, ties and the classmates' duels | Accepted; the first traveller's first stamp superseded by 0024 |
| [0023](0023-game-screens-follow-the-session.md) | The game screens follow the session through a listener, and World Map's room is drawn with the page | Accepted |
| [0024](0024-ending-a-tour.md) | Ending a tour: the time limit, the places, the first stamp, the headline and Play again | Accepted |
| [0025](0025-answering-by-voice.md) | Answering by voice: what is heard, on the device, when Mic Check shows and what a failure does | Accepted |
| [0026](0026-initial-budget-with-cdk-dialog.md) | The initial budget of `game` once CDK Dialog opens Settings | Accepted; `initial` warning superseded by 0031 |
| [0027](0027-pausing-leaving-and-recovering.md) | Pausing, leaving and recovering: the held clock, Back during a game, Not Found and Something Went Wrong | Accepted |
| [0028](0028-drawing-the-classroom.md) | Drawing the classroom: the scenes' format and paths, the stand-in, the countries, one plan for the room, the hop's look and the detail's steps | Accepted |
| [0029](0029-motion-and-sound.md) | Motion and sound: the sounds' source, the first touch, where the mute is kept, the moments and the quick fade | Accepted |
| [0030](0030-classmates-with-the-on-device-model.md) | Classmates with the on-device model: readiness, the sessions, the prompts, the decision and its deadline | Accepted |
| [0031](0031-making-a-room.md) | Making a room: the code, the token, the rate limit, the room's life and Solo Or Friends' states | Accepted; `initial` warning and the redirect of a room's address superseded by 0032 |
| [0032](0032-joining-a-room-and-the-lobby.md) | Joining a room and the Lobby: the join, the room hub, the room's link, Room's states and the Lobby's messages | Accepted; a lost connection in the Lobby superseded by 0036; the skipped negotiation and where the hub reads the token superseded by 0037; `initial` budget superseded by 0038 |
| [0033](0033-deciding-a-game-on-the-server.md) | Deciding a game with friends on the server: the order of answers, the clock, the class, the shared rules and the room's life | Accepted |
| [0034](0034-playing-with-friends-on-the-device.md) | Playing with friends on the device: the room group's screens, the game the device shows, Game Setup's Save, Mic Check, Back and the Podium | Accepted; where a player not in the duel watches it amended by 0035 |
| [0035](0035-watching-a-duel-and-stickers.md) | Watching a duel and stickers: where a watching player is, the six ids, the picture, the bound and the rate | Accepted |
| [0036](0036-coming-back-after-a-lost-connection.md) | Coming back after a lost connection: the 30 seconds, the retries, the removed player's desk, the banners and the overlay | Accepted |
| [0037](0037-running-the-backend-deployed.md) | Running the backend deployed: Azure SignalR Service, the hosting platform, telemetry, health, the limits and the failures | Accepted |
| [0038](0038-opening-fast-and-staying-smooth.md) | Opening fast and staying smooth: the profiles, the picture first, the way on, CDK Dialog, the measurements and the budgets | Accepted |
| [0039](0039-every-screen-for-every-child.md) | Every screen for every child: the sweeps, axe-core, named breakpoints, Duel on a short phone and the fixes the sweeps found | Accepted |
| [0040](0040-keeping-children-safe.md) | Keeping children safe: the Content Security Policy, a nickname that cannot be built, and the audits | Accepted |
