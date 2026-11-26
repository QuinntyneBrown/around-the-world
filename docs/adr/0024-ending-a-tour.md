# 0024. Ending a tour: the time limit, the places, the first stamp, the headline and Play again

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/tour/end-tour/` leaves `<TO SUPPLY>` the length of the time limit for
each tour length and whether a clock for it shows during a duel, the headline when the time limit
ends a tour and another player travelled furthest, whether "Play again" keeps the class, whether
a place can be shared, whether a classmate who is not one of the five kids has a place on the
Podium, which countries a passport counts, what World Map draws for the hop that ends the tour,
and who may choose "Play again" in a room. `L2-006` criterion 2 and `L2-035` criterion 1 marked
the time limit and its headline **to confirm**.

The passport rule of ADR 0022 (a stamp only for a desk reached by a hop) gives a child who goes
all the way round 11 stamps of 12: desk 1, the desk the tour starts from, is passed on the last
hop but never reached by one. The mocks and the design system count it: `podium/default` reads
"12 of 12 countries" with France stamped, `podium/time-up` reads "8 desks out of 12" beside
"8 of 12 countries", and the Passport page's "Few" state says "1 stamp: the desk you started from
still counts". The mocks are the source of truth.

The World Map standings name the five kids only and number them among themselves (`L2-034`
criteria 10 and 11); a solo tour of 12 desks has seven further classmates.

Journey 06 ends a solo tour. A game with friends, its Podium (`friends`, `two-players`) and its
error state ("We lost the room") are journey 14's.

## Decision

- **The time limit** is 3 minutes for a tour of 6 desks, 6 minutes for 12 and 12 minutes for 24,
  a little over the time Game Setup gives each tour ("about 2", "about 5", "about 10" minutes,
  `L2-017` criterion 2). It is counted on the game's clock (ADR 0020), so Pause (journey 08)
  holds it and a spec moves it with `clock.pass(ms)`. No clock for it shows during a duel: the
  mocks draw none, and a clock would take the child's eyes off the flash card. `Tour` is asked
  after every decided duel, the child's or two classmates', and a duel in progress is never cut
  short; a card nobody answers does not decide a duel (`L2-005` criterion 2).
- **The places.** `Standings` places every player from 1st to last whichever way the tour ends:
  further first; of two at the same distance the one who reached it first; players level since
  the start keep the order of their desks. No place is shared. The Podium places the five kids as
  the World Map standings do: a classmate who is not one of the five kids has no step, and the
  places on the steps and in the passport count the five kids only, so the child reads the same
  place on World Map and on the Podium (`L2-035` criterion 7).
- **The first stamp.** The first traveller's passport holds the stamp of desk 1 from the start of
  the tour, as their distance travelled of 1 counts it (`L2-007` criterion 7). Every other stamp
  is a desk reached by a hop, and a desk holder's own desk is still no stamp (`L2-003`
  criterion 4). This supersedes ADR 0022's "a player's own desk is not a stamp" for the first
  traveller only; the stamp on Duel after a hop is unchanged. A child who has not sat down so
  has France and every desk from Japan to the one they stand beside: Egypt, where the first duel
  is, is reached only by the hop past the last desk. The mocks `podium/second`, `unplaced`,
  `time-up`, `friends` and `error`, and the Passport page, were redrawn so (they stamped the
  first n countries).
- **The headline.** "You went around the world!", or "{name} made it round first!"; on the time
  limit "Time's up! You travelled furthest!" or "Time's up! {name} travelled furthest!", with
  "{n} desks out of {tour length}. {cheer}" under it, n being the winner's distance travelled.
  The cheers are the cast's, from `docs/mocks/README.md`: "Zuri raises her pencil like a
  knight.", "Kenji adds a pin and pushes up his glasses.", "Nia does a star jump.", "Bolt does a
  happy spin." and "Pip launches the paper plane.". A classmate who is not one of the five kids
  is "A classmate" (`L2-034` criterion 14) and has no cheer.
- **The last move.** World Map shows the duel that ends the tour as every other, with its
  message, for 1.6 seconds (`L2-034` criterion 9); the Podium then opens in place of Duel.
  "Back to the card" opens it at once.
- **Play again** in a solo game starts a new tour with the same kid and setup in the same solo
  group, so with the same class (`ClassFactory` gives the same class for the same kid and tour
  length), and Duel opens with the first flash card. The tour, its timers and its result are
  dropped first, so nothing of the ended tour stays.
- **The Podium's states in a solo game.** `default`, `second`, `unplaced`, `time-up` and `long`
  follow the result. `loading` ("Counting the desks…") stands until the session publishes the
  result, which a solo game does before the Podium opens, so it is proved by a unit test of the
  page. `error`, `friends` and `two-players` are a room's and come with journey 14, which also
  decides who in a room may choose "Play again".

## Consequences

A solo tour always ends, at the latest a duel after its time limit, and the Podium always has
five places to show. The child's place, passport count and distance agree with what World Map
showed. A game with friends will apply the same `Tour` rules on the server (journey 14).
