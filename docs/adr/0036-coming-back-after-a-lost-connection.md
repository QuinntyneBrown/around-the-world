# 0036. Coming back after a lost connection: the 30 seconds, the retries, the removed player's desk, the banners and the overlay

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 16 lets a player of a game with friends who loses their connection take back their spot,
or tells them why they cannot (`L2-029`, `L2-043` criterion 4, `L2-007` criterion 6).
`docs/detailed-designs/rooms/return-after-lost-connection/` leaves `<TO SUPPLY>` what counts as a
slow connection, when "You're back!" leaves, how long "Everyone else has left." shows before the
Podium, what the tour does when the removed player is the traveller or the desk holder of the
current duel, whether the other players are shown that a player is away, whether a player who
chooses "Leave" is treated as removed, and whether the 30 seconds apply in the Lobby. ADR 0032
left a waiting player whose connection is lost in the room until the room is idle, and retried a
lost connection at once, after 1 and 3 seconds; ADR 0033 left the removal of a player to this
journey. Nothing yet decides how long the device keeps trying, how the server knows which
connection was lost, or where the device shows "Reconnecting…" when it is not on Duel.

The connection token is held in memory only (ADR 0031): a page that is reloaded has no token and
cannot come back. Coming back across a reload would need the token on the device, which `L2-015`
criterion 4 forbids, so it is not offered.

## Decision

**The spot is held for 30 seconds, on the server's clock.** `RoomPlayer` gains `ConnectionId`,
the id of the SignalR connection that last presented the player's token, and `AwaySince`
(migration `AddPlayerAway`, with an index on `AwaySince`). `RoomHub.OnConnectedAsync` sends
`ReconnectCommand`, which now calls `Room.Return(player, connectionId)`: it binds the new
connection and clears `AwaySince`, so the player has the same desk, role and distance, and is
sent the room and the game as they stand. `RoomHub.OnDisconnectedAsync` sends
`MarkPlayerAwayCommand`, which records `AwaySince` only when the lost connection is the player's
current one: a connection that the device replaced before the server noticed the old one was
gone marks nobody away. It is not a room player's request, so a connection whose player has left
or been removed ends in silence. Each tick of `RoomTimers` (every 250 ms, ADR 0033) sends
`RemoveAbsentPlayersCommand(now)` after the games are brought up to now; its handler finds, by the
indexed column, the rooms with a player away for 30 seconds or more and removes each such player.
Returning and being marked away renew the room's `Version`, so a return and a removal that race
are taken one at a time (ADR 0032). A game does not wait for a player who is away: their duel
carries on and the other player can still win it by answering (`L2-029` criterion 3).

**The 30 seconds apply in every status.** In the Lobby and on the Podium a removed player leaves
the room as "Leave the room" does (ADR 0032): the host mark passes on, every other device is sent
the room, and the last player's removal deletes the room with nothing left of it (`L2-027`
criterion 3, `L2-046` criterion 2). This replaces ADR 0032's "the backend does not remove a
waiting player whose connection is lost".

**A removed player in a game.** `Room.Remove` removes the player from the room, and
`RoomGame.Remove` marks their place in the game `Removed` and empties their desk, which stays
empty for the rest of the tour and no classmate takes (`L2-007` criterion 6). When they held the
desk the traveller stands beside, the traveller moves on to the next held desk, as a hop passes an
empty desk, but without a hop: no distance and no stamp is earned. When they were the traveller,
the desk holder they stood beside travels on as if they had won (a distance of 1 if it was 0, as
`L2-003` gives), and nobody sits down at that desk, which stays empty as the removed player's.
An open duel that held the removed player shows "Time's up!" with its answer, and the next card
is dealt 2 seconds later to the new pair (`L2-005` criterion 2). The distance a removed player
travelled still counts in the standings: they record how far each player got (`L2-006`).

**When fewer than two players remain** after a removal, the tour ends with the ending
`everyoneLeft` (`L2-029` criterion 5): an open duel shows "Time's up!", the room's status is
`over`, and whoever travelled furthest wins, as on the time limit (`L2-006` criterion 2). The
Podium's headline is "{Name} travelled furthest!" with "{n} desks out of {tour length}." before
the cheer (mock `podium/everyone-left`). A player who chooses "Leave" during a game is not removed:
a classmate takes their place, the race carries on even with one player left, and no banner is
shown (ADR 0033).

