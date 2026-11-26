# 0002. .NET 10 backend with MediatR 12.5, FluentValidation and EF Core 10

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`AGENTS.md` asks for a .NET service in clean architecture (`AroundTheWorld.Domain` <-
`Application` <- `Infrastructure` <- `Api`), MediatR handlers, validators, EF Core and SignalR.
.NET 10 is the current long-term support release. MediatR's releases from 13 on are under a
commercial licence that needs a key; 12.5.0 is the last under Apache 2.0.

## Decision

- `backend/AroundTheWorld.slnx` targets `net10.0`; `global.json` asks for SDK 10.0.100 or a later
  feature band of 10.0.
- `Directory.Build.props` turns on nullable reference types, the recommended analyzers and
  warnings as errors for every project; `Directory.Packages.props` sets every package version
  once (central package management); `.editorconfig` holds the code style that
  `dotnet format --verify-no-changes` checks.
- MediatR is pinned to 12.5.0. FluentValidation 12 holds the validators, registered from the
  Application assembly. The validation pipeline behaviour and its ProblemDetails arrive with the
  first request that has a validator (journey 12), so they are proved by its acceptance test.
- EF Core 10 holds the room store (`docs/adr/0009`).

## Consequences

- Moving past MediatR 12.5 needs a licence decision and its own ADR.
- Moving to .NET 11 is a deliberate change of `global.json`, `Directory.Build.props` and CI.
