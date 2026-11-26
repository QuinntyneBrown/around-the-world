# 0030. Classmates with the on-device model: readiness, the sessions, the prompts, the decision and its deadline

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`L2-021` lets the browser's on-device model (Gemini Nano through Chrome's Prompt API,
`LanguageModel`) decide a classmate's answer and when it comes, and `L2-042` keeps everything it
writes away from the child. `docs/detailed-designs/classmates/drive-classmates-with-model/`
leaves `<TO SUPPLY>` whether the game ever fetches the model, the unit and bound of the
decision's time, the wording of the prompts, whether a device holds a session for each of 23
classmates, and whether classmates send stickers in a solo game; it marks the floor of 800 ms to
confirm. The design was drawn before journey 04 put `SoloGame` in `domain`'s `tour/` (behind
`GAME_SESSION`, bound by the solo group) rather than in the `game` application.

By this journey a classmate already answers from its profile at a time fixed on the game's clock
(ADR 0019, ADR 0020), and the classmates' duels the child watches on World Map are worked out at
once by `ClassmatesDuel` (ADR 0022). The initial bundle is 271.87 kB against a warning of
272 kB.

## Decision

**Where the code is.** `@atw/api` holds the contract: `ClassmateModel` (`isReady`,
`openSession`), `ClassmateModelSession` (`decide`, `destroy`), `ModelDecision` (`answer`,
`afterMs`, no text) and the token `CLASSMATE_MODEL`. `domain`'s `classmates/` holds everything
that touches the Prompt API. The solo group binds `CLASSMATE_MODEL` to `LazyClassmateModel`,
which, like `LazyVoiceAnswer` (ADR 0025), answers "not ready" at once when the browser has no
`LanguageModel`, and otherwise imports `on-device-model` (the Prompt API code, `ClassmatePrompt`
and `parseModelDecision`) dynamically, in a chunk of its own. `SoloGame` stays in `tour/` and
reaches the model only through the token.

**Readiness, and no download.** `isReady()` is true only when `LanguageModel.availability()`
answers `available` for English text in and out. `unavailable`, `downloadable`, `downloading`,
a missing API or any failure is "not ready", and then no session is created, because creating
one is what starts a download. The game never starts the download, in play or outside it; Chrome
fetches the model when another page or the browser itself asks for it.

**When the model is asked.** `SoloGame` deals the first flash card, then asks `isReady()`. It
never waits for the answer: until a classmate's session arrives, and whenever none does, the
classmate plays from its profile. A session that arrives while a duel's flash card is open, and
before the classmate's profile time, is asked about that card at once.

**The sessions.** One session for each classmate of the tour (at most 23 in a Grand tour), primed
with that classmate's profile. They are opened one after another in desk order, so the first
duel's classmate is first and a low-power device is not asked for 23 at once. The first session
that cannot be opened stops the opening: the classmates without one play from their profiles.
Each decision prompts a clone of the primed session, destroyed after it answers, so no session's
context grows over a tour. The sessions are kept while World Map shows between duels, and every
session is destroyed when the tour ends (the Podium opens), when the child leaves the game (Home
from the Podium or from Pause), and before "Play again" opens a new tour's sessions.

**Which duels the model decides.** The duels the child is in. A classmates' duel watched on
World Map is worked out at once from the two profiles (ADR 0022), which a model's answer, coming
later and in its own time, could not join; `L2-021` criterion 8 records it.

**The prompts.** Both are English text and hold nothing of the child (`L2-042` criterion 3).
The priming text, built by `ClassmatePrompt.priming(profile)`:

> You are a classmate in a children's maths flash-card game. Skill level: 4 of 5. Characteristics:
> bold. Preferred maths: times, plus. A higher skill answers correctly more often and sooner;
> preferred maths is easier. For each flash card, reply with JSON only: "answer", the whole number
> you would say (sometimes wrong, as a child of your skill would be), and "afterMs", how many
> milliseconds you take to say it (between 800 and 10000).

The card text, built by `ClassmatePrompt.card(card)`, is the flash card only, as `7 × 8 = ?`
(with `+`, `−` or `÷` for the other kinds). Each prompt carries a JSON Schema response constraint
of exactly the two whole-number properties.

**The decision.** `parseModelDecision` accepts only JSON that is an object with exactly `answer`,
a whole number from 0 to 999, and `afterMs`, a whole number of **milliseconds** from 1 to
**10,000** (the time of a Chill card, the longest). Anything else is `null` and discarded; the
text is never kept, logged or passed on. `afterMs` counts from the moment the classmate can
answer (the card appearing, or the classmate's freeze ending), as a profile's does. The floor of
**800 ms** (confirmed; ADR 0019) and `ClassPace`'s 2 seconds after two lost duels in a row apply
to it: the classmate answers at the later of the model's time and that floor.

**The deadline.** The model's deadline is the classmate's profile time. When it comes with no
valid model decision, the classmate answers from its profile and the prompt is aborted; a valid
decision that arrives before it replaces the profile's decision, answering at once when its own
time has already passed. A failed, refused or aborted prompt is `null`, the same as a late one.
Whether the answer is right, the freeze and the winner stay with `Duel`.

**Stickers.** Classmates send no stickers in a solo game. Stickers are what a watching player in
a room sends (journey 15); a classmate's reaction is the kid's fixed animation, chosen from the
duel's outcome.

**Tests.** The fixture's fake `LanguageModel` is extended: it can answer from a list, hold each
prompt until the spec replies, fail every prompt, or be missing; it counts the sessions and
clones created, destroyed and still open, and records what it was asked so a spec can prove the
prompts hold no nickname.

## Consequences

The model decides only within the time the profile already allows, so a slow model never slows a
duel, and a fast one can make a classmate quicker but never below the floor. A device with the
model holds one primed session for each classmate for the length of a tour; a low-power device
that refuses one plays the rest of the class from profiles. The game never helps a child get the
model, so a child whose Chrome has not downloaded it plays from profiles until Chrome does.
