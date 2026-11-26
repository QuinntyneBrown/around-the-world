# 0023. The game screens follow the session through a listener, and World Map's room is drawn with the page

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/player/find-way-through-screens/` gives each game group a
`GameScreenNavigator` that watches `GameSession.screen` with an effect and navigates to the
matching route. ADR 0021 measured that `effect()` brings 3.4 kB of framework code into `main`,
which is already within 1 kB of its warning budget, and asks for signals, `computed()` and
outputs instead. Journey 05 is the first to change the screen from within the game: after the
passport stamp, after World Map's message, and when Duel returns. World Map also has a loading
state ("Drawing the classroom…") and an error state ("The map is having a rest") that follow the
room as it arrives (`L2-031` criterion 4, `L2-036` criterion 3), and until journey 09 the room is
the drawn stand-in of the mocks.

## Decision

- **A listener, not an effect.** `GameSession` gains `watchScreen(listener)`, which calls the
  listener each time the game moves to another screen and returns a function that stops it.
  `GameScreenNavigator`, provided in the solo group and created with it by an environment
  initializer, listens from its constructor, navigates to `/duel` or `/map` with `replaceUrl`
  (so the browser's history does not grow with every duel), and stops listening when the group
  is destroyed. The `screen` signal stays for the guard and the pages.
- **World Map's room is drawn with the page, not deferred.** Drawing the room inside
  `@defer` put 6.6 kB of Angular's defer runtime into `main`, and loading it through
  `NgComponentOutlet` 3 kB; the room is part of World Map's own lazy chunk instead (21 kB). The
  loading state ("Drawing the classroom…", placeholders for the room and the standings) shows
  until the session publishes the tour, which a solo game does before World Map opens, so it is
  proved by a unit test of the page, as Duel's loading state is (ADR 0020). The drawn stand-in
  cannot fail to draw, so the error state ("The map is having a rest") comes with the 3D
  classroom in journey 09, when the classroom's renderer can fail (`L2-036` criterion 3).

## Consequences

The game screens change without framework code in `main`. A room group (journey 14) provides
the same navigator. Journey 09 replaces the drawn room with the 3D classroom, imported
dynamically, and World Map's loading and error states then follow the renderer.
