# Around the World design system

Extracted from [docs/mocks](../mocks/README.md) on 2026-11-26. Open [index.html](index.html) locally.

The mocks are the source of truth for the interface; this is what they share, written down once.
The mocks read these files (`docs/mocks/assets/tokens.css` and `ui.css` only import them), so a
change here changes every mock.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Light sky blue backgrounds, white panels and navy text, with one bright colour for each kid. |
| [Typography](foundations/typography.html) | Fredoka for numbers, names and buttons; Nunito for sentences. |
| [Spacing](foundations/spacing.html) | A 4px scale from 0 to 96px. |
| [Layout](foundations/layout.html) | Five sizes from extra small to extra large, a page that is one column until 992px, and two screens that fill the window and never scroll. |
| [Elevation](foundations/elevation.html) | Things rise in two ways: a soft shadow for what floats, and a solid ledge for what you can press. |
| [Shape](foundations/shape.html) | Everything is round. |
| [Motion](foundations/motion.html) | The hop is the reward and lasts about a second. |
| [Iconography](foundations/iconography.html) | Round line icons on a 24-unit grid with a 2.5px stroke, in the colour of the text beside them. |
| [Theming](foundations/theming.html) | Three tiers of tokens, two themes, one file that holds every value. |
| [Responsive](foundations/responsive.html) | Every screen works from the narrowest phone to the widest desktop, and Duel fills the screen at all of them. |
| [Accessibility](foundations/accessibility.html) | WCAG 2.2 AA, for children: playable by touch and by keyboard, never by colour alone. |
| [Content](foundations/content.html) | Short, warm and plain: the words a ten-year-old would say across a classroom. |

## Components

47 components, one page each, with the same thirteen sections: overview, anatomy, variants, sizes,
states, responsive behaviour, theming, accessibility, content, do and don't, tokens, code and
sources. Each is one BEM block and becomes one component in the Angular `components` library.

