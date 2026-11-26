# Around the World mocks

Static HTML mocks for every page, dialog and notification of Around the World, in every state.
They are transcribed from the **Around The World** prototype in Magic Patterns (the frames Home,
Pick Your Kid, Solo Or Friends, Room, Lobby, Game Setup, Mic Check, Duel, World Map and Podium),
with the *Character Sheet* prototype and the *Around The World Game Plan* as context, and they
are the source of truth for the interface: `docs/specs/`, the ADRs, `docs/detailed-designs/` and
the code follow them.

<!--
CAST AND CATALOG: reuse these in every mock.

The child at the device: nickname "Speedy Otter", playing as Zuri. Room code BOLT.

The five kids (one colour each):
  Zuri   yellow  "First to shout it!"       raises her pencil like a knight
  Kenji  blue    "Collects every country"   adds a pin and pushes up his glasses
  Nia    red     "Fastest feet in class"    does a star jump
  Milo   green   "Quiet. Then BOOM."        Bolt, his robot, does a happy spin
  Pip    purple  "Flies to every desk"      launches the paper plane

The room, in the order they joined (nickname, kid):
  Speedy Otter (Zuri, host) · Cosmic Llama (Nia) · Jolly Gecko (Milo) · Turbo Panda (Kenji) ·
  Brave Narwhal (Pip) · Zippy Fox (Nia) · Clever Koala (Kenji) · Mighty Yak (Zuri)

The tour: 12 desks, Normal speed (6 seconds a card), Times with tables 2 to 10.
Desks in order: France, Egypt, Japan, UK, Italy, USA, Brazil, India, Kenya, China, Australia,
Peru, then Mexico, Norway, Greece, Canada, Spain, Russia, Thailand, Turkey, Morocco, Iceland,
Korea, Chile for a tour of 24.

"Now": the child is the traveller at desk 5 of 12 (Italy, held by Nia), next stop USA (Statue
of Liberty). The flash card is 6 × 4. Standings: Kenji 5, You 4, Nia 3, Milo 2, Pip 1.

The six stickers: Go! (Zuri) · Wow! (Nia) · Nice one (Kenji) · So close (Milo) ·
Whoosh! (Pip) · Beep boop! (Bolt).
-->

## Open the mocks

Open [index.html](index.html) from disk; nothing needs a server or a network. Every mock has a
bar at the bottom that links its sibling states and switches the theme.

- `?theme=dark` or `?theme=light` forces a theme; the `t` key switches it.
- `?chrome=0` hides the bar and the yellow notes, leaving the screen as the product shows it.

## What is here

| Folder | What it holds |
|---|---|
| `assets/tokens.css`, `assets/ui.css` | Two one-line files that import the design system's `tokens/tokens.css` and `assets/components.css`. Every colour, size and component lives there: see [docs/design-system](../design-system/README.md). |
| `assets/img/` | The cast's portraits and the two classroom pictures from the prototype, resized. |
| `assets/mock.css`, `assets/mock.js` | The mock bar and notes. Not product UI. |
| `pages/`, `dialogs/`, `notifications/` | One file per screen per state, listed in `manifest.json`. |

The words are the specs' words: kid, nickname, tour, desk, country, traveller, desk holder,
flash card, duel, hop, room, code, host, classmates, sticker, passport, stamp.

## Where the mocks depart from the prototype, and why

