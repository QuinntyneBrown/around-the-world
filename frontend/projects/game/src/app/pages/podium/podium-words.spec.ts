import { type TourResult } from '@atw/api';
import { PodiumWords } from './podium-words';

/** A result of a tour of 12 desks, the child ("you", Zuri) first unless a case changes it. */
function result(change: Partial<TourResult> = {}): TourResult {
  return {
    ending: 'allTheWayRound',
    tourLength: 12,
    winner: 'you',
    winnerDistance: 12,
    places: [
      { place: 1, player: 'you', distance: 12 },
      { place: 2, player: 'nia', distance: 7 },
      { place: 3, player: 'kenji', distance: 4 },
      { place: 4, player: 'milo', distance: 1 },
    ],
    players: [
      { id: 'you', name: 'You', kid: 'zuri', you: true },
      { id: 'nia', name: 'Nia', kid: 'nia', you: false },
      { id: 'kenji', name: 'Kenji', kid: 'kenji', you: false },
      { id: 'milo', name: 'Milo', kid: 'milo', you: false },
      { id: 'pip', name: 'Pip', kid: 'pip', you: false },
      { id: 'classmate-3', name: 'Classmate', kid: 'classmate', you: false },
    ],
    yourPlace: 1,
    passport: [
      { desk: 1, country: 'France', stamped: true },
      { desk: 2, country: 'Egypt', stamped: false },
    ],
    countriesReached: 1,
    ...change,
  };
}

describe('PodiumWords', () => {
  it.each([
    ['allTheWayRound', 'you', 'You went around the world!'],
    ['allTheWayRound', 'nia', 'Nia made it round first!'],
    ['allTheWayRound', 'classmate-3', 'A classmate made it round first!'],
    ['timeLimit', 'you', 'Time’s up! You travelled furthest!'],
    ['timeLimit', 'kenji', 'Time’s up! Kenji travelled furthest!'],
    ['timeLimit', 'classmate-3', 'Time’s up! A classmate travelled furthest!'],
    ['everyoneLeft', 'you', 'You travelled furthest!'],
    ['everyoneLeft', 'nia', 'Nia travelled furthest!'],
  ] as const)('reads the headline for %s won by %s as "%s" (L2-035 1)', (ending, winner, words) => {
    expect(PodiumWords.headline(result({ ending, winner }))).toBe(words);
  });

  it.each([
    ['you', 'Zuri raises her pencil like a knight.'],
    ['kenji', 'Kenji adds a pin and pushes up his glasses.'],
    ['nia', 'Nia does a star jump.'],
    ['milo', 'Bolt does a happy spin.'],
    ['pip', 'Pip launches the paper plane.'],
    ['classmate-3', ''],
  ])('gives the winner %s the cheer "%s" (L2-035 1)', (winner, cheer) => {
    expect(PodiumWords.cheer(result({ winner }))).toBe(cheer);
  });

  it('puts the distance before the cheer when time ran out (L2-035 1)', () => {
    const timeUp = result({ ending: 'timeLimit', winner: 'nia', winnerDistance: 8 });
    expect(PodiumWords.cheer(timeUp)).toBe('8 desks out of 12. Nia does a star jump.');
    const classmate = result({ ending: 'timeLimit', winner: 'classmate-3', winnerDistance: 3 });
    expect(PodiumWords.cheer(classmate)).toBe('3 desks out of 12.');
  });

  it('puts the distance before the cheer when everyone else left (L2-029 5, ADR 0036)', () => {
    const left = result({ ending: 'everyoneLeft', winner: 'you', winnerDistance: 3 });
    expect(PodiumWords.cheer(left)).toBe(
      '3 desks out of 12. Zuri raises her pencil like a knight.',
    );
  });

  it('gives the top three their kids, "You" for the child, in place order (L2-035 1)', () => {
    expect(PodiumWords.places(result())).toEqual([
      { place: 1, kid: 'zuri', name: 'You', picture: 'img/kid-zuri.jpg' },
      { place: 2, kid: 'nia', name: 'Nia', picture: 'img/kid-nia.jpg' },
      { place: 3, kid: 'kenji', name: 'Kenji', picture: 'img/kid-kenji.jpg' },
    ]);
  });

  it('shows only the places that exist (L2-035 5)', () => {
    const two = result({ places: result().places.slice(0, 2) });
    expect(PodiumWords.places(two).map(({ name }) => name)).toEqual(['You', 'Nia']);
  });

  it('gives a tile for each desk, stamped where reached (L2-035 2)', () => {
    expect(PodiumWords.stamps(result())).toEqual([
      { country: 'France', reached: true },
      { country: 'Egypt', reached: false },
    ]);
  });
});
