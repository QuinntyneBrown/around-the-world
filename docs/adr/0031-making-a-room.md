# 0031. Making a room: the code, the token, the rate limit, the room's life and Solo Or Friends' states

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 12 builds the first feature of the backend: a host makes a room on Solo Or Friends and
lands in the Lobby with its code. `docs/detailed-designs/rooms/make-room/` and
`docs/detailed-designs/rooms/guard-room/` leave `<TO SUPPLY>` the list of blocked words and
where it is kept, what the handler does when no unused code is found, the number of rooms one
address may make and the period, whether a 429 carries a `code`, the connection token's length
and encoding, how the token travels on a connection, how the caller's address is known behind a
proxy, whether a new room starts from the default setup, when "Make a room" is enabled again
after a rate limit, how the page learns that the device has no network, and the words of the
generic message on Solo Or Friends. `L2-027` criterion 4 deletes a room nobody has touched for
10 minutes **(to confirm)**, and nothing says how.
`docs/detailed-designs/platform/keep-children-safe/` leaves `<TO SUPPLY>` how the backend's
validator and the device's `NicknameGenerator` hold the same lists.

Joining with a code, the Lobby's live updates over SignalR, "Copy room link" and the host's
"Change" are journeys 13 and 14. The initial bundle is 271.87 kB against a warning of 272 kB.

## Decision

**The code.** `RoomCodeGenerator` draws 4 letters, each from A to Z with the same chance, with
.NET's cryptographic `RandomNumberGenerator`, and draws again while the 4 letters are a word on
the list of blocked words. The list is a fixed set of rude or unkind 4-letter words in
`AroundTheWorld.Infrastructure` (`Rooms/BlockedWords.cs`), compared with the whole code; it is
code, not data, so a change to it is reviewed like any other. `MakeRoomCommandHandler` asks for a
code until it finds one no room holds, at most 10 times; after 10 codes in use it refuses with
status 503 and the code `no_free_code`, which the screen shows as its generic message. A unique
index on the code keeps two rooms from holding one code.

**The token.** `ConnectionToken` is 32 bytes from `RandomNumberGenerator`, written in base64url
without padding (43 characters). It is returned once, in the make (and later the join)
response, and is never logged. On a SignalR connection (journey 13) it travels as SignalR's
access token (`accessTokenFactory`), which the WebSockets transport sends as the query parameter
`access_token`; no telemetry records a query string (`AGENTS.md`, Backend).

**What the backend validates.** `MakeRoomCommandValidator` refuses a kid id that is not one of
the five (`invalid_kid`) and a nickname index outside 0 to 9 (`invalid_nickname`), status 400.
The backend holds no word of either list: a nickname is two indexes on the wire and in the
store, and only the device turns it into words. A body that cannot be read is refused with
`invalid_request`, and a body over 1 KB with status 413 before any handler runs (`L2-044`
criterion 2). `ValidationBehaviour`, the MediatR pipeline behaviour journey 01 deferred, runs
every request's validators before its handler and throws `RefusedException`, which
`ErrorCodeWriter` (an `IExceptionHandler`) writes as ProblemDetails with the `code` extension and no detail of
the server.

**The rate limit.** Making a room is marked `[OpenToAnyone("make-room")]`, one declaration that
allows the request without a token and names its rate limit policy. The policy is a fixed window
per address: 10 rooms a minute **(to confirm)**, read from the settings
`RateLimits:MakeRoom:PermitLimit` and `RateLimits:MakeRoom:WindowSeconds`. A refused request gets
status 429, a `Retry-After` header in seconds and ProblemDetails with the code `rate_limited`.
The address is the connection's remote address; the limiter keeps it in memory for its window
only, and nothing writes it to the store. Behind a deployed system's proxy the address is read
from the forwarded headers of the known proxy, which journey 17 configures with the rest of
`platform/operate-backend`.

**The room.** A new room starts with the default setup (`L2-016` criterion 1, `L2-017`
criterion 1: Times, ×2 to ×10, 12 desks, Normal); the host's "Save" belongs to journey 14. Its
host is its first player, at position 0. The room holds the code, the status, the setup and the
time of its last activity; each player holds the nickname's two indexes, the kid, the position,
the host mark, the time of joining and the token, and nothing else (`L2-046` criterion 1 names
what describes a player; the host mark and the two times describe no child).

**The room's life.** A room nobody has done anything in for 10 minutes **(to confirm)** is
deleted with its players (`L2-027` criterion 4). `IdleRoomSweeper`, a hosted service, sends
`DeleteIdleRoomsCommand` once a minute on `TimeProvider`, so a test advances `FakeTimeProvider`
and awaits the command rather than sleeping. Making the room is its first activity; joining,
the Lobby and the game add theirs with their journeys.

