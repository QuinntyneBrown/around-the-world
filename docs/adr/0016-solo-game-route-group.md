# 0016. The solo game is a lazy route group that holds Game Setup and the game screens

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/player/find-way-through-screens/` puts the game screens in two lazy
route groups, a solo group and a room group, each providing its own `GameSession` behind
`GAME_SESSION`. It says "Go!" on Game Setup enters the solo group, and it leaves `<TO SUPPLY>`
how the router chooses between the two groups for one path (`/setup`, `/mic`, `/duel`, `/map`,
`/podium`). Game Setup sat outside the solo group, so "Go!" could not reach the session the
group provides; handing the setup over in the router's navigation state would restart a game
on a reload, because the browser keeps that state in its history (`L2-030` criterion 7 asks
for Home instead).

Angular 22.2 made `withAutoCleanupInjectors()` public: the router destroys a route's
environment injector, and so every service it provided, once no active route uses it.

## Decision

- The solo group is one lazy parent route (`loadChildren`) at the path `''` holding the solo
  Game Setup (`/setup`) and the four game screens. It provides `SoloGame` behind
  `GAME_SESSION`. Journey 03 adds `/setup` and `/duel`; Mic Check, World Map and the Podium
  join it with their journeys.
- "Go!" calls `GameSession.start(setup)` on the group's session and navigates to `/duel`
  (to Mic Check when journey 07 builds it). Nothing is passed through the navigation state.
- `inGameGuard`, a functional `CanActivate` guard on each game screen, reads
  `GameSession.hasGame` from the group and redirects to Home when the child is in no game.
  A reload makes a new group with no game, so it opens Home.
- `provideRouter` takes `withAutoCleanupInjectors()`: leaving the group (Back to Solo Or
  Friends, or Home) destroys `SoloGame` and the game it held (`L2-035` criterion 4).
- Between the two groups the router chooses with `canMatch`: the room group (journeys 12 to
  14) matches when the visit holds a room, and the solo group matches otherwise. Until the
  room group exists, the solo group has no `canMatch`.

## Consequences

Back from Game Setup to Solo Or Friends drops the solo group; the setup itself is kept on the
device by `PlayerChoices` (ADR 0011), so Game Setup opens again as the child left it
(`L2-030` criterion 6). The room group reuses the same game screens behind its own
`GAME_SESSION`, and its `/setup` is the host's Game Setup.
