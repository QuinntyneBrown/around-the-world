# 0027. Pausing, leaving and recovering: the held clock, Back during a game, Not Found and Something Went Wrong

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`L2-033` criterion 4 asks that Pause stop the clock of a solo game, and that a game with friends
offer Leave in its place. ADR 0020 put every time-driven rule of a solo game (the card's time,
the freeze, the classmate's answer) on `GameClock`, and ADR 0024 put the tour's time limit there
too; journey 06 left "Pause holding the time limit" to this journey.
`docs/detailed-designs/player/find-way-through-screens/` says that Duel, World Map and the
Podium have no Back, but the browser's own Back is always there: from Duel it opened Game Setup
over a game whose clock kept running, and "Go!" there then did nothing new.
`docs/detailed-designs/platform/operate-backend/` leaves what "Try again" on Something Went
Wrong opens `<TO SUPPLY>`, and no design says how a failure of the game itself is caught. The
leave-game dialog's `default` and `busy` states need a game with friends, which journey 14
builds.

## Decision

- **A held clock.** `GameClock.pause()` holds the game time where it is and `resume()` lets it
  run again from there: the wall time in between is never counted. While it is held, `tick()`
  runs nothing. Because every wait of a solo game is on that clock (the card's time, the timer
  bar, the freeze, the classmate's answer, the waits between screens and the tour's time
  limit), Pause holds all of them with no rule of its own, and "Keep playing" resumes the same
  flash card with the same time remaining.
- **The contract.** `GameSession` gains `kind` (`solo` or `friends`), `paused` (a signal),
  `pause()`, `resume()` and `leave()`, which returns a promise that settles once the game is
  left (at once in a solo game; once the room has been told in a game with friends). An answer
  given while paused is ignored. While paused, Duel shows no "Shout it!", so listening stops,
  and starts again on "Keep playing" (ADR 0025's directive follows the pill).
- **The dialogs.** `PauseDialog` and `LeaveGameDialog` are dialogs of `game`, opened with CDK
  Dialog from modules imported on the first press (as Settings is, ADR 0026), and both compose
  `Dialog` from `@atw/components`. `Dialog` gains `closeLabel` (the close button's name:
  "Keep playing", "Stay and play") and `closable` (false hides the close button and ignores a
  press on the backdrop, for the leave-game dialog's `busy` state, which also refuses Escape).
  Any close of the Pause dialog but "Go home" resumes the game. "Go home" calls `leave()` and
  opens Home, which destroys the solo group and the game with it. The Pause dialog has the id
  `pause`, so a second request while it is open opens nothing.
- **Back during a game.** The browser's Back on Duel or World Map, while a solo game is in
  progress, does what Pause does: a `canDeactivate` guard (`pauseOnBackGuard`) refuses a
  navigation the browser started (`popstate`) and opens the Pause dialog, whose "Your desk at
  {country}" names the desk of the duel the game is at. The router is configured with
  `canceledNavigationResolution: 'computed'`, so a refused Back leaves the browser's history as
  it was. A navigation the game or a button starts is never held. Once the tour is over (the
  Podium, or World Map's last message) Back is not held: it opens Game Setup, the screen before
  the game, where "Go!" starts a new game with the setup shown, dropping the ended one. The
  leave-game dialog takes Pause's place in a game with friends (journey 14).
- **A failure of the game itself.** `GameErrorHandler` replaces Angular's `ErrorHandler` in
  `app.config.ts`. It logs the failure to the browser's console, as Angular's own handler does,
  and opens Something Went Wrong at `/error` with `skipLocationChange`, so the address bar keeps
  the address where the game broke. It opens it once: a failure while the page opens, or on it,
  is only logged. The page says nothing of the failure (`L2-054` criterion 4).
- **"Try again".** It loads the game afresh at the address where it broke (a reload), which
  drops every state the failure may have spoiled: an address before Duel opens that screen
  again with the choices kept on the device, and a game screen's address opens Home, since the
  game was held in memory only (`L2-030` criterion 7). "Home" opens Home within the page.
- **Not Found.** The last route, `**`, loads `NotFoundPage`. Both notice pages compose `Notice`
  from `@atw/components` and have no top bar.
- **The specs' failure.** A spec breaks the game through the fixture's `random.breaks()`, which
  makes the page's `Math.random` throw from then on, as a broken browser would; the fixture
  expects the console error it causes. No hook for tests is added to the game.

## Consequences

- A child who presses the browser's Back mid-duel is not thrown out of the game; the dialog
  offers "Go home" for a child who meant to leave.
- The tour's time limit stops while paused, so a paused tour never ends on time behind the
  dialog.
- A game with friends cannot be paused: the room's clock is the server's (`L2-026`), and journey
  14 wires `leave()` to tell the room. Until then the leave-game dialog's states are proved by
  unit tests of the dialog and of Duel with a game of kind `friends`.
- "Try again" after a failure on a game screen ends the solo game; the game was held in memory,
  so nothing better could be restored.
- `GameErrorHandler` and the two routes are in `main`: the initial total went from 270.72 kB to
  271.38 kB, within ADR 0026's 272 kB warning. The dialogs, the guard's dialog and both notice
  pages are lazy chunks.
