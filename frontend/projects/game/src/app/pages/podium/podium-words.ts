import { type KidId, type TourPlayer, type TourResult } from '@atw/api';
import { type PassportStamp, type PodiumPlace } from '@atw/components';
import { kidById } from '@atw/domain';

/** Each kid's cheer, the cast's (docs/mocks/README.md, L2-035 criterion 1, ADR 0024). */
const CHEERS: Record<KidId, string> = {
  zuri: 'Zuri raises her pencil like a knight.',
  kenji: 'Kenji adds a pin and pushes up his glasses.',
  nia: 'Nia does a star jump.',
  milo: 'Bolt does a happy spin.',
  pip: 'Pip launches the paper plane.',
};

/**
 * The words and the pieces of the Podium for a tour's result (docs/detailed-designs/tour/
 * end-tour/): the headline, the line under it, the steps and the passport's tiles (L2-035,
 * docs/adr/0024-ending-a-tour.md).
 */
export const PodiumWords = {
  /** The player, or a stand-in for one the result does not know. */
  player(result: TourResult, id: string): TourPlayer {
    return (
      result.players.find((player) => player.id === id) ?? {
        id,
        name: 'Classmate',
        kid: 'classmate',
        you: false,
      }
    );
  },

  /** A name at the start of a sentence: "You", "Nia" or "A classmate" (L2-034 criterion 14). */
  nameFirst(player: TourPlayer): string {
    if (player.you) return 'You';
    return player.kid === 'classmate' ? 'A classmate' : player.name;
  },

  /**
   * "You went around the world!", "Nia made it round first!", "Time’s up! You travelled
   * furthest!" or "Time’s up! Nia travelled furthest!" (L2-035 criterion 1); "You travelled
   * furthest!" when everyone else left a game with friends (L2-029 criterion 5, ADR 0036).
   */
  headline(result: TourResult): string {
    const winner = PodiumWords.player(result, result.winner);
    if (result.ending === 'timeLimit') {
      return `Time’s up! ${PodiumWords.nameFirst(winner)} travelled furthest!`;
    }
    if (result.ending === 'everyoneLeft') {
      return `${PodiumWords.nameFirst(winner)} travelled furthest!`;
    }
    return winner.you
      ? 'You went around the world!'
      : `${PodiumWords.nameFirst(winner)} made it round first!`;
  },

  /**
   * The winning kid's cheer; on the time limit, or when everyone else left, "{n} desks out of
   * {tour length}." before it. A classmate who is not one of the five kids has no cheer.
   */
  cheer(result: TourResult): string {
    const winner = PodiumWords.player(result, result.winner);
    const cheer = winner.kid === 'classmate' ? '' : CHEERS[winner.kid];
    if (result.ending === 'allTheWayRound') return cheer;
    return `${result.winnerDistance} desks out of ${result.tourLength}. ${cheer}`.trim();
  },

  /** The top three, "You" for the device's player, in place order (L2-035 criteria 1 and 5). */
  places(result: TourResult): PodiumPlace[] {
    const places: PodiumPlace[] = [];
    for (const entry of result.places.slice(0, 3)) {
      const player = PodiumWords.player(result, entry.player);
      if (player.kid === 'classmate') continue;
      places.push({
        place: entry.place,
        kid: player.kid,
        name: player.you ? 'You' : player.name,
        picture: kidById(player.kid).picture,
      });
    }
    return places;
  },

  /** The device's player's kid. */
  yourKid(result: TourResult): KidId {
    const you = result.players.find((player) => player.you);
    return you && you.kid !== 'classmate' ? you.kid : 'zuri';
  },

  /** One tile for each desk of the tour, stamped where the child reached it (L2-035 2). */
  stamps(result: TourResult): PassportStamp[] {
    return result.passport.map(({ country, stamped }) => ({ country, reached: stamped }));
  },
};
