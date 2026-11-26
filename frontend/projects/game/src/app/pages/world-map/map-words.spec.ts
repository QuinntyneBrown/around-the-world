import { type TourMove, type TourState } from '@atw/api';
import { MapWords } from './map-words';

const COUNTRIES = ['France', 'Egypt', 'Japan', 'UK', 'Italy', 'USA'];

/** A tour of 6: you, Kenji, Nia and a further classmate, the traveller beside a desk. */
function tour(change: Partial<TourState> = {}, holders?: (string | null)[]): TourState {
  const held = holders ?? [null, 'kenji', 'c3', 'nia', 'c5', 'c6'];
  return {
    tourLength: 6,
    desks: COUNTRIES.map((country, index) => ({
      desk: index + 1,
      country,
      landmark: '',
      holder: held[index],
    })),
    players: [
      { id: 'you', name: 'You', kid: 'zuri', you: true },
      { id: 'kenji', name: 'Kenji', kid: 'kenji', you: false },
      { id: 'nia', name: 'Nia', kid: 'nia', you: false },
      { id: 'c3', name: 'Classmate', kid: 'classmate', you: false },
      { id: 'c5', name: 'Classmate', kid: 'classmate', you: false },
      { id: 'c6', name: 'Classmate', kid: 'classmate', you: false },
    ],
    traveller: 'you',
    travellerDesk: 3,
    standings: [
      { place: 1, player: 'you', distance: 2 },
      { place: 2, player: 'kenji', distance: 0 },
      { place: 3, player: 'nia', distance: 0 },
    ],
    lastMove: null,
    stamps: [3],
    phase: 'moving',
    ...change,
  };
}

function move(change: Partial<TourMove>): TourMove {
  return {
    kind: 'hop',
    traveller: 'you',
    from: 2,
    to: 3,
    passedEmptyDesk: false,
    satDown: null,
    ...change,
  };
}

describe('MapWords', () => {
  it('says where a travelling child is and their next stop (L2-034 2)', () => {
    expect(MapWords.where(tour())).toBe('You’re travelling · desk 3 of 6 · next stop UK');
    expect(MapWords.label(tour())).toBe(
      'The classroom from above: a ring of 6 desks. You’re travelling, desk 3 of 6, next stop UK.',
    );
  });

  it('passes the empty desk for the next stop (L2-002 4)', () => {
    expect(MapWords.nextDesk(tour({ travellerDesk: 6 }))).toBe(2);
  });

  it('says where a seated child sits and who is travelling (L2-034 2)', () => {
    const seated = tour({ traveller: 'kenji', travellerDesk: 3 }, [
      null,
      'you',
      'c3',
      'nia',
      'c5',
      'c6',
    ]);
    expect(MapWords.where(seated)).toBe('You’re sitting at Egypt · Kenji is travelling');
    expect(MapWords.label(seated)).toBe(
      'The classroom from above: a ring of 6 desks. You’re sitting at Egypt, Kenji is travelling.',
    );
  });

  it('names a further classmate "a classmate" within the line (L2-034 14)', () => {
    const seated = tour({ traveller: 'c3', travellerDesk: 4 }, [
      null,
      'you',
      'kenji',
      'nia',
      'c5',
      'c6',
    ]);
    expect(MapWords.where(seated)).toBe('You’re sitting at Egypt · a classmate is travelling');
  });

  it.each([
    [move({}), 'You walk on to Japan!'],
    [move({ traveller: 'kenji', from: 3, to: 4 }), 'Kenji walks on to UK!'],
    [move({ traveller: 'c3', from: 3, to: 4 }), 'A classmate walks on to UK!'],
    [
      move({ kind: 'deskHolderTravels', traveller: 'kenji', satDown: 'you', from: 2, to: 3 }),
      'So close! You sit down at Egypt',
    ],
    [
      move({ kind: 'deskHolderTravels', traveller: 'nia', satDown: 'kenji', from: 4, to: 5 }),
      'Kenji sits down at UK · Nia travels on',
    ],
    [
      move({ kind: 'deskHolderTravels', traveller: 'you', satDown: 'c3', from: 2, to: 3 }),
      'A classmate sits down at Egypt · You travel on',
    ],
  ])('words the move %o as "%s" (L2-034 3, 4)', (last, words) => {
    expect(MapWords.message(tour({ lastMove: last }))).toBe(words);
  });

  it('shows no message while no move is shown', () => {
    expect(MapWords.message(tour())).toBeNull();
  });

  it('puts each kid at their desk and the traveller on the path', () => {
    const kids = MapWords.kids(tour());
    expect(kids.find((kid) => kid.you)).toEqual({
      kid: 'zuri',
      desk: 3,
      travelling: true,
      you: true,
      name: 'You',
    });
    expect(kids.find((kid) => kid.kid === 'nia')).toMatchObject({ desk: 4, travelling: false });
    expect(kids).toHaveLength(6);
  });

  it('lists the five kids in the standings, the child as "You" (L2-034 6, 10, 11)', () => {
    expect(MapWords.standings(tour())).toEqual([
      { place: 1, kid: 'zuri', name: 'You', distance: 2, you: true },
      { place: 2, kid: 'kenji', name: 'Kenji', distance: 0, you: false },
      { place: 3, kid: 'nia', name: 'Nia', distance: 0, you: false },
    ]);
  });
});
