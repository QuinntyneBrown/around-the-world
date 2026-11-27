import {
  type DeskState,
  type DuelRole,
  type DuelState,
  type Duellist,
  type GameScreen,
  type GameState,
  type PassportPage,
  type RingPlace,
  type TourPhase,
  type TourPlayer,
  type TourResult,
  type TourState,
} from '@atw/api';
import { countryOfDesk, landmarkOfDesk, MESSAGE_MS, RIGHT_MS, STAMP_MS } from '@atw/domain';

/**
 * How long after a decision the loser's World Map opens by itself: the winner's "You got it!"
 * and passport stamp (L2-033 criterion 12, docs/adr/0034).
 */
export const LOSER_MAP_MS = RIGHT_MS + STAMP_MS;

/**
 * How long "Everyone else has left." shows on Duel before the Podium opens (L2-029 criterion 5,
 * docs/adr/0036).
 */
export const EVERYONE_LEFT_MS = 3000;

/**
 * The game as the device last received it, and what the device's player did since: the state,
 * how long ago it arrived, the player's own id, and how long after the decision they chose the
 * quiet pill, if they did.
 */
export interface Seen {
  readonly state: GameState;
  readonly sinceReceivedMs: number;
  readonly you: string;
  readonly pillAtMs: number | null;
}

/** The words for a player of the room, from their nickname's indexes or else their kid. */
export type NameOf = (player: { readonly kid: string; readonly nickname: unknown }) => string;

/**
 * What the screens show of a game with friends (docs/adr/0034-playing-with-friends-on-the-device.md):
 * the `DuelState`, `TourState` and `TourResult` of the `GameState` the server last sent, from the
 * device's player's side, and the screen it is at. It decides nothing about the game: every rule
 * is the server's. It names the device's player "You", another player by their nickname and a
 * classmate "Classmate" (L2-033 criterion 6).
 */
