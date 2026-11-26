# 0034. Playing with friends on the device: the room group's screens, the game the device shows, Game Setup's Save, Mic Check, Back and the Podium

- **Status:** Accepted; where a player not in the duel watches it is amended by ADR 0035
- **Date:** 2026-11-26

## Context

ADR 0033 has the server decide a game with friends and send it as `GameChanged`. The device
must show it on the same Duel, World Map and Podium a solo game uses, which read `GAME_SESSION`
and do not know which kind of game is played (ADR 0023). Journey 13 left "Change" and "Start the
race" undrawn in the Lobby (ADR 0032); `docs/detailed-designs/player/set-up-game/` leaves Game
Setup's states in a room to build, and `L2-030` criterion 8 gave Mic Check a Back to the Lobby,
which a race that has started cannot honour.

## Decision

**The room group holds the game.** The room group's route (ADR 0032) gains Game Setup (`/setup`),
Mic Check (`/mic`), Duel (`/duel`), World Map (`/map`) and the Podium (`/podium`), the paths the
solo group uses, and the group's guard matches them only while the visit holds a room, so the
solo group answers them otherwise. `FriendsGame` is the group's `GAME_SESSION` as well as its
`ROOM_SESSION`; `GameScreenNavigator` opens the screen it is at, and the Lobby (`/room/{code}`)
when "Play again" returns the room to it. The group binds the voice, the way of answering and the
sounds as the solo group does.

**The game the device shows.** `FriendsGame` decides nothing. It keeps the last `GameState` it
received, and a pure helper, `FriendsView`, turns it into the `DuelState`, `TourState` and
`TourResult` the screens read, naming the device's own player "You", another player by their
nickname and a classmate "Classmate" (`L2-033` criterion 6). Durations left (the card's time, a
freeze) are counted down on the game's clock from the moment the state arrived, ticked every
100 ms as in a solo game (ADR 0020), so a spec holds and moves them with the fixture's `clock`.
The screens follow the duel as a solo game's do (ADR 0022): the winner's "You got it!" for 1 s,
then the passport stamp for 1.2 s after a hop, then World Map with the move; the loser's quiet
pill opens World Map, which also opens by itself 2.2 s after the decision (`L2-033`
criterion 12); a player not in the duel watches it on World Map, which shows each move as it is
decided (amended by ADR 0035: they watch it on Duel, and World Map shows each move). A new card opens Duel for the two players in its duel. When the tour is over, World Map
shows the last move for its message's time (1.6 s) and the Podium opens. "Back to the card" on
World Map returns to Duel only while the device's player is in an open duel; the server's game
cannot be played on at once as a solo game's classmates are. Watching a duel on Duel and its
stickers are journey 15's (`L2-028`).

**Answers.** `answer(value)` sends `SubmitAnswer` with the number only, never while the card is
decided or the player is frozen as last told; whatever the device shows, the server decides
(`L2-026` criterion 4). The number pad's entry and the voice work as in a solo game.

**"Change", "Save" and "Start the race".** The host's Lobby offers "Change" in its panel "The
game", which opens Game Setup titled "Set up the race", starting from the room's setup; "Save"
in place of "Go!" sends `SaveSetup` with the setup's values only. While it is sent, "Save" is busy
("Saving…") and every choice is disabled; when it is refused or cannot be sent, an alert says
"That setup didn't save" with "Try again", which sends it again, and the page stays; when it is
saved, the Lobby opens and shows it, as every other Lobby does (`L2-018` criteria 2, 5, 6 and 7).
Back returns to the Lobby without saving. "Start the race" is enabled for the host once a friend
is in; it sends `StartGame`, and is busy ("Starting…") until the game arrives (mock
`lobby/starting`). The Lobby offers no start that the server would refuse, so a refusal or a
failure only makes the button usable again. Game Setup's `loading` state ("Getting
your setup…") shows when the room has not yet arrived over its connection.

**Mic Check and Back.** On the first `GameChanged` each device opens Mic Check when its player
needs it (`L2-012` criterion 9, ADR 0025) and otherwise Duel; "Let's go!" or the number pad opens
the screen the game is at by then. Mic Check has no Back in a game with friends: the race has
started, and Leave on Duel is the way out (`L2-030` criterion 8). The browser's Back on Duel or
World Map during a game with friends opens "Leave the game?" as Leave does, as it opens Pause in
a solo game (ADR 0027); once the tour is over it is not held.

**Leaving.** "Leave" in "Leave the game?" sends `LeaveRoom`, busy meanwhile ("Leaving…"),
closes the connection, drops the room from the visit and opens Home (`L2-033` criterion 4). A
room that cannot be told forgets the player when it is idle (ADR 0031).

**The Podium.** In a game with friends the steps show the players only, by nickname, and "You";
a classmate has no step (as in a solo game, ADR 0024). "Play again" sends `PlayAgain`, and
"Everyone goes back to room {code}." is shown under the buttons (`L2-035` criterion 3). When the
room's connection is lost for good while the Podium is shown, a warning alert says "We lost the
room" and "Your passport is safe here. To play with your friends again, make or join a new room.",
and "Play with friends", which opens Solo Or Friends, takes the place of "Play again" (`L2-035`
criterion 6). "Home" leaves the room.

**The initial budget.** The room group's guard, which now matches the game screens too, adds
0.15 kB to `main` (252.31 kB to 252.46 kB; 273.13 kB to 273.28 kB in all), measured against the
base commit. `FriendsGame`, `FriendsView` and the screens' changes stay in the room group's lazy
chunks. The initial warning stays at 274 kB and the error at 285 kB.

## Consequences

The game screens of a solo game serve a game with friends unchanged but for the Leave button and
the Podium's words. A device that holds the last state it received shows a game the server put
right in the next message. Browser Back during a race asks before leaving.
