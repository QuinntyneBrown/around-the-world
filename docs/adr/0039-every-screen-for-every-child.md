# 0039. Every screen for every child: the sweeps, axe-core, named breakpoints, Duel on a short phone and the fixes the sweeps found

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

Journey 19 checks every built screen, dialog and notification against its mocks at every width
and against WCAG 2.2 AA (`L2-050`, `L2-051`), and fixes what is off.
`docs/detailed-designs/platform/show-every-screen-to-everyone/` left the checking tool of the
accessibility sweep to supply, and described parts (`Viewport`, `LiveRegion`, `AlertMessage`,
`ChoiceButton`, `duelAnnouncement`, `messageForCode`, a `breakpoints` partial) that journeys 02
to 18 built under other names or did without. `AGENTS.md` asks for visual, responsive and
accessibility sweeps that are written and kept current but run only when a person asks; ADR
0006 gives them Playwright projects of their own.

The sweeps, run once for this journey, found:

1. Duel on a phone 320 × 568 px held upright had no height to spare: a frozen card (its line
   under the answer box), a connection banner across the top, or a friend's two-word nickname
   pushed the pad under "Shout instead" and the flash card over the line of text. The
   prototype's own mock overlapped the same way.
2. The duel strip broke "Cosmic Llama" inside its words under 360 px: the design system's
   smaller portrait for the narrowest phones (`.duelist .portrait`) was never built.
3. At 200% zoom of a 1280 × 800 screen (640 × 400 px) with a banner, Duel's footer took the
   height the pad needs beside the card.
4. On a tablet, "Join a room" stuck out of its card: the two friend actions shared a row from
   576 px, also where the card is beside its twin and about 170 px wide inside.
5. A country's name on a passport stamp was white on white at 12% over the passport's blue:
   4.07 to 1. The contrast check measured the passport, not the stamp's tile.

The behaviour specs written for keyboard paths found two more:

6. "Skip to the game" followed its `#main` address, which `<base href="/">` resolves to the
   root: on every screen but Home it opened Home.
7. Typing the four letters of a code and pressing Enter at once joined nothing: Enter read the
   code field's `value` input, which the page had not yet passed back.

## Decision

**The checking tool is axe-core** (4.14, through `@axe-core/playwright`, a dev dependency).
The accessibility sweep runs it with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and
`wcag22aa` on every state, on a desktop (1280 × 800) and a phone (360 × 800), once the page's
entrances have finished; adds the game's own 44 × 44 px target check, which is stricter than
WCAG 2.5.8's 24 px; and lays the page out at 640 × 400 px for 200% zoom of a 1280 × 800 screen,
where nothing may be lost or scroll sideways. axe is injected into the page by Playwright; it
fetches nothing.

**Three sweeps, one registry.** `frontend/e2e/support/screens.ts` lists each state of
`docs/mocks/manifest.json` the game can be brought to (29 states of the 10 screens, 3 dialogs
and 4 kinds of message, the ones a solo game, a host, a guest and a watching player reach), and
how to reach it through the page objects and the shared fixture. `playwright.sweeps.config.ts`
holds three projects over `frontend/e2e/sweeps/`, run by `npm run e2e:sweeps` and never by
`verify.mjs` or CI:

- **responsive**: each state at 320 × 568, 360 × 800, 576, 768, 992, 1200, 844 × 390 and
  1920 × 1080; fails on a page that scrolls sideways, Duel or World Map scrolling at all, a
  control or text cut off at the viewport's edge or inside its own box, a control sticking out
  of its panel, and a control overlapping text or another control. A message (a toast, a
  received sticker) is a live region placed over the screen: it is measured against itself,
  and the specs of journeys 13 to 16 prove it never covers the flash card (ADR 0035). A
  disabled control (the frozen pad) is not a target.
- **accessibility**: as above.
- **visual**: each state photographed at every size beside its mock (`?chrome=0`, served from
  `docs/` on localhost), saved to `test-results/` and attached to the report. It keeps no pixel
  baseline: the game draws the 3D classroom where the mocks show a still picture, so a person
  compares the pairs by eye. There is therefore no baseline to update.

