# 0026. The initial budget of `game` once CDK Dialog opens Settings

- **Status:** Accepted (supersedes the `initial` budget of ADR 0021)
- **Date:** 2026-11-26

## Context

`AGENTS.md` makes CDK Dialog the one way to open a dialog, and journey 07 opens the first:
Settings, from Home. Home imports the dialog's module only when the settings button is first
chosen, so `@angular/cdk` and the dialog are a lazy chunk of their own (`open-settings`,
62 kB). Measured with the build's stats against the base commit, `main` still grew by 14.7 kB
(about 4 kB transferred): 13.1 kB of `@angular/core` (the render hooks, the dynamic creation of
a component and its host view, and the injector code the overlay uses), 1 kB of `@angular/core`'s
other parts and `platform-browser`, and 4.5 kB of RxJS schedulers and operators (`auditTime`,
`distinctUntilChanged`) that the overlay's scrolling and the dialog's focus handling use. The
build splits by module, not by function, and `@angular/core` and the RxJS modules `main`
already holds are placed in `main` whichever lazy chunk calls them (ADR 0021).

The way of answering added 0.67 kB beside it: the field kept on the device, its signal in
`PlayerChoices`, and what the visit remembers in `Visit`, all of which `main` needs to read the
device and the visit.

A hand-rolled modal or the native `<dialog>` would cost `main` nothing, but `AGENTS.md` forbids
the first and names CDK Dialog over the second; Pause and Leave (journey 08) open CDK dialogs
too, so the cost is paid once for every dialog of the game.

## Decision

| Budget | Warning | Error |
|---|---|---|
| `initial` | 272 kB | 285 kB |

The initial total is 270.7 kB (71.4 kB transferred). The warning stays within 1.5 kB of it, so
the next growth is noticed.

## Consequences

Home opens a little later on a slow device: about 4 kB more to transfer and parse before the
first screen. Journey 18 measures Home against `L2-047` criterion 4 and, if the 20 seconds are at
risk, revisits whether the dialogs may use the native `<dialog>` (an amendment to `AGENTS.md`
this record does not make).
