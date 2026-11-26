# 0029. Motion and sound: the sounds' source, the first touch, where the mute is kept, the moments and the quick fade

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`L2-038` asks for the hop, the card flip, the shake and the stamp, and for a quick fade in their
place when the device asks for reduced motion. `L2-039` asks for three sounds (a pop, a chime and
a jingle), none while muted and none before the child has touched the page, and `L2-015` keeps
the mute on the device. `docs/detailed-designs/classroom/play-motion-and-sound/` leaves
`<TO SUPPLY>` how the three sounds are made and how long and loud they are, how long "You got
it!" and the stamp stay, and whether a guard beyond the timing keeps a sound from being heard as
an answer.

No sound files are in the repository, and none were drawn in the Magic Patterns prototype. By the
time this journey starts, journeys 04 to 09 have already built most of the motion the design
plans: the shake on `FlashCard`, the stamp on `StampCard`, the Podium's rise, World Map's message
and the 3D hop in `@atw/world`, each with its reduced form in its own stylesheet or renderer.
The design's `MomentPlan`, `MomentPlayer`, `MotionPreference` and nine moments were drawn
before any of it existed. Two gaps remain in what was built: under reduced motion the duration
tokens drop to 0.01 ms, so the stamp's and the Podium's "fade" ends at once; and the 3D hop ends
at once instead of fading. The initial bundle is 271.53 kB against a warning of 272 kB.

## Decision

- **The sounds' source.** The three sounds are short WAV files made by a script in the
  repository, `frontend/tools/make-sounds.mjs`, from sine tones with a soft attack and an
  exponential fall, so they are licence-clean and can be remade or replaced by recorded sounds
  at the same paths. They are served from the game's own origin at `sounds/pop.wav`,
  `sounds/chime.wav` and `sounds/jingle.wav` (16-bit mono at 16 kHz):
  - **pop**: one 80 ms tone at 880 Hz falling to 660 Hz, at a quarter of full loudness;
  - **chime**: two notes (C6 then E6) over 400 ms, at a third of full loudness;
  - **jingle**: four rising notes (C5, E5, G5, C6) over 750 ms, at a third of full loudness.
  None is harsh, and none is a buzzer (`L2-038` criterion 3). They are about 39 kB together.
- **Playing them.** `BrowserSound` in `@atw/domain`'s `sound/` plays each with an
  `HTMLAudioElement`, the platform's simplest player. It makes the three elements on the first
  sound it plays, so nothing is fetched until a sound is due, and releases them (pause, source
  removed, `load()`) when it is destroyed. It is bound to `SOUND` in the solo group, so its code
  stays out of the initial bundle and leaving the game releases it. A refused `play()` is
  ignored: a sound is never something the game waits on.
- **The first touch.** Whether the child has touched the page is read from
  `navigator.userActivation.hasBeenActive`, the browser's own record of a touch, click or key,
  rather than from a listener of our own: it needs no listener to remove, and it is true on every
  screen after the first touch, whichever screen the sound service was made on. Where the
  browser lacks it, sound plays and the browser's own autoplay rule refuses it until a touch.
- **The mute.** `PlayerChoices` keeps the mute with the rest of the record, as `soundMuted`,
  kept only once the child has changed it (as the setup and the way of answering are, ADR 0011,
  ADR 0025). Home's sound button and Settings' "Sound" switch read and change it there, so
  neither loads any sound code. The `Sound` contract therefore has `play` only, and
  `BrowserSound` reads the mute from `PlayerChoices` on each `play`.
- **The moments.** `GameSession` reports the moments that make a sound through
  `watchMoments(listener)`, as it reports screens (ADR 0023): `answerCorrect`, when the device's
  own player's right answer wins their duel, and `countryReached`, when the device's own player
  hops on and their passport is stamped. A lost duel, a wrong answer and a classmate's answer
  are no moment (`L2-039` criterion 1, as clarified). `MomentSounds` in the solo group plays the
  chime and the jingle for them; Duel plays the pop on a key of the number pad. Every visual
  moment is already the state the screens show, so no `MomentPlan` or `MomentPlayer` is built.
- **The quick fade.** A new token, `--duration-fade` (200 ms), is the fade that stands in for a
  hop, a card flip, a shake, a stamp landing and the Podium rising under reduced motion; unlike
  the other durations it keeps its length there. Reduced motion is read from the platform's
  `prefers-reduced-motion` by each stylesheet and by the renderer, so no `MotionPreference`
  service is built.
- **The card flip.** `FlashCard` flips in on its host in `--duration-base` (200 ms, within
  300 ms) and shakes with a second animation of its own property, so the shake never replays the
  flip. Duel makes a new `FlashCard` for each new flash card (an `@for` over the card, tracked by
  the card), so every card flips in, including the one after "Time's up!".
- **The 3D hop under reduced motion.** A kid fades out where it stands and in at the next desk,
  200 ms in all, and nothing moves across the screen. Each kid owns a copy of every material of
  its model, so a fade touches no other kid.
- **How long "You got it!" and the stamp stay.** One second and 1.2 seconds, as `L2-033`
  criterion 7 and ADR 0022 already decide (`RIGHT_MS`, `STAMP_MS`).
- **No further guard against a sound heard as an answer.** Each sound plays when speech
  recognition is not running: the pop only on the number pad, the chime once the duel is decided
  and the jingle on World Map (`L2-009` criterion 5, `L2-011` criterion 1). The timing is the
  guard, and `echoCancellation` (already asked for with the microphone) needs no change.

## Consequences

- The sounds cost nothing until the first is due, and nothing at all while muted; the initial
  bundle grows only by the mute's field and Home's button.
- A designer can replace a sound by putting a recorded file at its path; the script stays as the
  stand-in, as the classroom's stand-in does (ADR 0028).
- A game with friends reports the same two moments from what the server decides, and the same
  `MomentSounds` plays them.
- The design's `MomentPlan`, `MomentPlayer`, `MotionPreference` and `ClassroomRenderer.play` are
  not built; `docs/detailed-designs/classroom/play-motion-and-sound/` is brought in line.