| # | The prototype | The mocks | Why |
|---|---|---|---|
| 1 | The button faces are the bright cast colours with white labels (tomato `#ff4f6d`, sky `#1e9bff`, leaf `#22c768`). | The faces are the deeper shade of each (`#d92e4f`, `#0a6fd1`, `#0e7a3c`); "Play solo" keeps bright yellow with navy text. | White on the bright sky and leaf is under 3:1 and on tomato 3.2:1. WCAG 2.2 AA needs 4.5:1 for a label (L2-051). The bright colours stay for marks: ring dots, the timer bar, picture backgrounds. |
| 2 | A name tag is the kid's bright colour with white text (navy on yellow). | A tag uses a tag pair per kid: the deep shade with white text, yellow with navy. | The same contrast rule. A kid's colour never carries a state alone: the name is always written (L2-037). |
| 3 | The number pad sits beside the flash card from 1024px. | It sits beside the card from 768px. | `AGENTS.md`: under the card on a phone, beside it on a tablet and wider. L2-050 (2) now says 768px too. |
| 4 | Five stickers. | Six: Bolt's "Beep boop!" is added. | The requirements and `AGENTS.md` say six stickers (L2-028). The sixth and its words are an assumption; see the open questions. |
| 5 | Pause goes straight Home. | Pause opens a dialog: "Keep playing" or "Go home". In a game with friends it is Leave, which asks first. | L2-033 (4). |
| 6 | The Settings button does nothing. | It opens a Settings dialog with two switches: Sound, and Answer by shouting. | L2-032 names the button; L2-015 lists what is kept on the device. Nothing else is offered. |
| 7 | The breakpoints are Tailwind's (640, 768, 1024, 1280). | 576, 768, 992 and 1200. | L1-015 names the five sizes. |
| 8 | The selected kid, kind of maths, table, tour length and card speed are shown by colour. | Each also has a tick or a dot, and `aria-pressed`. | Colour is never the only carrier of a state (L2-051). |
| 9 | Portraits and scenes load from a CDN, and fonts from Google Fonts. | They are files in `assets/`. | No network beyond localhost; fonts are bundled and self-hosted. |
| 10 | On World Map each kid is a detailed walking figure (`Kid.tsx`). | Each is the simpler bean-bodied piece (`Bean.tsx`) with the kid's one accessory. | `AGENTS.md`: on the World Map each is a small bean-bodied character. The walk is an animation for the detailed design, not a mock. |
| 11 | The losing line is a button inside the card. | The same words on a quiet pill that leads to World Map. | It is the only action after losing, and it must not look like a second answer. |
| 12 | No dark theme. | A dark theme built from the same roles (a night classroom). | The mock set is themed through tokens in light and dark. Whether the game ships dark is an open question; the light theme is the design. |
| 13 | The player list marks you by position. | "(you)" in words, and "You" in the standings with an outline. | L2-024, L2-034 (6). |
| 14 | The flash card's sum and answer box are plain text. | Each is `role="img"` named in words ("6 times 4", "Your answer: 24"). | ARIA does not let a paragraph or a plain `div` be named, so the names were lost (L2-051). |
| 15 | The level meter and the rings move with the child's voice. | They pulse on their own while the device listens, and hold still under reduced motion. | Reading the voice's level would open a second microphone stream beside speech recognition; the words "Shout it!" and "Bolt is listening." carry the state (ADR 0025). |

States the prototype does not draw were added from the requirements: loading, errors, offline,
too many tries, a browser with no speech recognition, a flash card nobody answers, a lost room,
the last times table switched off (Game Setup `last-table`), a game with two players, a Duel with the child as the desk holder (`desk-holder`, and `kept` when they lose it), and the messages a Lobby, a World Map and a Duel show. Two players with the same distance travelled are listed in the order they reached it, during a tour as at its end (L2-006 criterion 3), so World Map `hop` lists Kenji, who reached 5 first, above the child.

## Open questions

1. **The sixth sticker.** Bolt's "Beep boop!" stands in. Which sticker, and whose?
2. **Settings.** Is a Settings dialog with Sound and Answer by shouting what the Settings button
   should open, or should the button go and sound stay as the one corner button? Until
   journey 10 builds sound, the built dialog shows "Answer by shouting" alone and Home's corner
   the settings button alone; the mocks draw the finished dialog and corner.
3. **Dark theme.** Keep it as an option that follows the device, or ship light only?
4. **Where the pad moves beside the card.** Settled: 768px, as `AGENTS.md` says. L2-050 (2) was
   brought in line with the mocks.
5. **A flash card nobody answers** (L2-005, to confirm): the mock says "Time's up! It was 24.
   Here comes a new card…" and nobody hops. Should the answer be shown?
6. **Time running out on a tour** (L2-006, decided in ADR 0024): the Podium says "Time's up!
   You travelled furthest!", or "Time's up! {name} travelled furthest!" when another player
   did. The time limit (3, 6 or 12 minutes) is not shown during a duel.
