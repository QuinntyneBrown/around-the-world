# 0021. The initial budget of `game` once Duel plays a duel

- **Status:** Accepted (supersedes the `initial` warning of ADR 0014)
- **Date:** 2026-11-26

## Context

Journey 04 adds the duel: the flash cards, the classmates, the game's clock, the number pad,
the timer bar and the world ring. All of it is in lazy chunks: the solo group's chunk holds the
rules and `SoloGame`, the classmates' agents are a chunk of their own (`classmate-agent`,
imported when a tour starts) and Duel's chunk holds its components. Measured against the base
commit with a worktree build, `main` still grew by 0.54 kB, to 255.46 kB in all, over the
255 kB warning.

The growth is Angular's own code. The build splits by module, not by function, and
`@angular/core` is one module that `main` needs, so the instructions the new components are
the first to use (a host style binding, a listener on the document, `@else if`) are placed in
`main` whichever lazy chunk calls them. Two other causes were removed before this was decided:
`effect()` and `model()`, which added 3.4 kB to `main`, gave way to an input with an
`entryChange` output and to plain signals, and the duel strip stopped using `NgTemplateOutlet`.

## Decision

| Budget | Warning | Error |
|---|---|---|
| `initial` | 256 kB | 270 kB (unchanged) |

Prefer signals, `computed()` and outputs to `effect()`, `model()` and `linkedSignal()` in
screens and components: the latter bring framework code into `main` that no screen of the first
twenty seconds needs.

## Consequences

The warning stays within 1 kB of the bundle, so the next growth is noticed. Journey 18 measures
Home against `L2-047` criterion 4 and tightens the numbers if it can.
