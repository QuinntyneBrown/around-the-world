# Journeys

The journeys that could be implemented in Around the World, in the order to build them. Each is a
thin, end-to-end slice of the game that a child (or, for the first and the platform journeys, the
team) can see working. Journey 01 scaffolds the workspace that every other journey builds on.

- **Effort** is in days for one intermediate developer.
- **% complete** starts at 0% and is updated when a journey's slice finishes, as `AGENTS.md`
  (*Lessons learned and progress*) requires.
- Each journey links to its implementation prompt in [`prompts/`](prompts/), written with the
  `writing-feature-prompts` skill.

| # | Journey | Description | Effort (days) | % complete |
|---|---|---|---|---|
| 01 | [Scaffold the workspace](prompts/01-scaffold-the-workspace.md) | Angular and .NET workspaces, test fixtures, verify script and CI pipeline. | 5 | 100% |
| 02 | [Start from Home and pick a kid](prompts/02-start-and-pick-a-kid.md) | Home's Play button, pick one of five kids, get a generated nickname. | 3 | 100% |
| 03 | [Choose solo and set up the game](prompts/03-choose-solo-and-set-up.md) | Solo Or Friends choice, then maths, tables, tour length and speed. | 3 | 100% |
| 04 | [Play a solo duel with the number pad](prompts/04-play-a-solo-duel.md) | Flash cards, classmates from profiles, first correct answer wins, wrong answers freeze. | 6 | 100% |
| 05 | [Hop round the ring on the World Map](prompts/05-hop-round-the-ring.md) | Winners hop to the next desk, losers sit, the map shows everyone. | 4 | 100% |
| 06 | [Finish the tour on the Podium](prompts/06-finish-on-the-podium.md) | Tour ends round the ring or on time; podium and passport. | 3 | 100% |
| 07 | [Shout answers after the Mic Check](prompts/07-answer-by-voice.md) | Mic Check, spoken answers, and switching between voice and number pad. | 5 | 100% |
| 08 | [Pause, leave and find the way back](prompts/08-pause-leave-and-recover.md) | Pause and leave dialogs, Back, Not Found and Something Went Wrong. | 3 | 100% |
| 09 | [Draw the 3D classroom and its cast](prompts/09-draw-the-classroom.md) | Three.js classroom of country desks and animated kids, cheap on low power. | 8 | 100% |
| 10 | [Feel the hop with motion and sound](prompts/10-motion-and-sound.md) | Hop and card flip animations, gentle losing, sounds, mute, reduced motion. | 4 | 100% |
| 11 | [Let Gemini Nano drive the classmates](prompts/11-classmates-with-gemini-nano.md) | On-device model picks classmates' answers and timing; profiles stay the fallback. | 3 | 100% |
| 12 | [Make a room as host](prompts/12-make-a-room.md) | Make a room with a 4-letter code and open the Lobby. | 5 | 100% |
| 13 | [Join a room and wait in the Lobby](prompts/13-join-and-wait-in-lobby.md) | Type a code, join friends, and watch the desks fill live. | 5 | 100% |
| 14 | [Play a game with friends in real time](prompts/14-play-with-friends.md) | Host sets up and starts; the server decides every duel for everyone. | 8 | 0% |
| 15 | [Watch a duel and send a sticker](prompts/15-watch-and-send-stickers.md) | Watching players see each duel live and send one of six stickers. | 3 | 0% |
| 16 | [Come back after a lost connection](prompts/16-return-after-lost-connection.md) | Connection banner, reconnecting duel, and rejoining the same spot. | 4 | 0% |
| 17 | [Run the backend in a deployed system](prompts/17-run-the-backend.md) | Azure SignalR scale-out, OpenTelemetry without child data, health and migrations. | 3 | 0% |
| 18 | [Open fast and stay smooth on any device](prompts/18-play-fast-on-any-device.md) | Tight bundle budgets, lazy loading, released memory, playing within 20 seconds. | 4 | 0% |
| 19 | [Make every screen work for every child](prompts/19-every-screen-for-every-child.md) | Every width from phone to desktop, keyboard, touch and screen readers. | 4 | 0% |
| 20 | [Prove the game is safe for children](prompts/20-keep-children-safe.md) | Audit that nothing a child types or says leaves the device. | 3 | 0% |

**Total effort:** 86 days. **Overall % complete:** 66% (57 of 86 days).

## Where each journey comes from

The requirements are in [`specs/L2.md`](specs/L2.md), the detailed designs in
[`detailed-designs/`](detailed-designs/) and the mocks in [`mocks/`](mocks/). Each prompt names
the requirements, designs and mock states its journey covers.
