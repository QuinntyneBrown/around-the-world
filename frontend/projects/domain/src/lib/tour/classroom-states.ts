import {
  KID_IDS,
  type ClassroomFigure,
  type ClassroomSpot,
  type ClassroomState,
  type DuelState,
  type KidAnimation,
  type TourState,
} from '@atw/api';
import { COUNTRIES } from './countries';

/** Home's classroom shows the default tour's desks (docs/adr/0028). */
const DESKS_AT_REST = 12;
/**
 * Where the five kids are on Home, at the front of the ring: Zuri travels beside desk 2, Kenji
 * holds it, and the others are seated at the desks either side.
 */
const KIDS_AT_REST: readonly ClassroomSpot[] = [
  { desk: 2, travelling: true },
  { desk: 2, travelling: false },
  { desk: 12, travelling: false },
  { desk: 3, travelling: false },
  { desk: 11, travelling: false },
];

/**
 * What the 3D classroom shows on each screen (docs/detailed-designs/classroom/draw-classroom/,
 * docs/adr/0028): the ring at rest on Home, and the tour's ring on Duel and World Map, with
 * each kid's animation for the moment of the game (L2-037 criterion 2).
 */
export const ClassroomStates = {
  /** Home: the default tour's ring with the five kids, every one idle; no desk is lit. */
  atRest(): ClassroomState {
    return {
      desks: COUNTRIES.slice(0, DESKS_AT_REST).map((country, index) => ({
        desk: index + 1,
        country,
        lit: false,
      })),
      figures: KID_IDS.map((kid, index) => ({
        id: kid,
        kid,
        ...KIDS_AT_REST[index],
        you: false,
        animation: 'idle',
        from: null,
      })),
      focusDesk: null,
    };
  },

  /**
   * The tour's ring: each desk holder at their desk and the traveller beside the desk they are
   * at, with that desk and the next stop lit. With the duel the device's player is in, the
   * traveller and the desk holder think while the card is open, and once it is decided the
   * winner cheers and the other has a "so close". The move World Map shows is a hop from where
   * the figure was (L2-034 criteria 3 and 4).
   */
  ofTour(tour: TourState, duel: DuelState | null = null): ClassroomState {
    const next = nextStop(tour);
    const holderAtDuel = duel ? (tour.desks[duel.desk - 1]?.holder ?? null) : null;
    const animationOf = (id: string): KidAnimation => {
      if (!duel || (id !== tour.traveller && id !== holderAtDuel)) return 'idle';
      if (duel.outcome === 'open') return 'thinking';
      if (duel.outcome === 'timedOut') return 'soClose';
      const winner = duel.winner === 'traveller' ? tour.traveller : holderAtDuel;
      return id === winner ? 'winCheer' : 'soClose';
    };
    const move = duel ? null : tour.lastMove;
    const fromOf = (id: string): ClassroomSpot | null => {
      if (!move) return null;
      if (id === move.traveller) {
        return move.kind === 'hop'
          ? { desk: move.from, travelling: true }
          : { desk: move.from, travelling: false };
      }
      if (id === move.satDown) return { desk: move.from, travelling: true };
      return null;
    };
    const figure = (id: string, spot: ClassroomSpot): ClassroomFigure => {
      const player = tour.players.find((candidate) => candidate.id === id);
      const from = fromOf(id);
      return {
        id,
        kid: player?.kid ?? 'classmate',
        you: player?.you ?? false,
        ...spot,
        animation: from ? 'hop' : animationOf(id),
        from,
      };
    };

    const figures: ClassroomFigure[] = [];
    for (const desk of tour.desks) {
      if (desk.holder) figures.push(figure(desk.holder, { desk: desk.desk, travelling: false }));
    }
    figures.push(figure(tour.traveller, { desk: tour.travellerDesk, travelling: true }));
    return {
      desks: tour.desks.map(({ desk, country }) => ({
        desk,
        country,
        lit: desk === tour.travellerDesk || desk === next,
      })),
      figures,
      focusDesk: tour.travellerDesk,
    };
  },
};

/** The next stop: the desk after the traveller's with a holder, passing the empty desk. */
export function nextStop(tour: TourState): number {
  let desk = tour.travellerDesk;
  for (let step = 0; step < tour.tourLength; step++) {
    desk = (desk % tour.tourLength) + 1;
    if (tour.desks[desk - 1]?.holder) return desk;
  }
  return desk;
}
