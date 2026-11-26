# 0017. Game Setup's rules, how the setup is kept, and the states a solo game reaches

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/player/set-up-game/` leaves `<TO SUPPLY>` whether the times tables
that were on return when Times is turned on again, and the words shown when the last times
table cannot be turned off. The mocks draw loading and error states for Solo Or Friends and
Game Setup, but in a solo game the setup is read synchronously from the device (ADR 0011):

- Solo Or Friends' error state ("We couldn't make your room") is the failure of "Make a
  room" (`L2-022`, journey 12), and its submitting, rate-limited and offline states are the
  room's too.
- Game Setup's error state ("That setup didn't save") and its submitting state are the
  host's "Save" (`L2-018` criteria 6 and 7, journey 14), and its loading state ("Getting your
  setup…") is a room's setup arriving.

## Decision

- **Times off.** Turning Times off leaves the chosen tables in the setup. While Times is off
  they are shown not pressed and `disabled` and are not used; turning Times on again brings
  them back (`L2-016` criterion 6). `GameSetupRules.tablesInPlay(setup)` gives the tables
  flash cards may use: none while Times is off.
- **The last one on.** Every rule of the screen is in `GameSetupRules` (`@atw/domain`,
  `tour/`), and a toggle returns the setup and whether it was refused. The last kind of maths
  reads "Keep at least one kind of maths on. Turn another on first." under the kinds, and the
  last times table "Keep at least one times table on. Turn another on first." under the
  tables (`L2-016` criterion 3, mock `game-setup/last-table`). The line goes at the next
  choice that changes the setup.
- **Kept on the device.** The setup joins the player's record as the field `setup` of version
  1: `{ "kinds": ["times"], "tables": [2, …, 10], "tourLength": 12, "cardSpeed": "normal" }`.
  It is written only once the child changes it; a record without it, or with a setup Game
  Setup would not offer, reads as the defaults (`L2-015` criteria 2 and 3).
- **Solo Or Friends' loading state** follows the four classmates' portraits in the card "Just
  me", as Pick Your Kid's follows its pictures (ADR 0013): skeletons and "Getting ready…" until
  they arrive. A portrait that cannot load shows the drawn kid, and the screen works as usual.
- **Not built in journey 03:** Solo Or Friends' error, submitting, rate-limited and offline
  states (journey 12), and Game Setup's loading, submitting and error states (journey 14).
  Until journey 12 opens the room screens, "Make a room" and "Join a room" are shown
  `disabled`, so no choice leads to a screen that does not exist.
- **Duel's loading state** in journey 03 is the duel's frame: the classroom's picture, the
  duel's HUD in skeletons and the flash card reading "Get ready…" with the status "Getting the
  first card ready…". The world ring, the desk pill and Pause come with the tour they show
  (journeys 04, 05 and 08).

## Consequences

`L2-016` gains criterion 6 and the words of criterion 3 for the last times table, and the
mocks gain `game-setup/last-table`. The states left to journeys 12 and 14 are built with the
room whose failures they show.
