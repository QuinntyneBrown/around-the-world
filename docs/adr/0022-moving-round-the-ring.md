# 0022. Moving round the ring: timings, stamps, words, ties and the classmates' duels

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

`docs/detailed-designs/tour/travel-round-ring/` and `player/find-way-through-screens/` leave
`<TO SUPPLY>` how long "You got it!" and the passport stamp stay, which countries and landmarks
the desks hold, whether a desk holder who becomes the traveller earns a stamp, the World Map
message when another player sits down, how a classmate who is not one of the five kids is named,
how two players with the same distance are ordered during a tour, how long a duel between two
classmates takes, what "Back to the card" does while the child is seated, and who is the first
traveller in a game with friends. `L2-034` criterion 4 marked the words for another player sitting
down **to confirm**. Journey 05 moves the players and shows World Map; the end of the tour is
journey 06's, the hop's motion journey 10's and the 3D room journey 09's.

## Decision

- **Timings.** "You got it!" stays 1 second, the passport stamp 1.2 seconds and a World Map
  message 1.6 seconds (`L2-034` criterion 9). All three wait on the game's clock (ADR 0020), so a
  spec moves them on with `clock.pass(ms)`, and Pause (journey 08) holds them.
- **Stamps.** A passport holds a stamp only for a desk reached by a hop (`L2-002` criterion 2).
  A desk holder who wins walks on to the next desk with no stamp, and a player's own desk is not
  a stamp (`L2-003` criterion 4). So Duel shows the passport stamp only when the child won as
  the traveller; a child who wins as the desk holder sees "You got it!" and then World Map
  (`L2-033` criteria 7 and 10).
- **Landmarks.** Desk *n* holds the *n*th of the mocks' 24 countries (ADR 0020), with these
  landmarks: France Eiffel Tower, Egypt Pyramids of Giza, Japan Mount Fuji, UK Big Ben, Italy
  Leaning Tower of Pisa, USA Statue of Liberty, Brazil Christ the Redeemer, India Taj Mahal,
  Kenya Mount Kenya, China Great Wall, Australia Sydney Opera House, Peru Machu Picchu, Mexico
  Chichén Itzá, Norway Northern Lights, Greece Parthenon, Canada CN Tower, Spain Sagrada
  Família, Russia Saint Basil's Cathedral, Thailand Grand Palace, Turkey Hagia Sophia, Morocco
  Hassan II Mosque, Iceland Geysir, Korea Gyeongbokgung Palace, Chile Easter Island heads. They
  are the cast, not rules.
- **Words.** When another player sits down the message is "{name} sits down at {country} ·
  {name} travels on", "You travel on" when the child is the one who travels on (`L2-034`
  criterion 4). A child who loses as the desk holder keeps their desk; the pill reads "You keep
  {country} · {rival} hops on" and the live region "{rival} said {answer} first. You keep
  {country}." (`L2-033` criterion 11, mock `pages/duel/kept`). A classmate who is not one of the
  five kids is "A classmate" at the start of a sentence and "a classmate" within one (`L2-034`
  criterion 14); the duel strip still names them "Classmate" (ADR 0019).
- **Ties.** During a tour, as at its end, of two players with the same distance travelled the one
  who reached it first is placed higher; players still at the same moment keep the order of
  their desks (`L2-034` criterion 13). World Map's `hop` mock was redrawn to match.
- **The classmates' duels.** In a solo game a duel between two classmates is played under the
  rules of every duel (`Duel`): each classmate's agent decides its answer and its time, a wrong
  answer freezes it for 1 second and it decides again, and a card nobody answers in its time is
  replaced by a new one for the same two. `ClassmatesDuel` works the duel out at its start, from
  the agents' decisions, as the winner and the time the first correct answer comes; `SoloGame`
  applies the result at that time on the game's clock, so the duel takes as long as its first
  correct answer (`L2-034` criterion 7). It works out at most five cards at once; with none
  answered, it waits their time and works out the next five.
- **Back to the card.** On World Map "Back to the card" ends a message's wait at once
  (`L2-034` criterion 12). While the child is seated and classmates duel, it plays out the
  classmates' duels at once until a traveller reaches the child's desk, and Duel returns.
- **The end of the tour until journey 06.** When a hop brings a traveller's distance to the
  tour length, `Tour` is over and `SoloGame` publishes phase `over` and starts no further duel;
  World Map stays with its message. Journey 06 opens the Podium from there.
- **The first traveller in a game with friends** is the host (journey 14 builds it).

## Consequences

A child who sits down waits on World Map for the classmates' duels at the pace their profiles
give, or chooses "Back to the card" to go straight to the next duel at their desk. The stamp is
the reward of a hop alone, so a passport counts the countries a player reached by winning as the
traveller.
