# 0010. Each design-system component is built once, in `@atw/components`

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/design-system/components/` documents 47 components, each one BEM block extracted from
the mocks, and says that each becomes one component in the Angular `components` library.
`AGENTS.md` puts presentation in `components` and keeps the mocks' BEM classes, on which the
end-to-end locators depend. Without a rule, a screen would copy a block's markup instead of
using it.

## Decision

- One page of `docs/design-system/components/` is one component in
  `frontend/projects/components/src/lib/<name>/`, built the first time a screen needs it:
  selector `atw-<name>`, class `<Name>`, files `<name>.ts`, `<name>.html`, `<name>.scss`,
  `OnPush`, default encapsulation, inputs and outputs only, no injected app service, token or
  router.
- Its template renders the design system's block with the same BEM classes (`block`,
  `block__element`, `block--modifier`), and its stylesheet holds that block's rules from
  `docs/design-system/assets/components.css`, reading tokens by role.
- `game` and every other app use the component. A screen never re-creates a block's markup or
  styles another component's block. Layout blocks that a page composes (`screen`, `stack`,
  `cluster`) are components too when a screen first needs them.
- `frontend/projects/components/README.md` keeps the mapping of every design-system page to its
  component and status.

## Consequences

The first screen that needs a block builds it in `components`, with its unit test where it has
logic, and records it in the mapping. The app shell already uses `atw-skip-link`.
