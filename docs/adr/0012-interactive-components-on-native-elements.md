# 0012. A design-system component that is a link or a button sits on the native element

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

ADR 0010 builds each design-system block once in `@atw/components`, and `AGENTS.md` forbids a
presentation component from injecting the router. Yet the toy button, the icon button, the
text button and the kid chip are each either a link to another screen (`<a>`) or an action
(`<button>`), as their design-system pages say. A component of the element type
(`<atw-toy-button>`) that rendered the `<a>` inside its own template could not carry the
page's `routerLink`, and a component that took a URL and rendered `href` would reload the
whole game on every step.

## Decision

- These components use an attribute selector on the native element, as Angular Material's
  buttons do: `a[atw-toy-button], button[atw-toy-button]`, `a[atw-icon-button],
  button[atw-icon-button]`, `button[atw-text-button]`, `a[atw-kid-chip],
  span[atw-kid-chip]`. Layout blocks that are a semantic element of the screen follow the same
  rule: `header[atw-top-bar]`, `section[atw-stack]`, `div[atw-stack]`, `div[atw-panel]`.
- The host element is the block: the component binds its BEM classes (`toy-btn`,
  `toy-btn--xl`) on the host, and its stylesheet styles `:host`. The page adds `routerLink`,
  `(click)`, `aria-label` or `disabled` to the element itself, so the router stays in the app.
- ESLint's `@angular-eslint/component-selector` accepts the element and the attribute types,
  both with the prefix `atw` in kebab case.

## Consequences

A link stays a real link (middle-click, the browser's own Back) and a button a real button,
with their native keyboard and screen-reader behaviour. The mocks' BEM classes are on the
same elements as in the mocks, so the end-to-end locators read them unchanged.
