import { type GameState } from '@atw/api';
import { FriendsView, LOSER_MAP_MS, type Seen } from './friends-view';

const HOST = 'host';
const NIA = 'nia';
const MILO = 'milo';

/** A race of three: the host travelling from desk 1, Nia at 2, Milo at 3, classmates after. */
function state(overrides: Partial<GameState> = {}): GameState {
  return {
    tourLength: 6,
    secondsToAnswer: 6,
    phase: 'duel',
    firstCardInMs: 0,
    players: [
      { id: HOST, kid: 'zuri', nickname: { adjective: 0, animal: 0 }, distance: 1, stamps: [1] },
      { id: NIA, kid: 'nia', nickname: { adjective: 8, animal: 4 }, distance: 0, stamps: [] },
      { id: MILO, kid: 'milo', nickname: { adjective: 3, animal: 2 }, distance: 0, stamps: [] },
      { id: 'c4', kid: 'classmate', nickname: null, distance: 0, stamps: [] },
      { id: 'c5', kid: 'classmate', nickname: null, distance: 0, stamps: [] },
      { id: 'c6', kid: 'classmate', nickname: null, distance: 0, stamps: [] },
    ],
    desks: [null, NIA, MILO, 'c4', 'c5', 'c6'],
    traveller: HOST,
    travellerDesk: 2,
    standings: [HOST, NIA, MILO, 'c4', 'c5', 'c6'],
    duel: {
      number: 1,
      desk: 2,
      traveller: HOST,
      deskHolder: NIA,
      card: { kind: 'times', left: 6, right: 4 },
      timeLeftMs: 6000,
      travellerFrozenMs: 0,
      deskHolderFrozenMs: 0,
      travellerWrong: null,
      deskHolderWrong: null,
      outcome: 'open',
      winner: null,
      answer: null,
      sinceDecidedMs: 0,
    },
    lastMove: null,
    ending: null,
    winner: null,
    ...overrides,
  };
}

/** The host won the duel at desk 2 and hopped on to desk 3. */
function hostHopped(overrides: Partial<GameState> = {}): GameState {
  const base = state();
  return state({
    phase: 'decided',
    travellerDesk: 3,
    duel: { ...base.duel!, outcome: 'won', winner: 'traveller', answer: 24 },
    lastMove: {
      kind: 'hop',
      traveller: HOST,
      from: 2,
      to: 3,
      passedEmptyDesk: false,
      satDown: null,
    },
    ...overrides,
  });
}

const names = (nickname: { adjective: number; animal: number }) =>
  `nickname ${nickname.adjective}-${nickname.animal}`;

function seen(
  game: GameState,
  you: string,
  sinceReceivedMs = 0,
  pillAtMs: number | null = null,
): Seen {
  return { state: game, you, sinceReceivedMs, pillAtMs };
}

