# 0037. Running the backend deployed: Azure SignalR Service, the hosting platform, telemetry, health, the limits and the failures

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 17 makes the backend ready to deploy (`L2-052`, `L2-053`, `L2-054`).
`docs/detailed-designs/platform/operate-backend/` leaves `<TO SUPPLY>` how two instances order
two answers and which runs a room's clock, the service tier for 500 rooms of 8 players, whether
Azure SignalR Service's endpoint is a third-party origin under `L2-041` criterion 2, the
instrument names, whether the health endpoints carry a rate limit, the `code` of a 429, the
generic message's words, the telemetry backend's product and the hosting platform.
`docs/detailed-designs/rooms/guard-room/` leaves to this journey where the 1 KB limit applies
when the service relays a message, where TLS ends, the forwarded headers of the known proxy, the
CORS policy with `Frontend:Origin`, and the limit of 5 answers a second (`L2-045` criterion 3).
ADR 0035 left the answers' limit to join the stickers' hub filter. ADR 0031 called the
make-room and join-room limits **(to confirm)**.

Two facts shaped the decisions. Azure SignalR Service's server SDK (`Microsoft.Azure.SignalR`)
refuses a negotiation while the instance has no connection to the service, and it is the
service, not the instance, that holds the player's WebSocket: the hub then sees the claims the
negotiation put in the service's access token, never the query string or the headers of the
player's own request. The game's SignalR client skipped the negotiation (ADR 0032), which the
service cannot serve.

## Decision

**Azure SignalR Service, switched on by its setting.** `Program` adds SignalR and, when
`Azure:SignalR:ConnectionString` holds a value, `AddAzureSignalR` (package
`Microsoft.Azure.SignalR`) with WebSockets as the only transport the service offers
(`TransportTypeDetector`) and the caller's claims as the claims of the service's token
(`ClaimsProvider`). With no value, the instance serves SignalR itself; every test runs that way,
on the in-memory test server, and never reaches Azure (`L2-052` criterion 3).

- **The token is the connection's identity.** An authentication scheme, `RoomToken`, reads the
  connection token from the `Authorization: Bearer` header or, for a browser's WebSocket, the
  `access_token` query parameter, and makes it a claim of the request's user. It checks nothing:
  `RoomPlayerBehaviour` still refuses a token that names no player (ADR 0032). The hub reads
  the token from `Context.User`, so the same code serves a connection the instance holds and one
  the service relays, whose claims came from the negotiation.
- **The device negotiates.** `SignalRRoomConnection` no longer skips the negotiation; it asks
  for WebSockets only and follows the redirect a negotiation answers with, to the service's
  address and access token (`L2-052` criterion 1). With no service set, the negotiation is the
  instance's own and the WebSocket opens on the game's origin as before. While an instance has
  no connection to the service, the SDK refuses a negotiation with a 500 and its own short
  message, which holds nothing of a room; the device treats it as `backend_unreachable`, and
  the ready endpoint has taken the instance out of service by then.
- **Two instances.** They share one room store and order two answers by the room's `Version`,
  and every instance runs the room's clock; the save that stands decides (ADR 0033). Azure
  SignalR Service delivers a room group's message to every player whichever instance sent it
  (`L2-052` criterion 2).
- **The service tier.** Standard tier, 5 units: 4,000 connections for 500 rooms of 8 players
  (`L2-049` criterion 3) and a fifth unit of headroom **(to confirm by a load test before
  launch)**.
- **Not a third party.** The service's endpoint is part of the deployed backend: it is
  provisioned with the backend, in the game's own subscription, and carries only the room's
  hub messages. It is not an advertising, analytics or other third-party origin under `L2-041`
  criterion 2, and `L2-052` criterion 1 says so. `connect-src` of the Content Security Policy
  names it (`docs/detailed-designs/platform/keep-children-safe/`).
- **The 1 KB limit.** The hub's `MaximumReceiveMessageSize` of 1 KB applies to a connection the
  instance holds. A message the service relays is limited by the service itself; every hub
  argument is a number, or a setup whose lists the validator bounds, so a larger message
  changes nothing (`L2-044` criteria 1 and 2). Whether the service's own limit can be set to
  1 KB is **(to confirm)** with the service's tier.

