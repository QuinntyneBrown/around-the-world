import { type DuelState, type TourMove, type TourState } from '@atw/api';
import { ClassroomStates } from './classroom-states';

/** A tour of 6 desks: "you" (Zuri) travels beside desk 3, held by Kenji; desk 1 is empty. */
function tourOf(lastMove: TourMove | null = null): TourState {
  const holders = [null, 'nia', 'kenji', 'milo', 'pip', 'c1'];
  return {
    tourLength: 6,
    desks: holders.map((holder, index) => ({
      desk: index + 1,
      country: ['France', 'Egypt', 'Japan', 'UK', 'Italy', 'USA'][index],
      landmark: '',
      holder,
    })),
    players: [
      { id: 'you', name: 'You', kid: 'zuri', you: true },
      { id: 'nia', name: 'Nia', kid: 'nia', you: false },
      { id: 'kenji', name: 'Kenji', kid: 'kenji', you: false },
      { id: 'milo', name: 'Milo', kid: 'milo', you: false },
      { id: 'pip', name: 'Pip', kid: 'pip', you: false },
      { id: 'c1', name: 'Classmate', kid: 'classmate', you: false },
    ],
    traveller: 'you',
    travellerDesk: 3,
    standings: [],
    lastMove,
    stamps: [],
    phase: lastMove ? 'moving' : 'duel',
  };
}

function duelOf(outcome: DuelState['outcome'], winner: DuelState['winner'] = null): DuelState {
  return { desk: 3, outcome, winner } as DuelState;
}

describe('ClassroomStates', () => {
  it('shows Home the default tour of 12 desks with the five kids, idle, none lit (ADR 0028)', () => {
    const state = ClassroomStates.atRest();
    expect(state.desks.map(({ country }) => country)).toEqual([
      'France',
      'Egypt',
      'Japan',
      'UK',
      'Italy',
      'USA',
      'Brazil',
      'India',
      'Kenya',
      'China',
      'Australia',
      'Peru',
    ]);
    expect(state.desks.some(({ lit }) => lit)).toBe(false);
    expect(state.figures.map(({ kid }) => kid)).toEqual(['zuri', 'kenji', 'nia', 'milo', 'pip']);
    expect(state.figures.every(({ animation }) => animation === 'idle')).toBe(true);
    expect(state.figures.filter(({ travelling }) => travelling)).toHaveLength(1);
    expect(state.focusDesk).toBeNull();
  });

  it('seats each desk holder, stands the traveller beside their desk and lights it and the next stop (L2-034 1)', () => {
    const state = ClassroomStates.ofTour(tourOf());
    expect(state.figures).toContainEqual(
      expect.objectContaining({ id: 'kenji', kid: 'kenji', desk: 3, travelling: false }),
    );
    expect(state.figures).toContainEqual(
      expect.objectContaining({ id: 'you', kid: 'zuri', you: true, desk: 3, travelling: true }),
    );
    expect(state.figures).toContainEqual(expect.objectContaining({ id: 'c1', kid: 'classmate' }));
    expect(state.figures.some(({ desk, travelling }) => desk === 1 && !travelling)).toBe(false);
    expect(state.desks.filter(({ lit }) => lit).map(({ desk }) => desk)).toEqual([3, 4]);
    expect(state.focusDesk).toBe(3);
  });

  it.each([
    ['an open card: both think', duelOf('open'), 'thinking', 'thinking'],
    ['the traveller wins', duelOf('won', 'traveller'), 'winCheer', 'soClose'],
    ['the desk holder wins', duelOf('won', 'deskHolder'), 'soClose', 'winCheer'],
    ['nobody answers in time', duelOf('timedOut'), 'soClose', 'soClose'],
  ] as const)(
    'gives the duellists the animation of the moment: %s (L2-037 2)',
    (_, duel, traveller, deskHolder) => {
      const figures = ClassroomStates.ofTour(tourOf(), duel).figures;
      expect(figures.find(({ id }) => id === 'you')?.animation).toBe(traveller);
      expect(figures.find(({ id }) => id === 'kenji')?.animation).toBe(deskHolder);
      expect(figures.find(({ id }) => id === 'nia')?.animation).toBe('idle');
    },
  );

  it('hops the traveller from the desk before along the path after a hop (L2-034 3)', () => {
    const move: TourMove = {
      kind: 'hop',
      traveller: 'you',
      from: 2,
      to: 3,
      passedEmptyDesk: false,
      satDown: null,
    };
    const you = ClassroomStates.ofTour(tourOf(move)).figures.find(({ id }) => id === 'you');
    expect(you).toEqual(
      expect.objectContaining({ animation: 'hop', from: { desk: 2, travelling: true } }),
    );
  });

  it('sits the beaten traveller down and stands the desk holder up to travel on (L2-034 4)', () => {
    const tour = { ...tourOf(), traveller: 'nia', travellerDesk: 3 };
    const desks = tour.desks.map((desk) => (desk.desk === 2 ? { ...desk, holder: 'you' } : desk));
    const move: TourMove = {
      kind: 'deskHolderTravels',
      traveller: 'nia',
      from: 2,
      to: 3,
      passedEmptyDesk: false,
      satDown: 'you',
    };
    const figures = ClassroomStates.ofTour({ ...tour, desks, lastMove: move }).figures;
    expect(figures.find(({ id }) => id === 'you')).toEqual(
      expect.objectContaining({ desk: 2, travelling: false, from: { desk: 2, travelling: true } }),
    );
    expect(figures.find(({ id }) => id === 'nia')).toEqual(
      expect.objectContaining({ desk: 3, travelling: true, from: { desk: 2, travelling: false } }),
    );
  });
});
