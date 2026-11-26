# Settings a deployed system needs

Each setting is read from configuration supplied by the environment (in ASP.NET Core, an
environment variable uses `__` for `:`). No value is in the source; a connection string or an
access key is supplied as a secret. A change that adds a setting documents it here in the same
change (`AGENTS.md`, `L2-052` criterion 4).

## Backend (`AroundTheWorld.Api`)

| Setting | Environment variable | Purpose | Added by |
|---|---|---|---|
| `ConnectionStrings:RoomStore` | `ConnectionStrings__RoomStore` | Connection to the room store, an Azure SQL Database ([ADR 0009](../adr/0009-health-and-migrations.md)). Absent in a local or test run, where no room store is used. | Journey 01 |
| `Azure:SignalR:ConnectionString` | `Azure__SignalR__ConnectionString` | Connection to Azure SignalR Service (`Endpoint=…;AccessKey=…;Version=1.0;`), a secret. When it holds a value the room hub's connections are served through the service, by WebSockets, and `/health/ready` also asks the service's health API (`L2-052`, [ADR 0037](../adr/0037-running-the-backend-deployed.md)). Absent in a local or test run, where the instance serves SignalR itself. | Journey 17 |
| `Frontend:Origin` | `Frontend__Origin` | The origin of the `game` application (for example `https://play.example.org`), the only origin the CORS policy allows, for the API and the hub (`L2-044` criterion 4). Absent: no other origin is allowed, which is right when the game and the backend share one origin ([ADR 0037](../adr/0037-running-the-backend-deployed.md)). | Journey 17 |
| `ForwardedHeaders:KnownProxies` | `ForwardedHeaders__KnownProxies` | The addresses of the hosting platform's ingress, comma-separated, whose `X-Forwarded-For` and `X-Forwarded-Proto` are read, one proxy deep; loopback is always known. Absent: no other proxy is believed ([ADR 0037](../adr/0037-running-the-backend-deployed.md)). | Journey 17 |
| `ForwardedHeaders:KnownNetworks` | `ForwardedHeaders__KnownNetworks` | The same as CIDR ranges (for example the Container Apps environment's subnet, `10.0.0.0/23`), comma-separated. | Journey 17 |
| `RateLimits:MakeRoom:PermitLimit` | `RateLimits__MakeRoom__PermitLimit` | How many rooms one address may make in a window; 10 when absent **(to confirm)** ([ADR 0031](../adr/0031-making-a-room.md)). | Journey 12 |
| `RateLimits:MakeRoom:WindowSeconds` | `RateLimits__MakeRoom__WindowSeconds` | The length of that window in seconds; 60 when absent. | Journey 12 |
| `RateLimits:JoinRoom:PermitLimit` | `RateLimits__JoinRoom__PermitLimit` | How many codes one address may try in a window; 10 when absent **(to confirm)** ([ADR 0032](../adr/0032-joining-a-room-and-the-lobby.md)). | Journey 13 |
| `RateLimits:JoinRoom:WindowSeconds` | `RateLimits__JoinRoom__WindowSeconds` | The length of that window in seconds; 60 when absent. | Journey 13 |
| `RateLimits:Health:PermitLimit` | `RateLimits__Health__PermitLimit` | How many requests one address may make to `/health/live` and `/health/ready` together in a window; 60 when absent ([ADR 0037](../adr/0037-running-the-backend-deployed.md)). | Journey 17 |
| `RateLimits:Health:WindowSeconds` | `RateLimits__Health__WindowSeconds` | The length of that window in seconds; 60 when absent. | Journey 17 |
| `RateLimits:Answers:PerSecond` | `RateLimits__Answers__PerSecond` | How many answers one hub connection may send in a second; the rest are dropped. 5 when absent (`L2-045` criterion 3, [ADR 0037](../adr/0037-running-the-backend-deployed.md)). | Journey 17 |
| `RateLimits:Stickers:PerSecond` | `RateLimits__Stickers__PerSecond` | How many stickers one hub connection may send in a second; the rest are dropped. 1 when absent (`L2-028` criterion 5, [ADR 0035](../adr/0035-watching-a-duel-and-stickers.md)). | Journey 17 |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `OTEL_EXPORTER_OTLP_ENDPOINT` | Where traces, metrics and logs are exported by OTLP (on Azure Container Apps, set by its managed OpenTelemetry agent, which forwards to Azure Monitor). Absent: nothing is exported ([ADR 0037](../adr/0037-running-the-backend-deployed.md)). OpenTelemetry's other standard `OTEL_EXPORTER_OTLP_*` variables (protocol, headers) apply as usual. | Journey 17 |
| `OTEL_SERVICE_NAME` | `OTEL_SERVICE_NAME` | The service's name in telemetry; `around-the-world-api` when absent. | Journey 17 |

Telemetry holds nothing about a child (`L2-053` criterion 2): routes are recorded as their
templates, and the query string, the path with its values, the device's address and user
agent, log scopes and formatted messages are removed before export. Keep it so: never log a
nickname's index, a room code, a connection token or a body.

## Deploying

1. Run `dotnet run --project src/AroundTheWorld.Api -- migrate` (from `backend/`, or the
   published `AroundTheWorld.Api migrate`) with `ConnectionStrings__RoomStore` set. It applies
   the room store's migrations and exits.
2. Start the new version. It never migrates on startup.
3. The hosting platform's liveness probe asks `GET /health/live`, which answers 200 while the
   process runs, and its readiness probe asks `GET /health/ready`, which answers 200 when the
   room store (and Azure SignalR Service, where it is set) can be reached and 503 when not.
   Both share the `health` rate limit; a probe every 10 seconds of each kind stays well within
   it.

## TLS and the proxy

TLS ends at the hosting platform's ingress (Azure Container Apps), which serves HTTPS and WSS
only, with insecure connections off (`L2-045` criterion 4). `AroundTheWorld.Api` listens on
plain HTTP inside the environment and reads the device's address and scheme from the forwarded
headers of the proxies that `ForwardedHeaders:KnownProxies` and `ForwardedHeaders:KnownNetworks`
name, so the rate limits count each device and not the ingress.

## Routing

The game calls the backend on its own origin, under `/api/` and `/hubs/` ([ADR 0031](../adr/0031-making-a-room.md)).
A deployed system routes those two paths to `AroundTheWorld.Api` and every other path to the
`game` build, so the game needs no setting of its own. `/hubs/room` is a WebSocket
([ADR 0032](../adr/0032-joining-a-room-and-the-lobby.md)): whatever routes it must pass the
WebSocket upgrade through and must not log the query string, which carries the connection
token as `access_token`. With Azure SignalR Service set, the game first negotiates at
`/hubs/room/negotiate` and is sent to the service's endpoint, so the Content Security Policy's
`connect-src` names that endpoint as well ([ADR 0037](../adr/0037-running-the-backend-deployed.md)).
