# 0038. Opening fast and staying smooth: the profiles, the picture first, the way on, CDK Dialog, the measurements and the budgets

- **Status:** Accepted (supersedes the `initial` budget of ADR 0032 and the `anyComponentStyle`
  budget of ADR 0014)
- **Date:** 2026-11-26

## Context

Journey 18 checks every screen built so far against `L2-031`, `L2-047`, `L2-048` and `L2-049`
and resolves what `docs/detailed-designs/platform/load-lazily-and-release/` left to supply: the
device and network that stand for "a mid-range phone on a 4G connection", the capacities of the
buffers, and how `api` and `domain` keep the SignalR client and the classmates' code apart.
Earlier records left it two questions: whether CDK Dialog's 14.7 kB in `main` should give way to
the native `<dialog>` (ADR 0026), and how far the budgets, raised five times (ADRs 0008, 0014,
0021, 0026, 0031, 0032), can come down.

Measured on the base commit with Chrome's network emulation and the processor four times
slower, Home's Largest Contentful Paint on a phone on slow 4G was 4.1 seconds, not 2.5. Three
causes, in order of weight:

1. The specs' server sent every file uncompressed: `main` was 252 kB on the wire, not 69 kB.
   A deployed host compresses text, so the measurement was pessimistic, but the deployment
   documented nowhere that it must.
2. Home's largest content is its still picture of the classroom (97 kB). Home asked for it only
   once its own code had arrived and run, about 1.7 seconds in.
3. The 3D classroom's code (Three.js, 133 kB compressed) was imported as soon as Home was
   drawn, and shared the connection with the picture, halving its speed.

A heap check of the classroom on Home failed at first too (17.6% after 20 times), as did the
cast on Duel and World Map (69.7%). Heap snapshots showed every lost canvas, and with it each
page it had been on, held by the specs' own WebGL fake, which kept every context it counted.
The game itself held nothing. What still grew was compiled code: V8 compiles and optimises
the game's functions over the first runs, which settles by itself.

## Decision

**Profiles.** A "typical school connection" is Chrome's network emulation at 10 Mbit/s down,
5 Mbit/s up and 40 ms of delay (`docs/detailed-designs/player/find-way-through-screens/`). A
"mid-range phone on a 4G connection" is Lighthouse's mobile profile: a slow 4G of 1.6 Mbit/s
down, 0.75 Mbit/s up and 150 ms of delay, the processor four times slower, at 412 by 915 CSS
pixels with touch. Both are applied through the DevTools protocol by the fixture's `network.like`
and `processor.slowedBy`.

**Compression is part of the deployment.** The host that serves `game` sends text (scripts,
styles, HTML, JSON, SVG) compressed with gzip or Brotli, recorded in
`docs/operations/settings.md`. The specs' server sends it gzip-compressed so that a slowed
connection measures what a child downloads.

**The picture first.** When the game opens at Home's address, `main.ts` asks for Home's still
picture with a `<link rel="preload" fetchpriority="high">` as the game starts, so it arrives
beside Home's code (0.4 kB in `main`). At any other address it asks for nothing. Home draws its
canvas, and so imports the `world` chunk, only once the picture has come or failed. Measured:
Home's Largest Contentful Paint is about 2.0 seconds on the phone profile, and its "Play"
responds in 24 to 40 ms.

**The way on.** Once its picture is in, Home fetches the code of Pick Your Kid and Solo Or
Friends without opening them (`warmTheWayOn`); Solo Or Friends already fetches the solo game's
(ADR 0031). Choosing Play and the kid offered then downloads no code. On the school connection
the first flash card shows about 1.4 seconds after opening, with the five choices.

**CDK Dialog stays.** Without the three dialogs `main` would be 14.55 kB smaller (3.9 kB
transferred), about 40 ms of the 2.0 seconds on the phone profile. The native `<dialog>`
would also need its focus handling, its stacking and the injector each dialog gets written by
hand, and `AGENTS.md` names CDK Dialog. The cost does not put any target at risk, so no
correction to `AGENTS.md` is proposed. The remaining framework code in `main` is placed there
by the build, which splits by module: with no lazy route at all `main` would be 204 kB, and
Home alone brings it to 244 kB.

**Entry points.** `api` and `domain` have no secondary entry points. Each library's public API
exports a loader whose `import()` of a module inside the library makes the split:
`SignalRRoomConnection` imports `@microsoft/signalr` with `import()` when it first connects,
and is bound only by the friends route group; `loadClassmateAgent` and `LazyClassmateModel`
import `classmates/`'s agent and the model's session the same way.

**What a tour holds.** No duel is kept once it is decided: `SoloGame` holds only the duel in
play and its timers, cancelled when it is decided, and `FriendsGame` holds only the last game
state the server sent. The stickers received are kept by `StickerBuffer`: three at most, each
for 2 seconds of the game's clock (ADR 0035). The positions are one entry per player, and each
passport one stamp per desk. The design's `BoundedBuffer<T>` is therefore not built: nothing
grows with the duels played.

**Measurements.** The heap checks, and the frame rate of Duel at the 20th duel of a 24-desk
tour against the first (`L2-049` criterion 4), are Playwright specs in `frontend/e2e/measure/`
with their own configuration, run only when a person asks (`npm run build && npm run
e2e:measure`), one worker. The heap is read from a heap snapshot after garbage collection, with
compiled code left out. The behaviour specs time the first flash card, Home's Largest
Contentful Paint and the responses to Play and to a digit (Event Timing); the last two show
the classroom's still picture, since the machine that runs the specs draws WebGL in software at
about 10 frames a second, which no child's device does. The WebGL and audio fakes keep only
what the game has not released.

**No service worker.** No requirement asks for the game to open offline: `L2-022` criterion 6
and `L2-054` criterion 3 ask only that "Play solo" works once Solo Or Friends is open, which the
fetched solo game already gives. A service worker is not built.

**Budgets.**

| Budget | Warning | Error |
|---|---|---|
| `initial` | 275 kB | 276 kB |
| `bundle` `home` (Home's chunk) | 10 kB | 11 kB |
| `anyComponentStyle` | 3.5 kB | 4 kB |

The initial total is 274.13 kB (72.31 kB transferred): the warning moves up 1 kB for the
picture's request in `main`, and the error comes down from 285 kB to within 2 kB of the bundle.
Home's chunk is 9.51 kB, and the largest component stylesheet 2.98 kB (FlashCard).

## Consequences

Any growth of the first screen now fails the build within 2 kB, and needs a record that says
why. The deployment must compress; a host that does not will miss `L2-047` criterion 4 on a
phone. A child who opens a room's link downloads nothing more than before. Home downloads about
22 kB of code that a child who leaves without playing never uses. The heap and frame-rate
checks are not run by CI, so a leak is found when a person asks for them; the WebGL fake no
longer hides one by holding every context itself.
