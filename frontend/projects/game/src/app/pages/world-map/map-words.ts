import { type TourMove, type TourPlayer, type TourState } from '@atw/api';
import { type RoomKid, type StandingsItem } from '@atw/components';
import { nextStop } from '@atw/domain';

/**
 * The words and the pieces of World Map for a tour (docs/detailed-designs/tour/
 * travel-round-ring/): the line at the top, the room's name, the message of the last move, the
 * kids in the room and the standings (L2-034, docs/adr/0022-moving-round-the-ring.md).
 */
export const MapWords = {
  /** The player, or a stand-in for one the tour does not know. */
  player(tour: TourState, id: string): TourPlayer {
    return (
      tour.players.find((player) => player.id === id) ?? {
        id,
        name: 'Classmate',
        kid: 'classmate',
        you: false,
      }
    );
  },

  /** A player's name at the start of a sentence: "You", "Kenji" or "A classmate" (L2-034 14). */
  nameFirst(player: TourPlayer): string {
    return player.kid === 'classmate' && !player.you ? 'A classmate' : player.name;
  },

  /** A player's name within a sentence: "Kenji" or "a classmate". */
  nameWithin(player: TourPlayer): string {
    return player.kid === 'classmate' && !player.you ? 'a classmate' : player.name;
  },

  country(tour: TourState, desk: number): string {
    return tour.desks[desk - 1]?.country ?? '';
  },

  /** The next stop: the desk after the traveller's with a holder, passing the empty desk. */
  nextDesk(tour: TourState): number {
    return nextStop(tour);
  },

  /** The desk the device's player sits at, or null while they travel. */
  yourDesk(tour: TourState): number | null {
    const you = tour.players.find((player) => player.you);
    return tour.desks.find((desk) => desk.holder === you?.id)?.desk ?? null;
  },

  /**
   * "You’re travelling · desk 5 of 12 · next stop USA", or "You’re sitting at Italy · Kenji is
   * travelling" (L2-034 criterion 2).
   */
  where(tour: TourState): string {
    const yours = MapWords.yourDesk(tour);
    if (yours === null) {
      return `You’re travelling · desk ${tour.travellerDesk} of ${tour.tourLength} · next stop ${MapWords.country(tour, MapWords.nextDesk(tour))}`;
    }
    const traveller = MapWords.nameWithin(MapWords.player(tour, tour.traveller));
    return `You’re sitting at ${MapWords.country(tour, yours)} · ${traveller} is travelling`;
  },

  /** The room's accessible name, which says the same as the line at the top. */
  label(tour: TourState): string {
    const room = `The classroom from above: a ring of ${tour.tourLength} desks.`;
    const yours = MapWords.yourDesk(tour);
    if (yours === null) {
      return `${room} You’re travelling, desk ${tour.travellerDesk} of ${tour.tourLength}, next stop ${MapWords.country(tour, MapWords.nextDesk(tour))}.`;
    }
    const traveller = MapWords.nameWithin(MapWords.player(tour, tour.traveller));
    return `${room} You’re sitting at ${MapWords.country(tour, yours)}, ${traveller} is travelling.`;
  },

  /** The message of the move World Map shows, or null (L2-034 criteria 3 and 4). */
  message(tour: TourState): string | null {
    const move: TourMove | null = tour.lastMove;
    if (!move) return null;
    const traveller = MapWords.player(tour, move.traveller);
    if (move.kind === 'hop') {
      const country = MapWords.country(tour, move.to);
      return traveller.you
        ? `You walk on to ${country}!`
        : `${MapWords.nameFirst(traveller)} walks on to ${country}!`;
    }
    const country = MapWords.country(tour, move.from);
    const sitter = MapWords.player(tour, move.satDown ?? '');
    if (sitter.you) return `So close! You sit down at ${country}`;
    const travelsOn = traveller.you
      ? 'You travel on'
      : `${MapWords.nameFirst(traveller)} travels on`;
    return `${MapWords.nameFirst(sitter)} sits down at ${country} · ${travelsOn}`;
  },

  /** The kids in the room: each at their desk, the traveller on the path beside theirs. */
  kids(tour: TourState): RoomKid[] {
    const kids: RoomKid[] = [];
    for (const player of tour.players) {
      const seat = tour.desks.find((desk) => desk.holder === player.id);
      const travelling = player.id === tour.traveller;
      if (!seat && !travelling) continue;
      kids.push({
        kid: player.kid,
        desk: seat?.desk ?? tour.travellerDesk,
        travelling: !seat,
        you: player.you,
        name: player.name,
      });
    }
    return kids;
  },

  /** The standings' entries: the five kids, the device's player named "You" (L2-034 6, 11). */
  standings(tour: TourState): StandingsItem[] {
    const items: StandingsItem[] = [];
    for (const entry of tour.standings) {
      const player = MapWords.player(tour, entry.player);
      if (player.kid === 'classmate') continue;
      items.push({
        place: entry.place,
        kid: player.kid,
        name: player.you ? 'You' : player.name,
        distance: entry.distance,
        you: player.you,
      });
    }
    return items;
  },
};
