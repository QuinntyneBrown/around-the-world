# 0035. Watching a duel and stickers: where a watching player is, the six ids, the picture, the bound and the rate

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 15 lets a player of a game with friends who is not in the duel watch it on Duel and send
one of six stickers (`L2-028`). `docs/detailed-designs/rooms/watch-duel-and-send-sticker/` leaves
`<TO SUPPLY>` the ids of the six stickers, how many stickers show at once (and so the size of the
buffer that holds them), and which picture a received sticker shows when the sticker's kid and the
sender's kid differ. ADR 0034 had a player who is not in the duel watch it on World Map, as a solo
player who has sat down does (`L2-034` criterion 7); `L2-028` criterion 1 has them watch it on
Duel. `docs/detailed-designs/rooms/guard-room/` gives the limit of 1 sticker a second to
`HubRateLimitFilter`, which no journey had built.

## Decision

**Where a watching player is.** In a game with friends every device shows Duel while a card is
open or its time has run out, whether its player is in the duel or not; a player who is not in it
sees the watching state (`L2-028` criterion 1). When the duel is decided, a watching player's World
Map opens at once with the move, and Duel returns with the next card (`L2-030` criterion 4). Before
the first card a player who is not in the first duel waits on World Map, as before. This amends
ADR 0034's "a player not in the duel watches it on World Map"; a solo game is unchanged
(`L2-034` criterion 7). `FriendsView.duel` now publishes the duel with the role `watching`, and
Duel shows no number pad, opens no microphone and offers no switch for it.

**The six ids.** A sticker travels as a whole number from 1 to 6, in the order offered: 1 "Go!"
(Zuri), 2 "Wow!" (Nia), 3 "Nice one" (Kenji), 4 "So close" (Milo), 5 "Whoosh!" (Pip) and
6 "Beep boop!" (Bolt). The words and pictures live on the device only (`STICKERS` in `domain`'s
`cast/`); the server knows the ids and nothing else. Which the sixth sticker is stays **to
confirm** (`L2-028` criterion 6); changing it changes the words and the picture, not the id.

**The picture.** A received sticker shows the picture and the colours of the sender's kid, the
sticker's words, and the sender's name: "You" on the sender's own device, the nickname elsewhere
(`L2-028` criterion 3). So Bolt's "Beep boop!" sent by Nia shows Nia. In every mock the sender sends
their own kid's sticker, and the two pictures agree.

**The bound.** At most three stickers show at once, as the mock `sticker/stacked` draws; a fourth
makes the oldest leave (`L2-028` criterion 7). `FriendsGame` keeps them in a buffer of three, and
each leaves 2 seconds after it arrived, counted on the game's clock that already ticks every 100 ms
while a game is held (ADR 0034), so no timer is made for a sticker and a spec moves it with the
fixture's `clock` (`L2-048` criterion 5). A sticker is shown only on Duel; it is not kept for a
screen that opens later.

**Where stickers stand.** The mocks put the stickers 8.5 rem above the bottom of Duel. Under 992 px
the watching player's sticker bar wraps into two or three rows and the flash card, the largest
thing on the screen, leaves no room above the bar, so three stickers stacked there covered the
card (the behaviour spec measured it at 360, 390 and 768 px). On a watching player's Duel the
region (`sticker-region--watching`) therefore stands at the bottom of the screen, passing over the
bar, which still takes every press since the region takes no pointer input; from 992 px, where
the bar is one row, it stands above it as drawn. On a phone a sticker is compact (the name's type,
not a heading's). The mocks `duel/watching` and `sticker/stacked` and the design system carry the
modifier.

**The server.** `RoomHub.SendSticker(int sticker)` sends one `SendStickerCommand`, a room player's
request (the room is the one the connection's token names, `L2-043`). Its handler ends in silence,
with no error, when the id is not one of the six, the room has no game being played, or the
current duel holds the sender (`L2-028` criterion 4): `L2-044` refuses no sticker id with a `code`.
Otherwise it sends `StickerShown { sticker, from }`, the id and the sender's player id, to the
room's group, the sender included, so every device shows the sticker from the same message. It
saves nothing: a sticker is never written to the room store (`L2-046` criterion 1).

**The rate.** `HubRateLimitFilter`, a hub filter in `AroundTheWorld.Api` that runs before
`RoomHub`, lets one `SendSticker` through a second for each connection, counted on `TimeProvider`,
and drops the others without an error and without sending them on (`L2-028` criterion 5). The time
of the last sticker let through is kept in the connection's own `Items`, so it goes with the
connection and nothing grows with the stickers sent or the connections made. The limit of 5
answers a second (`L2-045` criterion 3) joins the same filter when that criterion is built; it is
not this journey's.

## Consequences

Every player of a room sees each duel live on Duel, and the six stickers are the only thing a
watching player can send. A sticker flood costs the server one comparison a message and no memory,
and costs a device at most three stickers on screen. The device does not limit presses itself: the
server's drop is the rule, and a dropped sticker is simply not shown.