**Where the backend is.** The frontend calls the backend on its own origin, under `/api/` and
`/hubs/`, as the Playwright fixture already answers them (docs/adr/0006); a deployed system
routes those paths to the backend, so the game needs no setting of its own and the browser
makes no cross-origin request. The CORS policy and `Frontend:Origin` join with journey 17.

**The client.** `@atw/api` holds `RoomsApi` behind `ROOMS_API`, the types `RoomEntry` and
`RoomState`, and `ApiError` with its `code`; `FetchRoomsApi` implements it over the browser's
`fetch`. Angular's `HttpClient` is the platform's usual choice, but provided only by the lazy
route of Solo Or Friends it still moved 25.3 kB of `@angular/common` into `main` (measured
against the base commit), and lazy loading outranks convenience (`AGENTS.md`). This is a
departure from best practice: the game sends a few JSON requests and needs no interceptor, so
`fetch` costs nothing; when the game first needs what `HttpClient` gives, it should be measured
again. The route of Solo Or Friends provides `RoomsApi` and `Network`, not `app.config.ts`. A
request that gets no response is `backend_unreachable`; a ProblemDetails is its `code`; any
other answer is `unknown`.

**The initial budget.** The room group's route, its `canMatch` guard, the redirect of a room's
address and the visit's room add 0.31 kB to `main` (251.04 kB to 251.35 kB; 271.87 kB to
272.17 kB in all). The initial warning moves from 272 kB to 273 kB (ADR 0026); the error stays
at 285 kB.

**The visit holds the room.** `Visit` gains `room`, `enterRoom` and `leaveRoom`: the `RoomEntry`
is held in memory for this visit only and never written to the device, so a reload forgets it.
The room group (`games/friends-game.routes.ts`) matches with `canMatch` only while the visit
holds a room, as ADR 0016 planned, and holds the Lobby at `/room/:code`. Any other
`/room/:code` opens Home until journey 13 opens Room with the code filled in. "Leave the room"
drops the room from the visit and opens Solo Or Friends; telling the backend is journey 13's
`LeaveRoom`, and until then the room ends when it is idle.

**Solo Or Friends' states.**

- `submitting` — "Make a room" is `aria-busy` with a spinner and "Making…"; a second press does
  nothing.
- `error` — `backend_unreachable`, and every `code` the screen has no words for, show "We
  couldn't make your room" and "Something went wrong on our side. Try again, or play solo while
  you wait." with "Try again", which sends the request again. These words already promise
  nothing about the cause, so they are the generic message of `L2-054` criterion 2.
- `rate-limited` — "Make a room" stays disabled until the child opens Solo Or Friends again; the
  alert says to wait a little. A timer for `Retry-After` would need the page's clock, and the
  backend refuses an early request anyway.
- `offline` — the page reads `Network.online`, a signal over the browser's `navigator.onLine`
  and its `online` and `offline` events, bound by the route as `BrowserNetwork` and released
  with it. The banner is a status at the top of the screen; "Play solo" stays.
- The alerts sit below the two buttons, across the card, in Mode card's new `note` slot (the
  mocks put them inside the two-column grid of buttons, where they took one column).

**The Lobby in this journey.** The host sees the code panel, the panel "The game" (Maths, Tour,
"Answer by"), "Start the race" disabled with "Waiting for at least one friend…", and the
players: the host with "Host" and "(you)", the count "1/8" and seven empty desks. "Answer by"
reads "Shouting it!" when the device answers by voice and "The number pad" otherwise
(**to confirm**, `L2-024` criterion 5). "Copy room link" (journey 13) and "Change" (journey 14)
are not drawn until their journeys build them, rather than drawn and doing nothing.

**Tests.** The backend's acceptance tests run through the API; a rule with a table of cases has
a direct test in `tests/AroundTheWorld.UnitTests`, which runs locally with
`node tools/verify/verify.mjs` and not in CI (`AGENTS.md`, CI). CI runs the acceptance tests'
project only. The fixture's `backend` gains `unreachable` and `holdBack`, and a `network` fake
that takes the device offline (Playwright's `setOffline`).

## Consequences

A child who makes rooms in a rush is stopped after 10 in a minute, and a school whose children
share one address shares that limit, which is why the number stays to confirm. A room left in
the Lobby is gone 10 minutes later, and the host who comes back to it has to make a new one
until journey 16 brings reconnecting. The HTTP client and its interceptors load with Solo Or
Friends; a later screen that calls the backend provides the same pair from its own route or
shares this one.