| Component | Group | Variants | States shown | Source mocks |
|---|---|---|---|---|
| [Toy button](components/toy-button.html) | Actions | Play, friends, solo, go, paper; Block: fills its column | Default, Hover, Focus, Active, Disabled, Busy | `home`, `lobby`, `mic-check`, `podium`, `solo-or-friends` |
| [Icon button](components/icon-button.html) | Actions | On a screen; On the room code | Default, Hover, Focus, Active, Disabled, Pressed (muted) | `duel`, `home`, `lobby` |
| [Text button](components/text-button.html) | Actions | Plain, with an icon, and as a pill | Default, Hover, Focus, Active, Disabled | `duel`, `game-setup`, `lobby`, `mic-check` |
| [Kid chip](components/kid-chip.html) | Actions | One look | Default, Hover, Focus | `home` |
| [Top bar](components/top-bar.html) | Navigation | With Back; Without Back | Default, Long title | `game-setup`, `lobby`, `mic-check`, `pick-your-kid`, `room` |
| [Skip link](components/skip-link.html) | Navigation | One look | Focused | `home` |
| [Screen and stack](components/screen.html) | Layout | Split (1.1 : 1), side (352px : rest), wide first (1.25 : 1); Stack and cluster | Scrolls, Fills | `duel`, `game-setup`, `lobby`, `pick-your-kid` |
| [Panel](components/panel.html) | Containers | Default, small, tint and floating | Default, With a head | `game-setup`, `lobby`, `pick-your-kid` |
| [Dialog](components/dialog.html) | Containers | Leave Game: the game goes on without you | Open, Busy | `leave-game`, `pause`, `settings` |
| [Portrait](components/portrait.html) | The cast | The five kids; Round, with a ring, and stacked; When the picture cannot load: the drawn kid | Loaded, Loading, Failed | `duel`, `pick-your-kid`, `solo-or-friends` |
| [Kid tag](components/kid-tag.html) | The cast | The five kids, a classmate, and you | Tag | `world-map` |
| [Badge](components/badge.html) | The cast | Host and You | Badge | `lobby` |
| [Nickname](components/nickname.html) | The cast | One look | Default, Rolled, Longest | `pick-your-kid` |
| [Pill](components/pill.html) | Data display | On a surface and inverse | Pill | `duel` |
| [Summary](components/summary.html) | Data display | One look | Defaults, Changed | `lobby` |
| [Kid picker](components/kid-picker.html) | Choices | One look | Zuri chosen, Kenji hovered, Kenji focused, Pip chosen | `pick-your-kid` |
| [Mode card](components/mode-card.html) | Choices | One look | Default, Busy, Offline | `solo-or-friends` |
| [Toggle chip](components/toggle-chip.html) | Choices | The four kinds, Times on | Default, Hover, Focus, Active, Disabled | `game-setup` |
| [Table key](components/table-key.html) | Choices | The grid with 2 to 10 on | Default, Hover, Focus, Active, Disabled | `game-setup` |
| [Choice](components/choice.html) | Choices | 6, 12 and 24 desks | Default, Hover, Focus, Active, Disabled | `game-setup` |
| [Segmented choice](components/segmented.html) | Choices | One look | Normal chosen, Chill hovered, Chill focused, Lightning chosen | `game-setup` |
| [Switch](components/switch.html) | Choices | One look | Default, Hover, Focus, Disabled | `settings` |
| [Code letters](components/code-letters.html) | Rooms | One look | Example | `solo-or-friends` |
| [Code field](components/code-field.html) | Rooms | One look | Empty, Typing, Focus, Full, Invalid, Joining | `room` |
| [Room code](components/room-code.html) | Rooms | One look | Default | `lobby` |
| [Player card](components/player-card.html) | Rooms | Host and you, another player, an empty desk | Player, Host, You, Empty, Loading | `lobby` |
| [Field message](components/field-message.html) | Feedback | Status and error | Empty, Status, Error | `room` |
| [Status overlay](components/status-overlay.html) | Feedback | Waiting, and over | Reconnecting, Lost | `duel` |
| [Alert and banner](components/alert.html) | Feedback | Info, success, warning, danger; Banner | With an action, Without | `connection-banner`, `game-setup`, `home`, `solo-or-friends` |
| [Toast](components/toast.html) | Feedback | Info, success, warning, danger | Shown, With an action | `lobby-toast` |
| [Spinner](components/spinner.html) | Feedback | In a busy button | Turning, Reduced motion | `leave-game`, `game-setup`, `room`, `solo-or-friends` |
| [Skeleton](components/skeleton.html) | Feedback | Text, title, block, round, panel | On the page, On a panel | `game-setup`, `home`, `lobby`, `pick-your-kid`, `podium`, `world-map` |
| [Notice](components/notice.html) | Feedback | Not found, and something went wrong | Shown | `not-found`, `something-went-wrong` |
| [Listener](components/listener.html) | Voice | Asking, listening, heard, mic off | Asking, Listening, Heard, Mic off | `mic-check` |
| [Level meter](components/level-meter.html) | Voice | On Mic Check and in “Shout it!” | Moving, Reduced motion | `duel`, `mic-check` |
| [Duel HUD](components/duel-hud.html) | Duel | Solo: “You” and a kid’s name; Watching: two nicknames | Card running, Clock stopped | `duel` |
| [Timer bar](components/timer-bar.html) | Duel | In each kid’s colour | Full, Draining, Nearly out, Stopped | `duel` |
| [World ring](components/world-ring.html) | Duel | 6, 12 and 24 desks | Start, Middle, Last desk | `duel` |
| [Flash card](components/flash-card.html) | Duel | Answer by voice, and with the number pad; Watching, and time up | Waiting, Typed, Right, Frozen, Lost | `duel` |
| [Number pad](components/number-pad.html) | Duel | One look | Default, 5 hovered, 5 focused, 5 pressed, Frozen | `duel` |
| [Stamp card](components/stamp-card.html) | Duel | One look | Stamped, Reduced motion | `duel` |
| [Sticker](components/sticker.html) | Duel | The six stickers; A sticker arriving | Default, Hover, Focus, Active, Disabled | `sticker`, `duel` |
| [World Map room](components/world-map.html) | World Map | The five kids as beans, and a classmate | You travelling, You sitting | `world-map` |
| [Map message](components/map-toast.html) | World Map | Walks on, you walk on, you sit | Shown | `map-toast` |
| [Standings](components/standings.html) | World Map | One look | Mid tour, You lead | `world-map` |
| [Podium](components/podium.html) | Podium | Three places, and two | You won, You came second, Loading | `podium` |
| [Passport](components/passport.html) | Podium | 12 desks, and 24 | Some, All, Few | `podium` |

## Patterns

| Pattern | Covers |
|---|---|
| [Choices and the code field](patterns/forms.html) | How a child sets things up: toggles and choices that take effect at once, and the one field in the game. |
| [Feedback and loading](patterns/feedback.html) | Which kind of answer the game gives to what just happened, and what shows while something arrives. |
| [Empty and error states](patterns/empty-and-error.html) | What a screen shows when there is nothing yet, and when something has gone wrong. |
| [Navigation and screen structure](patterns/navigation.html) | Ten screens in a line. |
| [Dialogs and overlays](patterns/dialogs.html) | When the game stops to ask, and when it stops because it must. |
| [Lists: players, standings and stamps](patterns/lists.html) | The three collections in the game. |
| [Notifications](patterns/notifications.html) | The four kinds of passing message, and which one a moment gets. |
| [Content and tone](patterns/content-and-tone.html) | How the game speaks at each moment of a tour. |

