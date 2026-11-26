# 0020. The solo duel: its clock, its timings, the states journey 04 reaches and how specs drive it

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/tour/play-duel/` and `answering/answer-with-number-pad/` leave
`<TO SUPPLY>` how long the timed out state stays, which of two correct answers given at the
same reading of the clock wins, whether the keyboard acts while the focus is on another
control, and how long "You got it!" and the passport stamp stay. `L2-005` criterion 2 marks to
confirm whether the answer is shown when a card runs out. Journey 04 decides and shows a duel;
moving round the ring, the passport stamp and World Map are journey 05's, and Pause is journey
08's. The time-driven rules (the card's time, the freeze, a classmate's answer) must be driven
by a fake clock in Playwright without sleeping, while Angular keeps rendering.

## Decision

- **The game's clock.** `GameClock` (`@atw/domain`, `tour/`) counts game time from a wall
  clock it is given (`Date.now` in the game) and runs each callback whose time has come when
  `tick()` is called, in time order, with `now()` reading the callback's own time. `SoloGame`
  ticks it every 100 ms, and once more before it takes the child's answer, and stops the ticks
  when the solo group is destroyed. Pause (journey 08) stops the count.
- **Ties.** The child's answer is taken after every classmate's answer that was due at or
  before that reading of the clock, so on an exact tie the classmate's answer, applied first,
  wins.
- **Timings.** A card nobody answers shows "Time's up! It was {answer}. Here comes a new card…"
  with the answer, as the mocks draw it, for 2 seconds, then the same two players duel over a
  new card with nobody frozen. The freeze is 1 second. The timer bar's value moves every tick.
- **Journey 04's end of a duel.** Until journey 05, a decided duel stays shown: "= {answer} You
  got it!" when the child won, and "{rival} said {answer} first. So close!" when they lost,
  with the live region saying "{rival} said {answer} first. You sit at {country}." The pill
  "You sit at {country} · {rival} travels on", the passport stamp and how long each stays come
  with World Map in journey 05.
- **The keyboard.** Digits, Backspace and Enter act on the pad wherever the focus is, except
  that Enter on a focused link or button, and any key in a text field, keeps its own meaning.
- **States not reached in a solo duel.** Duel's error state ("We lost the game") is a game with
  friends that lost its connection (journey 16); the voice states are journey 07's and the
  watching, friends and reconnecting states journeys 14 to 16's. Duel's loading state shows
  only until `SoloGame` publishes the first duel, which it does as the game starts, so it is
  proved by a unit test of the page.
- **Desks and countries.** Desk *n* holds the *n*th of the mocks' 24 countries in order
  (France, Egypt, Japan, UK, Italy, USA, Brazil, India, Kenya, China, Australia, Peru, Mexico,
  Norway, Greece, Canada, Spain, Russia, Thailand, Turkey, Morocco, Iceland, Korea, Chile);
  a tour takes the first 6, 12 or 24. Journey 05 adds their landmarks.
- **Specs drive time and chance.** The shared fixture gains `clock` (`hold()` fixes the page's
  `Date.now`, which is the game's clock, while the browser's timers keep running so Angular
  renders; `pass(ms)` moves it on) and `random` (`always(value)` makes `Math.random` return
  one value, so a classmate always answers right and fast with 0, and always wrong and slow
  with 0.999). A spec never sleeps.

## Consequences

The game's time is the wall clock's, so a device whose clock jumps moves the game with it; the
tick reads it at most 100 ms late. A spec reads the flash card from the screen and works out its
answer in the page object. Journey 05 replaces the end of a duel with the stamp and World Map.
