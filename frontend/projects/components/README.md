# @atw/components

The presentation library: **one component per page of
[`docs/design-system/components/`](../../../docs/design-system/components/)**, built once here
and used by `game` (and any later app) instead of re-created markup
([ADR 0010](../../../docs/adr/0010-design-system-components.md)). It depends on `@atw/api` for
types only.

## The rules

- A component renders its design-system block with the same BEM classes (`block`,
  `block__element`, `block--modifier`). The end-to-end locators depend on them.
- Selector `atw-<name>`, class `<Name>`, in `src/lib/<name>/` as `<name>.ts`, `<name>.html` and
  `<name>.scss` (`templateUrl`/`styleUrl`, never inline), `ChangeDetectionStrategy.OnPush` and
  default encapsulation.
- Inputs and outputs only: no injected app service, token or router. A page or dialog that
  orchestrates stays in the app.
- The stylesheet holds the block's rules from
  [`docs/design-system/assets/components.css`](../../../docs/design-system/assets/components.css)
  and reads tokens by role (`var(--color-…)`), never hex. It never styles another block.
- A state assistive technology must know is an attribute (`aria-pressed`, `aria-current`,
  `aria-invalid`, `disabled`) and is styled through it. Touch targets are at least 44 x 44 px.
- Logic with many cases goes in a helper with its unit test, not in the component.

## Adding a component

1. Read its design-system page: anatomy, variants, states, accessibility and code.
2. `npx ng generate component <name> --project components --path projects/components/src/lib`
   from `frontend/`, then keep the BEM markup of the page's _Code_ section.
3. Export it from `src/public-api.ts` and import it from `@atw/components` in the screen.
4. Mark it built below, with the screen that first used it.

## Mapping

