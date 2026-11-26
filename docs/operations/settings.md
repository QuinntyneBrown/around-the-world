# Settings a deployed system needs

Each setting is read from configuration supplied by the environment (in ASP.NET Core, an
environment variable uses `__` for `:`). No value is in the source; a connection string or an
access key is supplied as a secret. A change that adds a setting documents it here in the same
change (`AGENTS.md`, `L2-052` criterion 4).

## Backend (`AroundTheWorld.Api`)

| Setting | Environment variable | Purpose | Added by |
|---|---|---|---|
| `ConnectionStrings:RoomStore` | `ConnectionStrings__RoomStore` | Connection to the room store, an Azure SQL Database ([ADR 0009](../adr/0009-health-and-migrations.md)). Absent in a local or test run, where no room store is used. | Journey 01 |

The settings that `docs/detailed-designs/platform/operate-backend/` names for later journeys
(`Azure:SignalR:ConnectionString`, `Frontend:Origin`, the rate limits and
`OTEL_EXPORTER_OTLP_ENDPOINT`) join this table with the change that first reads them.

## Deploying

1. Run `dotnet run --project src/AroundTheWorld.Api -- migrate` (from `backend/`, or the
   published `AroundTheWorld.Api migrate`) with `ConnectionStrings__RoomStore` set. It applies
   the room store's migrations and exits.
2. Start the new version. It never migrates on startup.
3. The hosting platform's liveness probe asks `GET /health/live`, which answers 200 while the
   process runs.