## Tokens

- [`tokens/tokens.css`](tokens/tokens.css): the source of truth. Primitives, semantic tokens, light and dark.
- [`tokens/tokens.json`](tokens/tokens.json): the same tokens in the Design Tokens (DTCG) format. Generated; do not edit.
- [`tokens/contrast-pairs.json`](tokens/contrast-pairs.json): every text and edge pairing a component relies on, checked in both themes.
- [`assets/components.css`](assets/components.css): the component styles. No colour is written in it.
- `assets/fonts/`: Fredoka and Nunito (SIL Open Font License), bundled.

## What is not here, and why

The skill's catalog lists a core set every product is expected to have. These are left out on
purpose, because the game must not have them (`AGENTS.md`: no accounts, no free-text, ten
screens and no more):

| Left out | Why |
|---|---|
| Text field, textarea, select, combobox, checkbox, radio, date picker, file upload | Nothing a child types leaves the device, and nothing is typed but a room code. Choices are toggles. |
| Table, pagination, breadcrumb, tabs, sidebar, menu, command palette | Ten screens in a line; no collection is longer than 24. |
| Tooltip, popover | Nothing depends on hover; every control says what it does. |
| Avatar with initials | A player is a kid and a generated nickname, never initials of a real name. |

## Drift found in the mocks

| Mock | Issue | Resolution |
|---|---|---|
| Every screen with a portrait | `<img>` portraits stretched tall: the `height` attribute beat `aspect-ratio`. | `.portrait` sets `height: auto`. |
| `pages/lobby/*` | Nicknames were cut with an ellipsis at four cards across. | Names wrap. |
| `pages/duel/*` on a phone | Duellists' names were cut to three letters. | Names are 14px and wrap; portraits are 36px under 360px. |
| `pages/duel/watching` | The sticker bar scrolled sideways and hid the sixth sticker. | It wraps: 2, 3, then 6 across. |
| `pages/duel/*` at 844 × 390 | Duel scrolled: a minimum height of 480px. | Removed; the ring gives way to text under 544px tall. |
| `pages/game-setup/*` | The chosen tour length was marked by an underline under "desks". | A dot, as on the table keys. |
| `pages/world-map/*` | A classmate held Italy on the map while Nia held it on Duel. | Nia holds the desk the child duels at. |
| 12 mocks | Inline layout styles (`margin-top`, `gap`, `text-align`, widths). | Helper classes: `.stack--narrow`, `.stack--flush`, `.hint--center`, `.cluster--tight` and others. |
| `pages/mic-check/listening`, `pages/duel/default` | A raw `animation-delay` on each level-meter bar. | The stagger is in the component, from `--duration-pulse`. |
| `ui.css` | Raw durations: 1.4s, 0.8s, 0.6s. | `--duration-sweep`, `--duration-spin`, `--duration-pulse`. |
| Dark theme | Blue and green button faces and the chosen table's edge were under 3 to 1 against a dark panel. | `--palette-blue-550` and `--palette-green-600` for dark; the table's edge is amber 500 in dark. |
| Light theme | Warning and danger icons were under 3 to 1 on their tints. | Amber 700 and red 600. |

Still open: component geometry (a portrait's 56px, the listener's 224px) is written in rem in
`components.css` rather than as tokens, and a `data-theme="light"` island inside a dark page
does not switch back to light, because light lives on `:root`. Where the mocks depart from the
prototype is recorded in the [mocks' README](../mocks/README.md).

## Verification

Run on 2026-11-26:

| Check | Command | Result |
|---|---|---|
| Structure | `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system` | 68 pages (47 components, 8 patterns), 0 errors, 0 warnings |
| Contrast, light and dark | `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css` | 154 passed, 0 failed, 0 unresolved |
| Token export | `python .claude/skills/extracting-design-systems/scripts/tokens_to_json.py docs/design-system/tokens/tokens.css` | docs/design-system/tokens/tokens.json (357 tokens) |
| Mocks, reading the system's files | `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` | 19 screens, 106 mocks, 0 errors, 0 warnings |

Looked at in Chromium: every page at 360px and 1280px for sideways scroll, broken pictures and
failing live contrast ratios (none); `index.html`, Color, Toy button, Flash card and Kid picker
in both themes by eye. The mocks were re-screenshotted at 360, 768 and 1280px after they were
pointed at these files.