7. **Leaving the Lobby.** Back leaves the room with no question asked, since joining again
   costs four letters. Should the host be asked first?
8. **Body type.** The prototype sets body text in Nunito beside Fredoka; `AGENTS.md` names only
   Fredoka. The mocks keep Nunito for sentences.
9. **Play again in a game with friends** returns everyone to the Lobby (L2-035), but L2-027 (3)
   deletes the room after the Podium. The mock assumes the room lives until the last player
   leaves the Podium.

## Check and look

```sh
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks           # coverage and HTML checks
python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks --write   # also rebuild index.html and the table below
python .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks      # PNGs in docs/mocks/.cache/mocks (never committed)
```

## Coverage

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | played | muted | milo | renamed | submitting | rate-limited | offline | ready | invalid | full | started | guest | edited | friends | all-maths | easy | times-off | last-one | last-table | listening | not-heard | heard | denied | pad | pad-typed | right | wrong | wrong-pad | lost | kept | desk-holder | timeout | hop | watching | no-speech | voice-failed | long | reconnecting | sit | short | second | unplaced | time-up | two-players | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Home (`home`) | [✅](pages/home/default.html) | [✅](pages/home/loading.html) | [✅](pages/home/empty.html) | [✅](pages/home/error.html) | [✅](pages/home/played.html) | [✅](pages/home/muted.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-013`, `L2-015`, `L2-030`, `L2-031`, `L2-032`, `L2-036`, `L2-039` |
| Pick Your Kid (`pick-your-kid`) | [✅](pages/pick-your-kid/default.html) | [✅](pages/pick-your-kid/loading.html) | ➖ | [✅](pages/pick-your-kid/error.html) |  |  | [✅](pages/pick-your-kid/milo.html) | [✅](pages/pick-your-kid/renamed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-013`, `L2-014`, `L2-030`, `L2-037` |
| Solo Or Friends (`solo-or-friends`) | [✅](pages/solo-or-friends/default.html) | [✅](pages/solo-or-friends/loading.html) | ➖ | [✅](pages/solo-or-friends/error.html) |  |  |  |  | [✅](pages/solo-or-friends/submitting.html) | [✅](pages/solo-or-friends/rate-limited.html) | [✅](pages/solo-or-friends/offline.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-019`, `L2-022`, `L2-030`, `L2-045`, `L2-054` |
| Room (`room`) | [✅](pages/room/default.html) | [✅](pages/room/loading.html) | [✅](pages/room/empty.html) | [✅](pages/room/error.html) |  |  |  |  | [✅](pages/room/submitting.html) | [✅](pages/room/rate-limited.html) |  | [✅](pages/room/ready.html) | [✅](pages/room/invalid.html) | [✅](pages/room/full.html) | [✅](pages/room/started.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-023`, `L2-040`, `L2-045`, `L2-054` |
| Lobby (`lobby`) | [✅](pages/lobby/default.html) | [✅](pages/lobby/loading.html) | [✅](pages/lobby/empty.html) | [✅](pages/lobby/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/lobby/full.html) |  | [✅](pages/lobby/guest.html) | [✅](pages/lobby/edited.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-018`, `L2-024`, `L2-025`, `L2-029` |
| Game Setup (`game-setup`) | [✅](pages/game-setup/default.html) | [✅](pages/game-setup/loading.html) | ➖ | [✅](pages/game-setup/error.html) |  |  |  |  | [✅](pages/game-setup/submitting.html) |  |  |  |  |  |  |  |  | [✅](pages/game-setup/friends.html) | [✅](pages/game-setup/all-maths.html) | [✅](pages/game-setup/easy.html) | [✅](pages/game-setup/times-off.html) | [✅](pages/game-setup/last-one.html) | [✅](pages/game-setup/last-table.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-016`, `L2-017`, `L2-018` |
| Mic Check (`mic-check`) | [✅](pages/mic-check/default.html) | [✅](pages/mic-check/loading.html) | ➖ | [✅](pages/mic-check/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/mic-check/listening.html) | [✅](pages/mic-check/not-heard.html) | [✅](pages/mic-check/heard.html) | [✅](pages/mic-check/denied.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-012` |
| Duel (`duel`) | [✅](pages/duel/default.html) | [✅](pages/duel/loading.html) | ➖ | [✅](pages/duel/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/duel/friends.html) |  |  |  |  |  |  |  |  |  | [✅](pages/duel/pad.html) | [✅](pages/duel/pad-typed.html) | [✅](pages/duel/right.html) | [✅](pages/duel/wrong.html) | [✅](pages/duel/wrong-pad.html) | [✅](pages/duel/lost.html) | [✅](pages/duel/kept.html) | [✅](pages/duel/desk-holder.html) | [✅](pages/duel/timeout.html) | [✅](pages/duel/hop.html) | [✅](pages/duel/watching.html) | [✅](pages/duel/no-speech.html) | [✅](pages/duel/voice-failed.html) | [✅](pages/duel/long.html) | [✅](pages/duel/reconnecting.html) |  |  |  |  |  |  | `L2-001`, `L2-004`, `L2-005`, `L2-009`, `L2-010`, `L2-011`, `L2-028`, `L2-029`, `L2-033`, `L2-038`, `L2-050`, `L2-051` |
| World Map (`world-map`) | [✅](pages/world-map/default.html) | [✅](pages/world-map/loading.html) | ➖ | [✅](pages/world-map/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/world-map/desk-holder.html) |  | [✅](pages/world-map/hop.html) |  |  |  | [✅](pages/world-map/long.html) |  | [✅](pages/world-map/sit.html) | [✅](pages/world-map/short.html) |  |  |  |  | `L2-002`, `L2-003`, `L2-034`, `L2-037`, `L2-038` |
| Podium (`podium`) | [✅](pages/podium/default.html) | [✅](pages/podium/loading.html) | ➖ | [✅](pages/podium/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/podium/friends.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/podium/long.html) |  |  |  | [✅](pages/podium/second.html) | [✅](pages/podium/unplaced.html) | [✅](pages/podium/time-up.html) | [✅](pages/podium/two-players.html) | `L2-006`, `L2-035` |
| Not Found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-030` |
| Something Went Wrong (`something-went-wrong`) | [✅](pages/something-went-wrong/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-054` |

### Dialogs

| Screen | default | busy | invalid | muted | no-speech | Requirements |
|---|---|---|---|---|---|---|
| Pause (`pause`) | [✅](dialogs/pause/default.html) | ➖ | ➖ |  |  | `L2-033` |
| Leave Game (`leave-game`) | [✅](dialogs/leave-game/default.html) | [✅](dialogs/leave-game/busy.html) | ➖ |  |  | `L2-033` |
| Settings (`settings`) | [✅](dialogs/settings/default.html) | ➖ | ➖ | [✅](dialogs/settings/muted.html) | [✅](dialogs/settings/no-speech.html) | `L2-011`, `L2-015`, `L2-032`, `L2-039` |

### Notifications

| Screen | info | success | warning | danger | stacked | Requirements |
|---|---|---|---|---|---|---|
| Lobby Message (`lobby-toast`) | [✅](notifications/lobby-toast/info.html) | [✅](notifications/lobby-toast/success.html) | [✅](notifications/lobby-toast/warning.html) | [✅](notifications/lobby-toast/danger.html) | [✅](notifications/lobby-toast/stacked.html) | `L2-024`, `L2-025` |
| World Map Message (`map-toast`) | [✅](notifications/map-toast/info.html) | [✅](notifications/map-toast/success.html) | [✅](notifications/map-toast/warning.html) | ➖ |  | `L2-034`, `L2-038` |
| Sticker (`sticker`) | [✅](notifications/sticker/info.html) | ➖ | ➖ | ➖ | [✅](notifications/sticker/stacked.html) | `L2-028` |
| Connection Banner (`connection-banner`) | [✅](notifications/connection-banner/info.html) | [✅](notifications/connection-banner/success.html) | [✅](notifications/connection-banner/warning.html) | [✅](notifications/connection-banner/danger.html) |  | `L2-029` |

<!-- coverage:end -->