**The other players are not told a player is away** during the 30 seconds: one lost connection
does not freeze or slow the room (`docs/design-system/components/status-overlay.html`, Do and
don't). They are told when the player is removed.

**The device keeps trying for 30 seconds.** `SignalRRoomConnection` reconnects by itself with the
same token, the one it holds in memory: at once, after 1 second, then every 2 seconds, and stops
30 seconds after the loss, measured on the device's clock, then reports `lost`. This replaces
ADR 0032's "at once, then after 1 and 3 seconds". `RoomEvents` gains `reconnecting` and
`reconnected`, and `RoomLink` the state `reconnecting`. A return is confirmed by the first room
state received after reconnecting; a token the server refuses (`not_in_room`, `L2-043`
criterion 4) closes the connection for good, and the device reports `lost` at once. While a game
is held, `FriendsGame` also gives up on its own clock, ticked every 100 ms (ADR 0034), the moment
30 seconds have passed since the loss, so "We lost the game" shows at 30 seconds exactly; it
closes the connection, which clears SignalR's retry timer and the attempt in flight (`L2-048`
criterion 2). In the Lobby, the device keeps showing the room it last received while it tries,
and says "We lost the room" when it stops.

**Where the device shows it.** While a game that is not over is held and the connection is
`reconnecting` or `lost`, `FriendsGame` opens Duel, wherever its player was (World Map, or Duel
already), since Duel is where "Reconnecting…" and "We lost the game" are drawn; Mic Check and the
Podium keep their own states (ADR 0034). `GameSession` gains `connection` (`live`,
`reconnecting`, `gone`) and `notice` (the banner, or null); a solo game is always `live` with no
notice. The overlay is `StatusOverlay` in `@atw/components`, a `role="alert"` card over the dimmed
screen, whose action, when it has one, takes the focus; while it shows, the rest of Duel is
`inert`, the number pad and the voice answer send nothing and nothing listens. "Reconnecting…"
names the country of the player's own desk, or the desk they travel beside. "We lost the game"
offers "Home", which opens Home and leaves the room group.

**The banners.** One banner at a time shows across the top of Duel, below nothing and over
nothing (`docs/design-system/patterns/notifications.html`), as `ConnectionBanner` in
`@atw/components`, which composes `Alert` as a `banner`. When two are true the more urgent one
shows: "Everyone else has left." (danger, an alert), then "{nickname} dropped out." (info), then
"You're back!" (success), then "Your internet is wobbly." (warning).

- "You're back!" shows for 4 seconds of the game's clock after a return.
- "{nickname} dropped out." shows for 4 seconds after the `GameChanged` that first marks a player
  `removed`; the nickname is that player's, from the game.
- "Everyone else has left." shows for 3 seconds on Duel, then the Podium opens.
- "Your internet is wobbly." shows while an answer or a sticker sent to the room has had no reply
  for 2 seconds or more, on the game's clock, and goes when every one sent has its reply. A
  device that sends nothing cannot tell its connection is slow, and does not guess.

The times are counted on the game's clock that already ticks, so no timer is made for a banner
and a spec moves them with the fixture's `clock` (lesson 15, 4).

**What travels.** `GameChanged` gains `removed` on each player and the ending `everyoneLeft`. The
snapshot a returning device is sent is the `RoomChanged` and `GameChanged` pair every connection
is sent on connecting (ADR 0033); no type `GameSnapshot` is added, and the device replaces its
room and its game whole with them.

**Tests.** The backend's acceptance tests advance `FakeTimeProvider` past 30 seconds and await the
removal sweep through a pipeline behaviour that records the time it swept at (lesson 12, 4);
none sleeps. A connection is lost in a test by stopping a real SignalR client. The fixture's
`roomHub` gains `loses()`, which drops every connection as a network does (SignalR is told
nothing, so it reconnects) and holds each new connection's handshake, and `returns()`, which
answers them; `refuses()` before `returns()` refuses the token, as the server does.

## Consequences

A player whose connection drops for less than 30 seconds keeps their desk, role and distance, and
the game is put right by the next message. A player away longer loses their desk for good, and the
others play on round an empty desk. A child in the Lobby whose tab closes leaves the room 30
seconds later rather than when it is idle. A reloaded page cannot come back, since the token is
never kept on the device. Each tick of the room's timers adds one indexed query of the room store.