**The hosting platform and TLS.** Azure Container Apps runs `AroundTheWorld.Api`, with its
ingress serving HTTPS and WSS only (insecure connections off): TLS ends at the ingress, and the
API listens on plain HTTP inside the environment (`L2-045` criterion 4). Its health probes ask
`/health/live` and `/health/ready`. The forwarded headers `X-Forwarded-For` and
`X-Forwarded-Proto` are read only from the ingress, named by the settings
`ForwardedHeaders:KnownProxies` and `ForwardedHeaders:KnownNetworks` (with loopback, ASP.NET
Core's default, always known), one proxy deep; the rate limits then count the child's device's
address, not the ingress's (ADR 0031). A header from any other address is ignored.

**CORS.** One policy allows the origin `Frontend:Origin` and no other, for the API and the hub,
with any header and method and with credentials, as SignalR's browser client asks for
(`L2-044` criterion 4). With no value no other origin is allowed; the game calls the backend on
its own origin (ADR 0031), which needs no CORS.

**Telemetry.** OpenTelemetry (packages `OpenTelemetry.Extensions.Hosting`,
`OpenTelemetry.Instrumentation.AspNetCore`, `OpenTelemetry.Exporter.OpenTelemetryProtocol`)
records traces from ASP.NET Core (one span per HTTP request, named by its route template), from
SignalR's server (one span per hub method) and from the source `AroundTheWorld`; metrics from
ASP.NET Core, Kestrel, SignalR and the meter `AroundTheWorld`; and logs. The OTLP exporter is
added only when `OTEL_EXPORTER_OTLP_ENDPOINT` holds a value: Azure Container Apps' managed
OpenTelemetry agent supplies it and forwards to Azure Monitor (Application Insights), the
telemetry backend. `OTEL_SERVICE_NAME` names the service, `around-the-world-api` when absent.

- **`TelemetryBehavior`** starts the span `atw.request` for each MediatR request and records
  its duration into the histogram `atw.request.duration` (seconds). Both carry two tags only:
  `atw.request`, the request type's name, and `atw.outcome`, `ok`, the refusal's `code`,
  `server_error` or `cancelled` (the caller went away). The histogram's count counts the outcomes.
- **`TelemetryScrubber`** removes, from every span before export, the tags `url.full`,
  `url.path`, `url.query`, `http.target`, `http.url`, `client.address`, `client.port`,
  `network.peer.address`, `network.peer.port` and `user_agent.original`; from every log record,
  the attributes `Path`, `PathBase`, `QueryString`, `Host`, `RequestPath` and `Uri`. Logs are exported without their scopes and without
  formatted messages, and no exception is recorded on a span.

**Health.** `GET /health/ready` sends `CheckReadinessQuery`, whose handler asks every
`IReadinessProbe` and answers 200 `{"status":"ready"}` or 503 `{"status":"not_ready"}`.
`RoomStoreProbe` asks the room store through `IAppDbContext.CanConnectAsync`.
`SignalRServiceProbe`, registered only when the service is set, asks the service's health API
(`HEAD {endpoint}/api/health`) and waits 2 seconds at most: the server SDK's own count of its
connections to the service is not public. Both health endpoints are open to anyone and rate
limited for each address, 60 requests a minute between them by default (`RateLimits:Health`),
five times what a probe every 10 seconds of three kinds asks. `GET /health/live` still sends no
MediatR request (ADR 0009, whose proposed correction to `AGENTS.md` stands).

**The limits on a hub connection.** `HubRateLimitFilter` keeps, in each connection's own
`Context.Items`, the times of the last few messages of each limited method, and drops a message
without an error when as many arrived in the second before it as the limit allows:
`SubmitAnswer` 5 a second (`L2-045` criterion 3) and `SendSticker` 1 a second (`L2-028`
criterion 5, ADR 0035). The limits are settings, `RateLimits:Answers:PerSecond` and
`RateLimits:Stickers:PerSecond`. The make-room and join-room limits stay 10 a minute **(to
confirm)**, as settings (ADRs 0031 and 0032).

**Failures.** A 429 carries the code `rate_limited` (ADR 0031). An exception that is not a
refusal is answered 500 with a ProblemDetails holding the code `server_error`, a generic title
and nothing of the server (`L2-044` criterion 3, `L2-054` criterion 1). On the hub it stays
SignalR's generic error with detailed errors off. On the device, the pure helpers that already
word a refusal (`joinRefusal` on Room, `roomRefusal` on Solo Or Friends, Game Setup's save in a
room) give every code they do not name their screen's generic words, never the backend's: Room's
"Something went wrong on our side. Try again in a moment." (ADR 0032) and Solo Or Friends' "We
couldn't make your room" (`L2-022` criterion 3). They stand in for the design's single
`messageForCode`.

**Testing telemetry.** An activity source is seen by every tracer in a process, so the
acceptance test that reads exported telemetry (through OpenTelemetry's in-memory exporters,
after the scrubber) runs in an xUnit collection with parallelization off; a deployed process
holds one host and needs nothing of the kind.

**Migrations.** Unchanged: `migrate` applies them and the API never does (ADR 0009).

## Consequences

A deployment supplies the settings in `docs/operations/settings.md`; none has a value in the
source. A deployment with Azure SignalR Service is not ready until the service answers. The
game's first connection to a room makes one more request, the negotiation, and the shared
Playwright fixture answers it as the instance or the service would. The 50 ms target of `L2-049`
criterion 3 is measured from `atw.request.duration` against Azure SQL Database by the load test
that confirms the service tier; ADR 0009 is superseded if it does not hold. An actual
deployment and its infrastructure are outside this record.