**What runs by default.** `frontend/e2e/specs/every-screen-for-every-child.spec.ts` holds the
behaviour of `L2-050` and `L2-051` a child meets: for each of the 29 states, every control at
least 44 × 44 px on a phone and Tab reaching every control in the page's order with the focus
ring drawn and in view; for each screen, "Skip to the game" first and taking the focus into the
main part; a whole solo tour and a friend's join, duel and Leave by keyboard alone (the solo
tour is the `@critical` spec CI runs); and Duel whole on the narrowest phone.

**Named breakpoints.** `frontend/projects/components/src/styles/_breakpoints.scss` names the
four widths (`sm` 36, `md` 48, `lg` 62, `xl` 75 rem), the narrowest phones (under 22.5 rem) and
Duel's two heights (`low` 42 rem, `short` 34 rem), with the mixins `from`, `below`, `between`,
`height` and `narrow-phone`. Every stylesheet in `components` and `game` uses them
(`@use 'breakpoints' as bp`), found through `stylePreprocessorOptions.includePaths` of `game`'s
build, which the libraries' unit tests share. A media query cannot read the tokens
`--layout-breakpoint-*`, so the partial repeats their values once. The build's CSS was
compared before and after: the same queries, one with its two conditions in the other order.

**No `Viewport` contract.** Every width-driven difference the screens draw is CSS: the world
ring is hidden below 768 px and the line of text from 768 px, as the design system's CSS has
it, and the ring is a small SVG with no work of its own. The one difference CSS cannot make,
the 3D classroom's zoom on World Map, reads one `matchMedia` in `ClassroomCanvas` (ADR 0028).
A contract and a service for one query would be more code than the query.

**The design's other parts, as built.** The live regions are visually hidden `role="status"`
paragraphs on each page (assertive on Duel) and the polite regions of `ToastRegion`,
`StickerRegion` and `MapToast`; errors are shown through `Alert` (`role="alert"` for a refusal),
`StatusOverlay` and `FieldMessage`; pressed state is carried by the group components `Choices`,
`ToggleChips`, `TableKeys`, `Segmented` and `KidPicker` (lesson 03-3); Duel's words, its
announcement included, are `DuelWords` in `pages/duel/duel-words.ts`; a refusal's words are
`roomRefusal` and `joinRefusal`.

**Duel on a short phone held upright** (under 768 px wide and at most 672 px tall): the flash
card is tighter (sum 48 px, padding 8 px) and the keys 4 px apart, still 44 px tall; while
frozen, the line "Not {answer}! Frozen for a sec…" takes the answer box's place, since it names
the wrong answer and the box is already hidden from assistive technology then; a connection
banner shows its title only (`banner__text` is visually hidden, still read out) and the line of
text gives way to it (`duel--banner`), while the duel strip still names the country ("Holds
Egypt"). Under 360 px the duellists' portraits are 36 px, as the design system draws them.

**Duel on a phone on its side** (at most 544 px tall) with the pad beside the card
(`duel--pad`): the card and the pad stand at the top of the stage and "Shout instead" sits under
the card, beside the pad, out of the flow, so the footer takes none of the pad's height.

**The other fixes.** The two friend actions share a row where the card has room for both
(`repeat(auto-fit, minmax(10rem, 1fr))`) and stack where it has not.
`--color-passport-slot` is `blue-700` (6.94 to 1 with white), and the pair is in
`contrast-pairs.json`. `SkipLink` moves the focus to its target itself (giving it
`tabindex="-1"`) and does not follow the link; `main[tabindex="-1"]:focus` draws no ring, since
the main part is a landmark and the next Tab rings its first control. `CodeField` reads the
field itself on Enter.

Each change was made in `@atw/components` or the page that lays Duel out, and in
`docs/design-system/assets/components.css`, so the mocks draw it; `docs/mocks/README.md` records
the departures (21 to 24).

## Consequences

The budgets hold: the initial total is 274.39 kB (main grew 0.22 kB for the skip link's
handler), Home's chunk 9.51 kB, and no component stylesheet reaches 3.5 kB. A screen added
later joins the sweeps by one entry in `screens.ts`; the default run then checks its targets,
its Tab order and its skip link too. The sweeps take about a minute and a half each on four
workers. Duel on a phone 320 × 568 px with a banner fits with 3 px to spare: a taller duel
strip there would need another trade. A short phone held upright no longer tells "desk {n} of
{tour length}" while a banner shows, which `L2-050` criterion 7 now says. The design system's
breakpoints live twice, as tokens and in the partial; a change to one is made in both.
