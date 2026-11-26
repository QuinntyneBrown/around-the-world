# 0032. Joining a room and the Lobby: the join, the room hub, the room's link, Room's states and the Lobby's messages

- **Status:** Accepted; a lost connection in the Lobby (the retries, and a waiting player kept) superseded by ADR 0036
- **Date:** 2026-11-26

## Context

Journey 13 lets a friend join a room with its code and keeps every Lobby in the room up to date
over SignalR, the game's one real-time channel. `docs/detailed-designs/rooms/join-room/` leaves
`<TO SUPPLY>` when "Join" is enabled again after a rate limit, the words of Room's generic
message, how the store refuses the second of two joins that reach a room of 7 at once, and
whether a 429 carries a `code`. `docs/detailed-designs/rooms/wait-in-lobby/` leaves `<TO SUPPLY>`
the address of the room's link, how long the Lobby tries before it says the room is lost, what
"Try again" does then, and whether the backend removes a waiting player whose connection is
lost. Nothing yet decides how a hub request knows its caller, what the hub's events are called,
how a refusal travels over the hub, when the SignalR client is downloaded, what the Lobby shows
before the room arrives over its connection, or what Room's `loading` state waits for.

The host's setup and start are journey 14; coming back after a lost connection is journey 16.
Journey 12 left the initial bundle at 272.17 kB (warning 273 kB, ADR 0031).

## Decision

**The join.** `POST /api/rooms/join` takes `{ code, kid, nickname: { adjective, animal } }`, the
code as typed and in the body, never in an address (`L2-053` criterion 2). It answers 200 with
the same `RoomEntry` as making a room: the code, the player's own connection token, their id and
the room as it stands. `JoinRoomCommandValidator` refuses a code that is not 4 letters from A to
Z in either case (`invalid_code`), and a kid or nickname as making a room does (ADR 0031);
`RoomCode.Parse` turns the letters to capitals. The refusals are `room_not_found` (404),
`room_full` and `game_started` (409). `Room.Join` places the new player one place after the
last, so a player who left leaves no gap that a later joiner fills out of turn. A room whose
game is over is not waiting, so it refuses with `game_started` until journey 14 decides the
room's return to its Lobby.

**Two joins at once.** `Room` gains a `Version`, an EF Core concurrency token that every change
to its players renews (migration `AddRoomVersion`). A save made from a room that another change
reached first is refused by the room store as a whole unit of work, and the handler forgets what
it read and tries the join again on the room as it now stands, at most 5 times; the second of
two friends who reach a room of 7 at once therefore meets 8 players and `room_full`. EF Core
InMemory has no transactions, so the acceptance test injects that refusal through
`IAppDbContext` (`AGENTS.md`, Backend tests) rather than racing two requests.

**The rate limit.** Joining is marked `[OpenToAnyone("join-room")]`: 10 codes a minute for one
address **(to confirm)**, from `RateLimits:JoinRoom:PermitLimit` and
`RateLimits:JoinRoom:WindowSeconds`, refused with 429, `Retry-After` and the code
`rate_limited`, as making a room is (ADR 0031). Every try counts, found or not, so codes cannot
be tried at speed.

**The room hub.** `RoomHub` is at `/hubs/room`, WebSockets only, with SignalR's negotiation
skipped and messages of at most 1 KB (`L2-044` criterion 2); its detailed errors stay off. The
browser presents the connection token as SignalR's access token, which the WebSockets transport
sends as the query parameter `access_token` (ADR 0031); a client that can send headers may send
it as a bearer header instead. `CurrentPlayerFilter`, a hub filter, reads the token once when the
connection opens and gives each hub request's scope its caller (`ICurrentPlayer`).
`RoomPlayerBehaviour`, a MediatR pipeline behaviour, finds the player who holds that token for
every request marked `IRoomPlayerRequest` and refuses any other with `not_in_room` (403), so the
hub methods check nothing and carry no room's code or id (`L2-043` criteria 2 and 3).

- `OnConnectedAsync` sends `ReconnectCommand` on every connection, the first one included: it
  adds the connection to its room's group and sends it the room as it stands. A connection whose
  token names no player is closed with an error and is not told to reconnect, and it hears
  nothing about any room.
- `LeaveRoom()` sends `LeaveRoomCommand`: the player leaves; when the host leaves, the player
  who joined earliest becomes the host; when the last player leaves, the room is deleted with
  nothing left of it (`L2-025` criterion 5, `L2-046` criterion 2). A join and a leave are each
  the room's activity (ADR 0031).
- The one event is `RoomChanged(RoomState)`, sent to the room's group by `HubRoomNotifier` in the
  step that saves the change; no Lobby polls (`L2-024` criterion 2). A `RoomState` holds no
  token.
- A refusal of a hub method is a hub error whose message is its `code` and nothing of the
  server (`L2-044` criterion 3).

**A connection lost in the Lobby.** The SignalR client reconnects by itself at once, then after
1 and 3 seconds; when the last try fails, or the server closes the connection for good, the
Lobby shows "We lost the room" with "Try again" and "Go home" in place of the start control,
keeping the code, the setup and the players it last received (`L2-029` criterion 6). "Try again"
connects afresh with the same token; a token that no longer names a player is closed again, and
the alert returns. The backend does not remove a waiting player whose connection is lost: the
30 seconds of `L2-029` and what the other players are told are journey 16's to decide. Until
then such a player keeps their desk until they leave or the room is idle for 10 minutes.