export const FriendsView = {
  /** Whether the device's player is in the duel being played, or about to be. */
  inDuel(state: GameState, you: string): boolean {
    if (state.phase === 'starting' || !state.duel) {
      return state.traveller === you || state.desks[state.travellerDesk - 1] === you;
    }
    return state.duel.traveller === you || state.duel.deskHolder === you;
  },

  /** How long ago the last duel was decided, or its card's time ran out. */
  sinceDecided(seen: Seen): number {
    return (seen.state.duel?.sinceDecidedMs ?? 0) + seen.sinceReceivedMs;
  },

  /** Whether the device's player won the decided duel. */
  youWon(state: GameState, you: string): boolean {
    const duel = state.duel;
    if (!duel || duel.outcome !== 'won' || !duel.winner) return false;
    return duel[duel.winner] === you;
  },

  /**
   * When, after a decision, World Map opens: at once for a player not in the duel, after "You
   * got it!" for the winner and the passport stamp after a hop, and for the loser at the pill or
   * after both (L2-033 criteria 7, 8, 10 and 12).
   */
  mapAfterMs(seen: Seen): number {
    const { state, you } = seen;
    if (!FriendsView.inDuel(state, you)) return 0;
    if (FriendsView.youWon(state, you)) {
      return state.lastMove?.kind === 'hop' && state.lastMove.traveller === you
        ? RIGHT_MS + STAMP_MS
        : RIGHT_MS;
    }
    return Math.min(seen.pillAtMs ?? LOSER_MAP_MS, LOSER_MAP_MS);
  },

  /**
   * The screen the game is at: Duel while a card is open or its time has run out, for the
   * players in the duel and those watching it (L2-028 criteria 1 and 8, ADR 0035); before the
   * first card, World Map for a player not in the first duel; World Map after a decision, and
   * the Podium once World Map has shown the move that ended the tour for its message's time
   * (L2-030 criteria 4 and 5, L2-035 criterion 8).
   */
  screen(seen: Seen): GameScreen {
    const { state, you } = seen;
    if (state.phase === 'over' && state.ending === 'everyoneLeft') {
      return FriendsView.sinceDecided(seen) < EVERYONE_LEFT_MS ? 'duel' : 'podium';
    }
    if (state.phase === 'starting') return FriendsView.inDuel(state, you) ? 'duel' : 'world-map';
    if (state.phase !== 'decided' && state.phase !== 'over') return 'duel';
    const since = FriendsView.sinceDecided(seen);
    const mapAt = FriendsView.mapAfterMs(seen);
    if (since < mapAt) return 'duel';
    return state.phase === 'over' && since >= mapAt + MESSAGE_MS ? 'podium' : 'world-map';
  },

  /**
   * The players as the screens name and draw them, classmates included; a player removed after
   * 30 seconds away is left out of the ring, but named in a duel and on the Podium (ADR 0036).
   */
  players(state: GameState, you: string, nameOf: NameOf, withRemoved = true): TourPlayer[] {
    const players = withRemoved ? state.players : state.players.filter(({ removed }) => !removed);
    return players.map((player) => ({
      id: player.id,
      name:
        player.id === you
          ? 'You'
          : player.kid === 'classmate' || !player.nickname
            ? 'Classmate'
            : nameOf(player),
      kid: player.kid,
      you: player.id === you,
    }));
  },

  /**
   * The duel being played, as Duel shows it, from the device's player's side: the traveller, the
   * desk holder, or watching when they are in neither role (L2-028 criterion 1, L2-033); null
   * before the first card.
   */
  duel(seen: Seen, nameOf: NameOf): DuelState | null {
    const { state, you } = seen;
    const duel = state.duel;
    if (state.phase === 'starting' || !duel) return null;
    const players = FriendsView.players(state, you, nameOf);
    const side: DuelRole =
      duel.traveller === you ? 'traveller' : duel.deskHolder === you ? 'deskHolder' : 'watching';
    const open = duel.outcome === 'open';
    const frozenMs =
      side === 'traveller'
        ? duel.travellerFrozenMs
        : side === 'deskHolder'
          ? duel.deskHolderFrozenMs
          : 0;
    const frozen = open && seen.sinceReceivedMs < frozenMs;
    const wrong = side === 'traveller' ? duel.travellerWrong : duel.deskHolderWrong;
    const move = state.lastMove;
    const stamp =
      FriendsView.youWon(state, you) &&
      move?.kind === 'hop' &&
      move.traveller === you &&
      FriendsView.sinceDecided(seen) >= RIGHT_MS;
    return {
      card: duel.card,
      desk: duel.desk,
      tourLength: state.tourLength,
      country: countryOfDesk(duel.desk),
      traveller: duellist(players, duel.traveller),
      deskHolder: duellist(players, duel.deskHolder),
      role: side,
      secondsToAnswer: state.secondsToAnswer,
      timeLeftMs: open ? Math.max(0, duel.timeLeftMs - seen.sinceReceivedMs) : 0,
      frozen,
      wrongAnswer: frozen ? wrong : null,
      outcome: duel.outcome,
      winner: duel.winner,
      answer: open ? null : duel.answer,
      ring: ring(state, FriendsView.players(state, you, nameOf, false)),
      hop: stamp && move ? { ...move } : null,
    };
  },

  /** The tour as World Map shows it (L2-034): the standings count the players only. */
  tour(seen: Seen, nameOf: NameOf): TourState {
    const { state, you } = seen;
    const players = FriendsView.players(state, you, nameOf, false);
    const desks: DeskState[] = state.desks.map((holder, index) => ({
      desk: index + 1,
      country: countryOfDesk(index + 1),
      landmark: landmarkOfDesk(index + 1),
      holder,
    }));
    const decided = state.phase === 'decided' || state.phase === 'over';
    const phase: TourPhase =
      state.phase === 'over'
        ? 'over'
        : decided
          ? 'moving'
          : FriendsView.inDuel(state, you)
            ? 'duel'
            : 'watching';
    return {
      tourLength: state.tourLength,
      desks,
      players,
      traveller: state.traveller,
      travellerDesk: state.travellerDesk,
      standings: placesOf(state, false),
      lastMove: decided && state.lastMove ? { ...state.lastMove } : null,
      stamps: state.players.find((player) => player.id === you)?.stamps ?? [],
      phase,
    };
  },

  /** How the tour ended, as the Podium shows it, once it is over (L2-035); null until then. */
  result(seen: Seen, nameOf: NameOf): TourResult | null {
    const { state, you } = seen;
    if (state.phase !== 'over' || !state.ending) return null;
    const places = placesOf(state);
    const winner = state.winner ?? state.standings[0] ?? you;
    const stamps = state.players.find((player) => player.id === you)?.stamps ?? [];
    const passport: PassportPage[] = state.desks.map((_, index) => ({
      desk: index + 1,
      country: countryOfDesk(index + 1),
      stamped: stamps.includes(index + 1),
    }));
    return {
      ending: state.ending,
      tourLength: state.tourLength,
      winner,
      winnerDistance: state.players.find((player) => player.id === winner)?.distance ?? 0,
      places,
      players: FriendsView.players(state, you, nameOf),
      yourPlace: places.find(({ player }) => player === you)?.place ?? places.length + 1,
      passport,
      countriesReached: passport.filter(({ stamped }) => stamped).length,
    };
  },
};

/**
 * The players by distance, numbered among themselves: a classmate has no place (ADR 0034), and a
 * removed player none during the tour, though their distance still counts on the Podium (ADR 0036).
 */
function placesOf(state: GameState, withRemoved = true) {
  const kidOf = new Map(state.players.map((player) => [player.id, player]));
  return state.standings
    .map((id) => kidOf.get(id))
    .filter((player) => player !== undefined && player.kid !== 'classmate')
    .filter((player) => withRemoved || !player!.removed)
    .map((player, index) => ({ place: index + 1, player: player!.id, distance: player!.distance }));
}

function duellist(players: readonly TourPlayer[], id: string): Duellist {
  const player = players.find((candidate) => candidate.id === id);
  return player ? { name: player.name, kid: player.kid } : { name: 'Classmate', kid: 'classmate' };
}

/** The players round the ring, each at their desk, the traveller beside the duel's desk. */
function ring(state: GameState, players: readonly TourPlayer[]): RingPlace[] {
  const places: RingPlace[] = [];
  for (const player of players) {
    if (player.kid === 'classmate') continue;
    const seat = state.desks.indexOf(player.id);
    places.push({
      kid: player.kid,
      desk: seat < 0 ? state.travellerDesk : seat + 1,
      you: player.you,
    });
  }
  return [...places.filter(({ you }) => !you), ...places.filter(({ you }) => you)];
}
