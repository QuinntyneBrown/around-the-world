# Architecture decision records

Each record states one decision: its context, the decision and its consequences. A record is
never edited to change its decision; a later record supersedes it. `AGENTS.md` requires a
record for every departure from best practice and for every choice that fills a gap the
requirements and designs leave.

| # | Decision | Status |
|---|---|---|
| [0001](0001-angular-workspace.md) | Angular 22 workspace of source libraries, zoneless, signals and `OnPush` | Accepted |
| [0002](0002-dotnet-backend.md) | .NET 10 backend with MediatR 12.5, FluentValidation and EF Core 10 | Accepted |
| [0003](0003-npm.md) | npm is the package manager | Accepted |
| [0004](0004-unit-test-runners.md) | Vitest for the frontend's unit tests, xUnit v3 for the backend's tests | Accepted |
| [0005](0005-eslint-boundaries.md) | `eslint-plugin-boundaries` enforces the dependency direction | Accepted |
| [0006](0006-playwright-fixture.md) | The shape of the shared Playwright fixture | Accepted |
| [0007](0007-ci-layout.md) | One CI workflow of two parallel jobs | Accepted |
| [0008](0008-bundle-budgets.md) | The production budgets of `game` | Accepted |
| [0009](0009-health-and-migrations.md) | The live endpoint, the room store's engine and the migrations command | Accepted |
| [0010](0010-design-system-components.md) | Each design-system component is built once, in `@atw/components` | Accepted |
| [0011](0011-player-record-on-the-device.md) | The player's record is one versioned JSON entry in `localStorage` | Accepted |
| [0012](0012-interactive-components-on-native-elements.md) | A design-system component that is a link or a button sits on the native element | Accepted |
| [0013](0013-pictures-arriving-and-failing.md) | Home's and Pick Your Kid's loading and error states follow their pictures | Accepted |