describe('FriendsView', () => {
  describe('the screen the game is at (L2-030 4 and 5, L2-033 7, 8, 10 and 12, ADR 0034)', () => {
    it.each([
      [
        'the traveller, while starting',
        state({ phase: 'starting', duel: null }),
        HOST,
        0,
        null,
        'duel',
      ],
      [
        'the first desk holder, while starting',
        state({ phase: 'starting', duel: null }),
        NIA,
        0,
        null,
        'duel',
      ],
      [
        'a player not in the first duel, while starting',
        state({ phase: 'starting', duel: null }),
        MILO,
        0,
        null,
        'world-map',
      ],
      ['a player in the open duel', state(), NIA, 0, null, 'duel'],
      ['a player not in the open duel, who watches it (L2-028 1)', state(), MILO, 0, null, 'duel'],
      [
        'a player not in a card that timed out (L2-028 8)',
        state({ phase: 'timeUp' }),
        MILO,
        0,
        null,
        'duel',
      ],
      ['a player not in the decided duel, at once', hostHopped(), MILO, 0, null, 'world-map'],
      ['a player in a card that timed out', state({ phase: 'timeUp' }), HOST, 0, null, 'duel'],
      ['the winner who hopped, during "You got it!"', hostHopped(), HOST, 999, null, 'duel'],
      ['the winner who hopped, during the stamp', hostHopped(), HOST, 2199, null, 'duel'],
      ['the winner who hopped, after the stamp', hostHopped(), HOST, 2200, null, 'world-map'],
      [
        'the loser, before World Map opens by itself',
        hostHopped(),
        NIA,
        LOSER_MAP_MS - 1,
        null,
        'duel',
      ],
      [
        'the loser, once World Map opens by itself',
        hostHopped(),
        NIA,
        LOSER_MAP_MS,
        null,
        'world-map',
      ],
      ['the loser, after the pill', hostHopped(), NIA, 500, 500, 'world-map'],
      ['a player not in the decided duel', hostHopped(), MILO, 0, null, 'world-map'],
      [
        'the winner of the last duel, on World Map',
        hostHopped({ phase: 'over', ending: 'allTheWayRound' }),
        HOST,
        3799,
        null,
        'world-map',
      ],
      [
        'the winner of the last duel, after World Map',
        hostHopped({ phase: 'over', ending: 'allTheWayRound' }),
        HOST,
        3800,
        null,
        'podium',
      ],
      [
        'a watching player, after the last move',
        hostHopped({ phase: 'over', ending: 'allTheWayRound' }),
        MILO,
        1600,
        null,
        'podium',
      ],
    ] as const)('%s', (_, game, you, since, pill, screen) => {
      expect(FriendsView.screen(seen(game, you, since, pill))).toBe(screen);
    });

    it('counts the time since the decision from when the state was sent', () => {
      const late = hostHopped({ duel: { ...hostHopped().duel!, sinceDecidedMs: 2000 } });
      expect(FriendsView.screen(seen(late, HOST, 200))).toBe('world-map');
    });
  });

  describe('the duel Duel shows (L2-004, L2-005, L2-033)', () => {
    it('names the device’s player "You", another player by nickname, and counts the time down', () => {
      const duel = FriendsView.duel(seen(state(), NIA, 1500), names)!;
      expect(duel.role).toBe('deskHolder');
      expect(duel.traveller).toEqual({ name: 'nickname 0-0', kid: 'zuri' });
      expect(duel.deskHolder).toEqual({ name: 'You', kid: 'nia' });
      expect(duel.country).toBe('Egypt');
      expect(duel.timeLeftMs).toBe(4500);
      expect(duel.answer).toBeNull();
    });

    it('is frozen for the time the server said, with the wrong answer, and then not', () => {
      const frozen = state({
        duel: { ...state().duel!, deskHolderFrozenMs: 1000, deskHolderWrong: 23 },
      });
      expect(FriendsView.duel(seen(frozen, NIA, 999), names)).toMatchObject({
        frozen: true,
        wrongAnswer: 23,
      });
      expect(FriendsView.duel(seen(frozen, NIA, 1000), names)).toMatchObject({
        frozen: false,
        wrongAnswer: null,
      });
      expect(FriendsView.duel(seen(frozen, HOST, 0), names)).toMatchObject({ frozen: false });
    });

    it('shows the passport stamp to the traveller who hopped, after "You got it!"', () => {
      expect(FriendsView.duel(seen(hostHopped(), HOST, 999), names)!.hop).toBeNull();
      expect(FriendsView.duel(seen(hostHopped(), HOST, 1000), names)!.hop).toMatchObject({ to: 3 });
      expect(FriendsView.duel(seen(hostHopped(), NIA, 1000), names)!.hop).toBeNull();
    });

    it('is watched by a player not in it, who is never frozen (L2-028 1)', () => {
      const frozenHost = state();
      const duel = { ...frozenHost.duel!, travellerFrozenMs: 1000, travellerWrong: 23 };
      const watched = FriendsView.duel(seen({ ...frozenHost, duel }, MILO), names)!;
      expect(watched.role).toBe('watching');
      expect(watched.traveller.name).toBe('nickname 0-0');
      expect(watched.frozen).toBe(false);
      expect(watched.wrongAnswer).toBeNull();
    });

    it('is null while the race is starting', () => {
      expect(
        FriendsView.duel(seen(state({ phase: 'starting', duel: null }), HOST), names),
      ).toBeNull();
    });

    it('draws the players, not the classmates, round the ring, the device’s player last', () => {
      expect(FriendsView.duel(seen(state(), NIA), names)!.ring).toEqual([
        { kid: 'zuri', desk: 2, you: false },
        { kid: 'milo', desk: 3, you: false },
        { kid: 'nia', desk: 2, you: true },
      ]);
    });
  });

  describe('the tour World Map shows (L2-034)', () => {
    it.each([
      [state(), HOST, 'duel'],
      [state(), MILO, 'watching'],
      [hostHopped(), MILO, 'moving'],
      [hostHopped({ phase: 'over', ending: 'allTheWayRound' }), MILO, 'over'],
    ] as const)('is at the right phase (%#)', (game, you, phase) => {
      expect(FriendsView.tour(seen(game, you), names).phase).toBe(phase);
    });

    it('shows the last move only once a duel is decided, and places the players only', () => {
      const tour = FriendsView.tour(seen(hostHopped(), MILO), names);
      expect(tour.lastMove).toMatchObject({ kind: 'hop', to: 3 });
      expect(tour.standings.map(({ player }) => player)).toEqual([HOST, NIA, MILO]);
      expect(tour.players.find(({ id }) => id === 'c4')).toMatchObject({ name: 'Classmate' });
      expect(FriendsView.tour(seen(state(), MILO), names).lastMove).toBeNull();
    });
  });

  describe('the result the Podium shows (L2-035)', () => {
    it('is null until the tour is over', () => {
      expect(FriendsView.result(seen(hostHopped(), HOST), names)).toBeNull();
    });

    it('places the players by distance, and gives the device’s player their passport and place', () => {
      const over = hostHopped({
        phase: 'over',
        ending: 'allTheWayRound',
        winner: HOST,
        standings: [HOST, 'c4', MILO, NIA, 'c5', 'c6'],
        players: state().players.map((player) =>
          player.id === HOST ? { ...player, distance: 6, stamps: [1, 3, 4, 5, 6, 2] } : player,
        ),
      });
      const result = FriendsView.result(seen(over, NIA), names)!;
      expect(result.places.map(({ player }) => player)).toEqual([HOST, MILO, NIA]);
      expect(result.winner).toBe(HOST);
      expect(result.winnerDistance).toBe(6);
      expect(result.yourPlace).toBe(3);
      expect(result.passport).toHaveLength(6);
      expect(result.countriesReached).toBe(0);
    });
  });
});
