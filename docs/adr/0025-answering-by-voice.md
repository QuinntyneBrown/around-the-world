# 0025. Answering by voice: what is heard, on the device, when Mic Check shows and what a failure does

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/answering/check-mic/` and `answering/answer-by-voice/` leave
`<TO SUPPLY>` what counts as hearing "Ready!", how long Mic Check listens, what Mic Check does on
a later visit once the number pad is the kept way of answering, whether recognition runs on the
device, its language, the spoken forms read as a number, whether an interim result answers, what
a failure during a duel does to later duels, whether "Shout instead" may ask for the microphone
again, how the level meter follows the voice, and how the game's own sounds are kept from
answering. `docs/detailed-designs/platform/keep-children-safe/` leaves whether recognition must
run on the device to `answering/`. Whether the first flash card waits for every player's Mic
Check in a game with friends is journey 14's.

`AGENTS.md` says nothing a child says leaves the device as sound; `L2-040` criterion 2 names
only the backend. ADR 0021 measured `effect()` at 3.4 kB of `main`, which is within 1 kB of its
warning.

## Decision

- **On the device only.** Voice is offered only where the browser can be asked to recognise
  speech on the device (Chrome's `SpeechRecognition` with `processLocally`). Each recognition
  session sets `processLocally = true`, so no sound is sent to a recognition service. Where the
  browser has speech recognition without `processLocally`, the game treats it as having none:
  the number pad is the way of answering and Mic Check is skipped (`L2-012` criterion 5). When the
  browser can say whether its on-device language pack is there (`SpeechRecognition.available`),
  "Turn on mic" asks it after the microphone is allowed: `unavailable` is a failure ("Bolt's
  ears aren't working"), and a pack that can be downloaded is installed from the child's press
  while Mic Check stays in its waiting step, where "Too noisy? Tap answers instead" is offered.
- **Language.** Recognition listens in `en-US`, the language the game is written in and the one
  every on-device pack offers.
- **Final results only.** `interimResults` is off and `continuous` is on: one final transcript
  is one answer, and a session ended by the browser is started again while the page still
  listens.
- **The spoken forms.** `spokenNumber` reads a whole transcript, after lower-casing it and
  dropping punctuation, as a whole number from 0 to 999: digits ("24", "1,000" is not), number
  words ("twenty-four", "twenty four", "a hundred and five", "one hundred five", "zero",
  "nought", "oh") and the homophones a recognizer gives for one-word numbers ("won", "to",
  "too", "for", "ate"). Anything else, including a number among other words ("um, twenty-four",
  "is it 24"), gives nothing and costs nothing (`L2-009` criterion 2), because a guess spoken
  aloud must not count as an answer.
- **Hearing "Ready!".** Any final transcript counts: Mic Check proves the microphone hears the
  child, and a misheard "Ready!" still proves it. The contract carries no transcript, so the
  heard step shows the word asked for, "Ready!".
- **"After a while".** Mic Check shows "Bolt didn't catch that" when the browser reports that it
  heard no speech (`no-speech`, about 8 seconds of silence in Chrome); the game keeps no timer of
  its own. On Duel a `no-speech` report is not a failure: listening starts again.
- **When Mic Check shows.** It shows before a game when voice is available, the kept way of
  answering is voice, and Mic Check has not finished in this visit. "Let's go!" keeps voice;
  "Too noisy? Tap answers instead" keeps the number pad, so a later visit skips Mic Check until
  "Answer by shouting" is switched on in Settings (`L2-012` criterion 13). A refused microphone
  or a failure of speech recognition does not change the kept way: the number pad is the way of
  answering for the rest of the visit, and the next visit asks again, in case a grown-up has
  allowed the microphone since.
- **The first card waits for Mic Check.** `GameSession.start(setup, { micCheck: true })` makes
  the tour and the class but deals no card and starts no clock; the session is at the screen
  `mic-check`, and `continue()` from it deals the first card (`L2-012` criterion 8).
- **A failure during a duel.** A failure is for that duel only: the number pad shows, the Duel
  screen says "Bolt stopped hearing, so tap your answer for this one." and "Shout instead" is not
  offered (`L2-011` criterion 4). The next duel starts with the kept way, so voice is tried
  again. A refused microphone (`not-allowed`) is not a failure of the device but the child's or
  a grown-up's answer: it makes the number pad the way for the rest of the visit and withdraws
  "Shout instead" (`L2-011` criterion 6).
- **"Shout instead" never asks twice.** It is offered only while the microphone has not been
  refused in the visit. Where the kept way was the number pad and Mic Check was skipped,
  starting recognition is what asks the browser for the microphone; a refusal then is the
  refusal above.
- **The level meter shows listening, not loudness.** Reading the voice's level would open a
  second microphone stream through Web Audio beside recognition. The meter's bars pulse on their
  own while the device listens and hold still under reduced motion; the words "Shout it!" and
  "Bolt is listening." carry the state. The rings round Mic Check's picture do the same.
- **The game's own sounds.** The sounds of journey 10 are pops, chimes and jingles with no
  words, which a recognizer gives no number for, and recognition asks for the browser's echo
  cancellation. Nothing more is needed until a sound speaks a number.
- **Listening follows the page without an effect.** Duel places a listening directive
  (`[atwListening]`) on the "Shout it!" pill, which is shown exactly while the child may answer
  by voice: the directive starts recognition when it is created and stops it when it is
  destroyed, so a freeze, a decided duel, a switch to the pad or leaving Duel stops it. This keeps
  `effect()` out of `main` (ADR 0021).
- **The contract is listeners, not streams.** `VoiceAnswer.listen(listener)` returns a function
  that stops listening, as `GameSession.watchScreen` does (ADR 0023): `heard(value)`,
  `heardSpeech()`, `noSpeech()` and `failed(error)` with a `code` of `refused` or `failed`.
- **Lazy speech code.** `domain`'s `voice/` holds a small `voiceAvailable()` check and
  `LazyVoiceAnswer`, which loads `SpeechVoiceAnswer` and `spokenNumber` with a dynamic import the
  first time the microphone is asked for or listening starts. The solo group binds
  `VOICE_ANSWER`; Home binds its own for the Settings dialog, which only reads `available`.
- **What the visit remembers.** `Visit` holds, in memory, whether Mic Check has finished and
  whether voice was lost in this visit (a refusal or a failure on the device). The kept way of
  answering is `PlayerChoices.wayOfAnswering`, in the player's record as `wayOfAnswering`
  (ADR 0011), and is written only once the child changes it.

## Consequences

A browser that recognises speech only through a service plays with the number pad, as a browser
with no recognition does. A child who once tapped instead keeps the pad until Settings turns
"Answer by shouting" back on. The fixture's fake recognizer offers `processLocally`, reports
`no-speech` and failures on the spec's word (`voice.silence()`, `voice.fail()`), counts the
recognizers listening (`voice.listening()`), holds the browser's question about the microphone
open (`microphone.ask()`), and counts the microphone streams left open
(`microphone.openStreams()`).
