# 0033. Deciding a game with friends on the server: the order of answers, the clock, the class, the shared rules and the room's life

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 14 lets the host set up and start a game, and has the server decide every duel of it
(`L2-018`, `L2-025`, `L2-026`, `L2-027`). `docs/detailed-designs/rooms/decide-game-on-server/`
leaves `<TO SUPPLY>` how the answers of one room are taken one at a time, whether the server and
the device share one rule set, who may choose "Play again", whether the first flash card waits
for Mic Check, how a classmate answers in a game with friends, who the first traveller is, how a
tour of 6 desks seats 7 or 8 players, whether a lost duel waits for the child, which instance runs
the room's timers, and what the tour does with a player who chooses "Leave".
`docs/detailed-designs/player/set-up-game/` leaves `<TO SUPPLY>` which setup a new room starts
from and whether the host's "Save" changes the setup kept on the host's device.

The rules of the game already live in `domain`'s `tour/` on the device for a solo game
(ADRs 0020, 0022 and 0024). The backend needs its own: a solo game never reaches it, and a game
with friends must never be decided by a client.

## Decision

**One table of cases, two implementations.** The rules are written twice, in TypeScript
(`Duel`, `Tour` in `frontend/projects/domain/src/lib/tour/`) and in C#
(`AroundTheWorld.Domain.Tours.Duel`, `Tour`), and kept equal by one table of cases,
`docs/specs/tour-cases.json`. Each case names the requirement it proves and holds either the
answers of one duel (who, what, when) and the outcome, or the winners of a run of duels and the
ring after them (the traveller, the desk, each desk's holder, each distance, the stamps and how
the tour ended). A Vitest spec of `domain` and an xUnit theory of the backend's unit tests each
play every case, so a rule changed on one side alone fails the other's run. Sharing one
implementation (WebAssembly, or generated code) would cost the frontend's bundle or a build step
for a few dozen lines a side; the table costs neither.

**The order of answers.** `RoomHub.SubmitAnswer(int answer)` carries a number and nothing else.
`SubmitAnswerCommandHandler` reads the arrival time from `TimeProvider` as it begins, brings the
room's game up to that time (a classmate's answer or the card's time that fell due first counts
first), applies the answer and saves with the room's concurrency token (`Version`, ADR 0032). An
answer whose save meets a change saved first is applied again, with its arrival time, to the room
as it now stands, at most 5 times; a second correct answer then finds the duel won and is ignored.
Answers that reach the server together are therefore taken in the order the room store saves
them, which on one instance is their order of arrival to within one round trip to the store, and
across instances is still one order every player sees (`L2-026` criteria 1 and 7). No client
time is read.

**The game's clock on the server.** `RoomTimers`, a hosted service, ticks every 250 ms on
`TimeProvider` and sends `AdvanceGamesCommand(now)`. Its handler loads each playing room whose
`GameDueAt` has come and calls `Room.AdvanceGame(now)`, which runs every event due by then in
time order, each at its own time: the first card, a classmate's answer, the card's time running
out, and the next card after a decision. Every instance runs it; the concurrency token lets only
one instance's save of a room stand, and the other forgets its work. A tick is never needed for
correctness at an answer, since the answer brings the game up to its own arrival time first.
The freeze uses no timer: `Duel` compares the arrival time with the end of the freeze
(`L2-026` criterion 4).

**The timings.** The first flash card is dealt 3 seconds after "Start the race", for everyone;
it does not wait for a player at Mic Check **(to confirm)**, who joins the race on leaving it. A
card's time is the card speed's (`L2-005`). A card nobody answers shows its answer and is
followed by a new card for the same two players 2 seconds later (`L2-026` criterion 6). After a
decision the ring changes at once, and the next card is dealt 3.8 seconds later, the time a
device takes over "You got it!" (1 s), the passport stamp (1.2 s) and World Map's message
(1.6 s) (ADR 0022). A lost duel does not wait for the child's pill: the server never waits for
one player (`L2-033` criterion 12). The time limit of a tour is the solo game's (ADR 0024),
counted from the start.