| Design-system page                                                           | Group        | Selector             | Component                                    | Status                |
| ---------------------------------------------------------------------------- | ------------ | -------------------- | -------------------------------------------- | --------------------- |
| [Toy button](../../../docs/design-system/components/toy-button.html)         | Actions      | `atw-toy-button`     |                                              | Not built             |
| [Icon button](../../../docs/design-system/components/icon-button.html)       | Actions      | `atw-icon-button`    |                                              | Not built             |
| [Text button](../../../docs/design-system/components/text-button.html)       | Actions      | `atw-text-button`    |                                              | Not built             |
| [Kid chip](../../../docs/design-system/components/kid-chip.html)             | Actions      | `atw-kid-chip`       |                                              | Not built             |
| [Top bar](../../../docs/design-system/components/top-bar.html)               | Navigation   | `atw-top-bar`        |                                              | Not built             |
| [Skip link](../../../docs/design-system/components/skip-link.html)           | Navigation   | `atw-skip-link`      | [`SkipLink`](src/lib/skip-link/skip-link.ts) | Built (the app shell) |
| [Screen and stack](../../../docs/design-system/components/screen.html)       | Layout       | `atw-screen`         |                                              | Not built             |
| [Panel](../../../docs/design-system/components/panel.html)                   | Containers   | `atw-panel`          |                                              | Not built             |
| [Dialog](../../../docs/design-system/components/dialog.html)                 | Containers   | `atw-dialog`         |                                              | Not built             |
| [Portrait](../../../docs/design-system/components/portrait.html)             | The cast     | `atw-portrait`       |                                              | Not built             |
| [Kid tag](../../../docs/design-system/components/kid-tag.html)               | The cast     | `atw-kid-tag`        |                                              | Not built             |
| [Badge](../../../docs/design-system/components/badge.html)                   | The cast     | `atw-badge`          |                                              | Not built             |
| [Nickname](../../../docs/design-system/components/nickname.html)             | The cast     | `atw-nickname`       |                                              | Not built             |
| [Pill](../../../docs/design-system/components/pill.html)                     | Data display | `atw-pill`           |                                              | Not built             |
| [Summary](../../../docs/design-system/components/summary.html)               | Data display | `atw-summary`        |                                              | Not built             |
| [Kid picker](../../../docs/design-system/components/kid-picker.html)         | Choices      | `atw-kid-picker`     |                                              | Not built             |
| [Mode card](../../../docs/design-system/components/mode-card.html)           | Choices      | `atw-mode-card`      |                                              | Not built             |
| [Toggle chip](../../../docs/design-system/components/toggle-chip.html)       | Choices      | `atw-toggle-chip`    |                                              | Not built             |
| [Table key](../../../docs/design-system/components/table-key.html)           | Choices      | `atw-table-key`      |                                              | Not built             |
| [Choice](../../../docs/design-system/components/choice.html)                 | Choices      | `atw-choice`         |                                              | Not built             |
| [Segmented choice](../../../docs/design-system/components/segmented.html)    | Choices      | `atw-segmented`      |                                              | Not built             |
| [Switch](../../../docs/design-system/components/switch.html)                 | Choices      | `atw-switch`         |                                              | Not built             |
| [Code letters](../../../docs/design-system/components/code-letters.html)     | Rooms        | `atw-code-letters`   |                                              | Not built             |
| [Code field](../../../docs/design-system/components/code-field.html)         | Rooms        | `atw-code-field`     |                                              | Not built             |
| [Room code](../../../docs/design-system/components/room-code.html)           | Rooms        | `atw-room-code`      |                                              | Not built             |
| [Player card](../../../docs/design-system/components/player-card.html)       | Rooms        | `atw-player-card`    |                                              | Not built             |
| [Field message](../../../docs/design-system/components/field-message.html)   | Feedback     | `atw-field-message`  |                                              | Not built             |
| [Status overlay](../../../docs/design-system/components/status-overlay.html) | Feedback     | `atw-status-overlay` |                                              | Not built             |
| [Alert and banner](../../../docs/design-system/components/alert.html)        | Feedback     | `atw-alert`          |                                              | Not built             |
| [Toast](../../../docs/design-system/components/toast.html)                   | Feedback     | `atw-toast`          |                                              | Not built             |
| [Spinner](../../../docs/design-system/components/spinner.html)               | Feedback     | `atw-spinner`        |                                              | Not built             |
| [Skeleton](../../../docs/design-system/components/skeleton.html)             | Feedback     | `atw-skeleton`       |                                              | Not built             |
| [Notice](../../../docs/design-system/components/notice.html)                 | Feedback     | `atw-notice`         |                                              | Not built             |
| [Listener](../../../docs/design-system/components/listener.html)             | Voice        | `atw-listener`       |                                              | Not built             |
| [Level meter](../../../docs/design-system/components/level-meter.html)       | Voice        | `atw-level-meter`    |                                              | Not built             |
| [Duel HUD](../../../docs/design-system/components/duel-hud.html)             | Duel         | `atw-duel-hud`       |                                              | Not built             |
| [Timer bar](../../../docs/design-system/components/timer-bar.html)           | Duel         | `atw-timer-bar`      |                                              | Not built             |
| [World ring](../../../docs/design-system/components/world-ring.html)         | Duel         | `atw-world-ring`     |                                              | Not built             |
| [Flash card](../../../docs/design-system/components/flash-card.html)         | Duel         | `atw-flash-card`     |                                              | Not built             |
| [Number pad](../../../docs/design-system/components/number-pad.html)         | Duel         | `atw-number-pad`     |                                              | Not built             |
| [Stamp card](../../../docs/design-system/components/stamp-card.html)         | Duel         | `atw-stamp-card`     |                                              | Not built             |
| [Sticker](../../../docs/design-system/components/sticker.html)               | Duel         | `atw-sticker`        |                                              | Not built             |
| [World Map room](../../../docs/design-system/components/world-map.html)      | World Map    | `atw-world-map`      |                                              | Not built             |
| [Map message](../../../docs/design-system/components/map-toast.html)         | World Map    | `atw-map-toast`      |                                              | Not built             |
| [Standings](../../../docs/design-system/components/standings.html)           | World Map    | `atw-standings`      |                                              | Not built             |
| [Podium](../../../docs/design-system/components/podium.html)                 | Podium       | `atw-podium`         |                                              | Not built             |
| [Passport](../../../docs/design-system/components/passport.html)             | Podium       | `atw-passport`       |                                              | Not built             |
