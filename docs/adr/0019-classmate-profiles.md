# 0019. The classmates' profiles, how the class is seated and how a classmate answers

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/classmates/play-solo/` leaves `<TO SUPPLY>` the number of skill levels,
the list of characteristics, each kid's profile, the figures that turn a profile into a
likelihood of a correct answer and a time, the rule that keeps a classmate from winning every
duel of a tour against a child who answers within 2 seconds (`L2-020` criterion 5), and how a
classmate who is not one of the five kids is named. `L2-020` criterion 5 marks the floor of
800 ms to confirm.

## Decision

**Profiles.** A `ClassmateProfile` (`@atw/domain`, `classmates/`) has a skill level from 1 to
5, characteristics and preferred kinds of maths. The five kids' profiles fit them (`L2-020`
criterion 6):

| Kid | Skill | Characteristics | Prefers |
|---|---|---|---|
| Zuri | 4 | bold | Times, Plus |
| Kenji | 3 | planner | Times, Divide |
| Nia | 4 | sprinter | Plus, Minus |
| Milo | 5 | accurate | Times, Divide |
| Pip | 2 | dreamer | Plus |

A further classmate's profile is taken in turn from a fixed list of seven, which holds skill
levels 1, 2, 3, 2, 4, 1 and 3, the characteristics quick to guess, careful, bold and dreamer,
and each kind of maths. Every class therefore holds at least three skill levels (`L2-020`
criterion 1). The class is the same for the same kid and tour length: building it draws no
random number.

**Seating.** `ClassFactory.build(picked, tourLength)` seats one classmate at each desk from 2 to
the tour length. The four kids the child did not pick, in the order Pick Your Kid offers them,
sit at desks `2 + floor(i × n / 4)` for `i` from 0 to 3, where `n` is the number of classmates
(desks 2, 3, 4, 5 of 6; 2, 4, 7, 10 of 12; 2, 7, 13, 19 of 24), and further classmates hold the
desks between them (`L2-019` criterion 3). The first duel is always against one of the kids.

**Answering.** `ClassmateAgent.decide(card, notBeforeMs)` returns an answer and `afterMs`:

- the chance of a correct answer is 0.55, 0.65, 0.75, 0.83 or 0.90 for skill 1 to 5, plus 0.10
  for a preferred kind, plus the characteristics' change (bold −0.05, planner +0.05, sprinter
  −0.10, accurate +0.10, dreamer −0.05, quick to guess −0.15, careful +0.08), kept within 0.30
  to 0.97;
- the typical time is 4,200, 3,500, 2,900, 2,400 or 2,000 ms for skill 1 to 5, times 0.8 for a
  preferred kind and times the characteristics' factor (bold 0.85, planner 1.1, sprinter 0.75,
  accurate 1.15, dreamer 1.25, quick to guess 0.8, careful 1.2); `afterMs` is that time times a
  spread from 0.7 to 1.3;
- a wrong answer is the right one plus or minus 1 to 3, never below 0;
- `afterMs` is never below `notBeforeMs`, which is the floor of **800 ms** (`L2-020` criterion
  5). Higher skill and a preferred kind give a correct answer more often and sooner (`L2-020`
  criteria 2 and 3).

**Never every duel.** When the device's player has lost two duels in a row, every classmate in
the player's next duel answers no sooner than 2,000 ms (`ClassPace`). A child who answers
correctly within 2 seconds then wins at least one duel in every three, so no classmate wins
every duel of a tour of 12 or more desks (`L2-020` criterion 5).

**Naming.** A classmate who is one of the five kids is named by the kid's name; a further
classmate is named "Classmate" on Duel and in what a screen reader is told, and is drawn as the
plain bean in the classmate colour (`data-kid="classmate"`).

**Loading.** `SoloGame` imports the agents dynamically when a tour starts. The first flash card
is dealt at once, and a classmate whose agent arrives after the card appeared answers at its
decided time or at once if that time has passed: the card never waits for a classmate.

## Consequences

The figures are an assumption to tune by playing. Journey 11 lets the on-device model decide
within these profiles; the floor and `ClassPace` still apply to its decisions.
