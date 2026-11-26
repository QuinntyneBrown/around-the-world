# 0018. The numbers of a flash card, how its kind is picked and what counts as the same card

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/tour/make-flash-card/` leaves `<TO SUPPLY>` the ranges of the numbers
of a Plus, Minus and Divide card, whether a Divide card is drawn from the chosen times tables,
how often each chosen kind is picked, and whether `4 × 6` and `6 × 4` are the same card for
`L2-008` criterion 6. The specs fix only that every answer is a whole number from 0 to 999,
that a Divide card divides exactly and that a Minus card is never negative. The players are 10
to 12 years old, and a card must be answerable in 3 seconds at Lightning.

## Decision

`FlashCardMaker` (`@atw/domain`, `questions/`) picks one of the chosen kinds, each as often as
the others, then makes a card of that kind from a `RandomSource`:

| Kind | Left | Right | Answer |
|---|---|---|---|
| Times | a chosen times table or a number from 1 to 12, each side half of the time | the other | at most 144 |
| Plus | 2 to 50 | 2 to 50 | 4 to 100 |
| Minus | 10 to 99 | 1 to the left | 0 to 98 |
| Divide | the divisor times a quotient from 1 to 12 | a divisor: a chosen times table while Times is on, else 2 to 12 | 1 to 12 |

- Every answer is therefore from 0 to 999 by construction (`L2-008` criterion 5).
- **The same card.** Two Times or two Plus cards are the same card when they have the same two
  numbers in either order (`4 × 6` and `6 × 4`); two Minus or two Divide cards when they have
  the same left and right. The maker draws again up to 10 times when the card is the same as
  the last one; if it still is, it moves the card's second number on by one within its range,
  so `next()` always ends and never returns the last card (`L2-008` criterion 6).
- `RandomSource.below(limit)` gives a whole number from 0 below the limit. The game binds it to
  `Math.random`; a unit test gives a fixed sequence.

## Consequences

A card whose answer has three digits cannot occur yet; the answer box and the flash card still
fit three digits (`long` mock). A child who turns off Times keeps Divide cards inside the 2 to
12 tables. The server applies the same table in a game with friends (journey 14).