**Leaving.** "Leave the room" sends `LeaveRoom`, closes the connection, drops the room from the
visit and opens Solo Or Friends (`L2-030` criterion 8). Leaving the room group any other way
(the browser's Back, "Go home") is leaving too: `FriendsGame`, provided by the group, sends
`LeaveRoom` and closes the connection, removing its handlers, when the group is destroyed
(`L2-048` criterion 2).

**The room's link** is the Lobby's own address, `{origin}/room/{CODE}`. The room group matches
it only while the visit holds that room; anyone else who opens it, on another device or after a
reload, is not in the room, and Room opens with the code filled in (`L2-024` criterion 4). This
replaces journey 12's redirect of a room's address to Home (ADR 0031). A child who has never
picked a kid joins as Zuri with a new nickname, as "Make a room" does (ADR 0031).

**Room's states.**

- Room is one centred column of at most 576 px (`L2-050` criterion 6). "Join" is disabled with
  fewer than four letters; Enter in the field joins at four.
- While a join is in progress the field is disabled, "Join" is busy and reads "Joining…", and
  the message line says "Finding your friends…" as a status.
- Each refusal is an alert in the message line, the field is marked `aria-invalid` and the four
  boxes shake once in 300 ms (a fade of colour only with reduced motion, `L2-038` criterion 4).
  Changing the code clears the refusal.
- `rate_limited` keeps "Join" disabled until the child opens Room again, as "Make a room" does
  (ADR 0031); the backend refuses an early try anyway.
- `backend_unreachable` keeps "Join" usable and offers "Play solo instead", which opens Game
  Setup (`L2-023` criterion 9).
- Every other `code` shows the generic message "Something went wrong on our side. Try again in a
  moment." (`L2-054` criterion 2), with "Join" usable.
- `loading`: Room reads the code from its address as it opens, so nothing arrives and the state
  is never shown; the mock keeps the shape a later wait would take.

**The SignalR client** (`@microsoft/signalr` 10.0) is imported dynamically by
`SignalRRoomConnection` in `@atw/api` when the Lobby first connects, so it is in no initial
chunk and a child who plays only solo never downloads it (`L2-047` criteria 2 and 3). Its logging
is off: a lost connection is a state of the Lobby, not an error in the console.

**The Lobby's states.**

- `loading` — until the connection delivers the room's first `RoomChanged`, placeholders stand
  in for the code, the setup and the players, the page is busy and a hidden status says "Getting
  the room…" (`L2-031` criterion 4). The room in the join or make answer is not shown meanwhile:
  the first state over the connection is the one every other Lobby has.
- `guest` — a player who is not the host sees "You're in!" and "Waiting for {host's nickname} to
  start…" and no "Change" (`L2-025` criterion 3).
- "Start the race" stays disabled, with "{n} kids ready" under it once a friend is in, until
  journey 14 builds the start; drawn and doing nothing would mislead the host.
- `error` — the alert above.

**The Lobby's messages.** `LobbyPage` derives them from two successive `RoomState` values with
`linkedSignal`, no `effect()`: a player added who is not the device's own is "{nickname} joined"
with "as {kid}" (info); the device's own player becoming the host is "You're the host now" with
"The host left. You can start the race." (warning). The first state the Lobby receives says
nothing. "Copy room link" copies the link with CDK `Clipboard` and says "Link copied" (success)
or "Couldn't copy the link" with "Say the code out loud instead: {the letters}." (danger, an
alert that stays until it is dismissed). A message leaves by itself after 4 seconds and waits
while it is pointed at or focused. The page holds three at most; a fourth drops the oldest.

**The initial budget.** Room's route, the guard that matches only the visit's own room, and
what `main` now shares with the Room and Lobby chunks add 0.96 kB to `main` (251.35 kB to
252.31 kB; 272.17 kB to 273.13 kB in all), measured module by module against the base commit.
`CodeField` keeps to the framework code every screen already loads (an `input` and `output`
pair rather than `model()`, `ngAfterViewInit` rather than `afterNextRender`), which saved
another 1.25 kB. The initial warning moves from 273 kB to 274 kB (ADR 0031); the error stays at
285 kB. The SignalR client is a lazy chunk of its own (about 56 kB), imported dynamically by the
room group's chunk.

**The contracts.** `@atw/api` gains `RoomsApi.joinRoom`, the codes `invalid_code`,
`room_not_found`, `room_full` and `game_started`, `RoomConnection` behind `ROOM_CONNECTION`, and
`RoomSession` behind `ROOM_SESSION`, which the Lobby reads: the entry, the room, the state of
the connection, `retry()` and `leave()`. `FriendsGame` in `game` implements it; journey 14 makes
it the room group's `GAME_SESSION` too. Room's route provides `RoomsApi`; the room group's route
provides `ROOM_CONNECTION` and `ROOM_SESSION`.

## Consequences

Friends join with a code read aloud, and every Lobby in the room shows each join and leave as it
is saved. A child who closes the tab in the Lobby keeps a desk until journey 16 removes absent
players, or the room is idle for 10 minutes. The SignalR client's chunk is fetched while the
Lobby shows its placeholders. A school whose children share one address shares the join limit,
which is why its number stays to confirm.
