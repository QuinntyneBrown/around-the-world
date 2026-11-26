# 0009. The live endpoint, the room store's engine and the migrations command

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/platform/operate-backend/` fixes `GET /health/live` and
`GET /health/ready`, with `Live()` answering 200 and checking nothing. `AGENTS.md` asks that a
controller send one MediatR request, that a CLI command apply migrations and that the API never
do so on startup. The room store's engine was `<TO SUPPLY>`, and migrations need one.

## Decision

- **Live:** `GET /health/live` answers 200 with `{"status":"live"}`. It is the one endpoint
  that sends no MediatR request: a liveness probe answers from the process alone, with no
  dependency that could fail it (ASP.NET Core's guidance for liveness). This departs from the
  `AGENTS.md` rule on controllers; the proposed correction is to add "except the live endpoint"
  to it. `GET /health/ready` sends `CheckReadinessQuery`, as designed, and arrives with
  journey 17.
- **Room store:** Azure SQL Database, through EF Core's SQL Server provider, as the deployed
  system's room store. The connection string is the setting `ConnectionStrings:RoomStore`
  (`docs/operations/settings.md`). Tests replace it with EF Core InMemory, one store per fixture.
- **Migrations:** `dotnet run --project src/AroundTheWorld.Api -- migrate` (from `backend/`)
  applies the room store's migrations and exits. The API's normal start never migrates. The
  first migration arrives with the first entity, the room (journey 12).

## Consequences

Journey 17 measures the 50 ms target of `L2-049` criterion 3 against Azure SQL Database and
supersedes this record if it does not hold. A deployment runs the migrate command before it
starts the new version.