**The class.** The host is the first traveller; desk 1 is theirs and is the empty desk. The
other players hold desks 2, 3 and on, in the order they joined, so the first duel is between two
friends, and classmates hold the rest (`L2-007` criteria 4, 5 and 8). A tour of 6 desks with 7 or
8 players is played round 12 desks, so that every player has a desk **(to confirm)**; the
Lobby still shows the setup the host chose. In a game with friends a classmate is a plain
classmate, not one of the five kids, and plays from a pace the server keeps: always right,
after 50%, 65% or 80% of the card's time by its desk (desks 1, 2 and 3 of each three) and never
sooner than 800 ms (ADR 0019's floor). A duel between two classmates is won by the sooner
answer, the traveller's on a tie. The device's on-device model plays no part in a game with
friends (`L2-027` criterion 5): what it decides would be a client's claim.

**Leaving a game.** "Leave" in "Leave the game?" sends `LeaveRoom`. In a playing room the player
leaves the room and a classmate takes their place on the ring: their desk, or the traveller's
place, and their side of the duel, answering at a classmate's pace from the moment it takes over
(`L2-033` criterion 13). The race carries on for everyone else, even when one player is left.
Removing a player whose connection is lost, the empty desk it leaves and the tour that ends when
fewer than two remain are journey 16's (`L2-029`).

**The end of a tour and the room's life.** A decided duel that ends the tour sets the room's
status to `Over` and carries the result in the same `GameChanged`; the room is kept while the
Podium is shown. Any player may choose "Play again" on the Podium; the first `PlayAgain` returns
the room to `Waiting` with the same players, host and setup, and every device opens its Lobby on
the `RoomChanged` that follows (`L2-035` criterion 3). A child may join a room that has returned
to its Lobby. "Home" on the Podium leaves the room; the last player to leave deletes it, with
nothing left of it (`L2-027` criterion 3). A room idle for 10 minutes is still deleted (ADR 0031);
a game in which nobody answers is not activity.

**The setup.** A new room starts from the default setup (ADR 0031). `SaveSetup` from the host
replaces the room's setup while it waits; `SaveSetupCommandValidator` refuses a kind outside the
four, no kind, a table outside 2 to 12 or repeated, Times on with no table, a tour length other
than 6, 12 or 24 or a card speed outside the three with `invalid_setup`; `Room.SaveSetup` refuses
a player who is not the host with `not_host` and a room that is not waiting with `game_started`
(`L2-018` criterion 4, `L2-025` criterion 4). The host's "Save" does not change the setup kept on
the host's device: that one is the solo game's.

**What travels.** The server sends one event for the game, `GameChanged(GameState)`, to the
room's group in the step that saves each change: the setup's tour length and card speed, the
players and classmates (ids, kids, nicknames' indexes), each desk's holder, the traveller and
their desk, the standings, each player's stamps, the current duel (its card without the answer
while it is open, the time left, each side's freeze left and wrong answer, the outcome, the
winner, and the answer once decided), the last move and the ending. It replaces the design's
seven events: a device that misses one message is put right by the next, and a device that
connects (`ReconnectCommand`) is sent the game as it stands. It carries no time of the server's,
only durations left, so no device needs the server's clock. It holds the current duel only,
never a list of those played, and one entry for each desk and player, so it is bounded by the
tour (`L2-048` criterion 5). `RoomChanged` still carries the room, with the status `over` added.
A refusal is a hub error holding only its `code` (ADR 0032): `invalid_setup`, `invalid_answer`,
`not_host`, `not_enough_players`, `game_started`, `not_playing`.

**The store.** The room's game is one JSON column (`Game`) of the room, written and read by
EF Core with a value converter in Infrastructure, and `GameDueAt` is a column with an index, so
`RoomTimers` finds the rooms that need it without reading the others (migration `AddRoomGame`).
The game holds ids, kids, numbers and times, and nothing about a child (`L2-046`).

## Consequences

Every duel of a game with friends is decided by the server from the answers it receives, and
every device shows the same game within one push. A change to a rule is made on both sides and
in the table of cases. A tick of 250 ms adds one indexed query of the room store every quarter
second for each instance; a card's time can be seen to run out up to 250 ms late, but never
counts an answer that arrived after it. A child still at Mic Check may miss the first card; the
3 seconds and the 12-desk tour for 7 or 8 players stay to confirm.
