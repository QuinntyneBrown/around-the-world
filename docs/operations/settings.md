# Settings a deployed system needs

Each setting is read from configuration supplied by the environment (in ASP.NET Core, an
environment variable uses `__` for `:`). No value is in the source; a connection string or an
access key is supplied as a secret. A change that adds a setting documents it here in the same
change (`AGENTS.md`, `L2-052` criterion 4).

## Backend (`AroundTheWorld.Api`)

| Setting | Environment variable | Purpose | Added by |
|---|---|---|---|
| `ConnectionStrings:RoomStore` | `ConnectionStrings__RoomStore` | Connection to the room store, an Azure SQL Database ([ADR 0009](../adr/0009-health-and-migrations.md)). Absent in a local or test run, where no room store is used. | Journey 01 |
| `RateLimits:MakeRoom:PermitLimit` | `RateLimits__MakeRoom__PermitLimit` | How many rooms one address may make in a window; 10 when absent **(to confirm)** ([ADR 0031](../adr/0031-making-a-room.md)). | Journey 12 |
| `RateLimits:MakeRoom:WindowSeconds` | `RateLimits__MakeRoom__WindowSeconds` | The length of that window in seconds; 60 when absent. | Journey 12 |

The settings that `docs/detailed-designs/platform/operate-backend/` names for later journeys
(`Azure:SignalR:ConnectionString`, `Frontend:Origin`, the other rate limits and
`OTEL_EXPORTER_OTLP_ENDPOINT`) join this table with the change that first reads them.

## Deploying

1. Run `dotnet run --project src/AroundTheWorld.Api -- migrate` (from `backend/`, or the
   published `AroundTheWorld.Api migrate`) with `ConnectionStrings__RoomStore` set. It applies
   the room store's migrations and exits.
2. Start the new version. It never migrates on startup.
3. The hosting platform's liveness probe asks `GET /health/live`, which answers 200 while the
   process runs.

## Routing

The game calls the backend on its own origin, under `/api/` and `/hubs/` ([ADR 0031](../adr/0031-making-a-room.md)).
A deployed system routes those two paths to `AroundTheWorld.Api` and every other path to the
`game` build, so the game needs no setting of its own.
