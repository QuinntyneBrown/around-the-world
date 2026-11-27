import type { ClassroomSpot, KidId } from '@atw/api';

/** A kid on World Map: at their desk, or the traveller beside the desk on the path. */
export interface RoomKid {
  readonly id?: string;
  readonly from?: ClassroomSpot | null;
  readonly kid: KidId | 'classmate';
  readonly desk: number;
  readonly travelling: boolean;
  readonly you: boolean;
  /** The kid's name, or "You"; a classmate who is not one of the five kids has no tag. */
  readonly name: string;
}

/** What the room shows: the ring of desks, the kids, where the traveller is and goes next. */
export interface RoomPlan {
  readonly countries: readonly string[];
  readonly kids: readonly RoomKid[];
  /** The desk the traveller stands beside. */
  readonly travellerDesk: number;
  /** The next stop, the desk after it with a holder. */
  readonly nextDesk: number;
}

export interface PlacedDesk {
  readonly desk: number;
  readonly x: number;
  readonly y: number;
  /** Lit when it is here or the next stop. */
  readonly lit: boolean;
}

export interface PlacedKid {
  readonly id: string;
  readonly walk: string | null;
  readonly kid: KidId | 'classmate';
  readonly x: number;
  readonly y: number;
  /** Faces left on the right half of the room. */
  readonly flip: boolean;
}

export interface PlacedPlaque {
  readonly country: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  /** Navy for the first desk, blue for the next stop (docs/design-system/components/world-map). */
  readonly look: 'start' | 'next' | 'plain';
}

export interface PlacedTag {
  readonly id: string;
  readonly walk: string | null;
  readonly kid: KidId;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly you: boolean;
}

/** One thing drawn in the room, in back-to-front order. */
export type Drawn = ({ type: 'desk' } & PlacedDesk) | ({ type: 'kid' } & PlacedKid);

export interface RoomLayoutResult {
  /** Desks and kids, back to front. */
  readonly drawn: readonly Drawn[];
  readonly plaques: readonly PlacedPlaque[];
  readonly tags: readonly PlacedTag[];
  /** The view zoomed to the child's own kid, as an SVG viewBox. */
  readonly zoom: string;
}

/** The room's picture is 1200 by 760; the desks stand on an ellipse round the rug. */
const CENTRE_X = 600;
const DESK_Y = 402;
const PATH_Y = 440;
const RADIUS_X = 420;
const RADIUS_Y = 210;
const SEAT_RISE = 18;
const PLAQUE_DROP = 64;
const TAG_RISE = 86;
const YOUR_TAG_RISE = 96;
const ZOOM_WIDTH = 440;
const ZOOM_HEIGHT = 620;
const ZOOM_LIFT = 70;
/** A tour of this many desks or fewer labels every desk (L2-034 criterion 8). */
const LABEL_EVERY_DESK = 6;

/**
 * Lays out World Map's room (docs/design-system/components/world-map.html), as the mocks draw
 * it: desk 1 at the front, the desks round the ring clockwise from there, each seated kid behind
 * their desk and the traveller on the dotted path in front of theirs. A tour of 6 desks labels
 * every desk; a longer one only the first desk, the traveller's, the next stop and the child's
 * own (L2-034 criterion 8). The view on a phone is zoomed to the child's own kid (criterion 5).
 */
export const RoomLayout = {
  layout(plan: RoomPlan): RoomLayoutResult {
    const tourLength = plan.countries.length;
    const deskAt = (desk: number, y: number) => {
      const angle = ((90 + ((desk - 1) * 360) / tourLength) * Math.PI) / 180;
      return {
        x: Math.round(CENTRE_X + RADIUS_X * Math.cos(angle)),
        y: Math.round(y + RADIUS_Y * Math.sin(angle)),
      };
    };
    const desks: PlacedDesk[] = plan.countries.map((_, index) => ({
      desk: index + 1,
      ...deskAt(index + 1, DESK_Y),
      lit: index + 1 === plan.travellerDesk || index + 1 === plan.nextDesk,
    }));
    const kids = plan.kids.map((kid, index) => {
      const at = kid.travelling
        ? deskAt(kid.desk, PATH_Y)
        : { x: desks[kid.desk - 1].x, y: desks[kid.desk - 1].y - SEAT_RISE };
      let walk: string | null = null;
      if (kid.from) {
        const start = deskAt(kid.from.desk, kid.from.travelling ? PATH_Y : DESK_Y - SEAT_RISE);
        const arc = kid.travelling && kid.from.travelling;
        const steps = (kid.desk - kid.from.desk + tourLength) % tourLength;
        const segment = arc
          ? `A ${RADIUS_X} ${RADIUS_Y} 0 ${steps > tourLength / 2 ? 1 : 0} 1`
          : 'L';
        walk = `path('M ${start.x - at.x} ${start.y - at.y} ${segment} 0 0')`;
      }
      return { ...kid, ...at, id: kid.id ?? String(index), walk, flip: at.x > CENTRE_X };
    });
    const drawn: Drawn[] = [
      ...kids.map(({ id, kid, x, y, flip, walk }) => ({
        type: 'kid' as const,
        id,
        kid,
        x,
        y,
        flip,
        walk,
      })),
      ...desks.map((desk) => ({ type: 'desk' as const, ...desk })),
    ].sort((one, other) => one.y - other.y || (one.type === 'kid' ? -1 : 1));

    const you = kids.find((kid) => kid.you);
    const yourDesk = you && !you.travelling ? you.desk : null;
    const labelled = new Set(
      tourLength <= LABEL_EVERY_DESK
        ? desks.map(({ desk }) => desk)
        : [1, plan.travellerDesk, plan.nextDesk, ...(yourDesk ? [yourDesk] : [])],
    );
    const plaques = desks
      .filter(({ desk }) => labelled.has(desk))
      .map(({ desk, x, y }) => {
        const country = plan.countries[desk - 1];
        const look: PlacedPlaque['look'] =
          desk === 1 ? 'start' : desk === plan.nextDesk ? 'next' : 'plain';
        return { country, x, y: y + PLAQUE_DROP, width: Math.round(9 * country.length + 25), look };
      });

    const tags: PlacedTag[] = [];
    for (const kid of kids) {
      if (kid.kid === 'classmate') continue;
      tags.push({
        id: kid.id,
        walk: kid.walk,
        kid: kid.kid,
        name: kid.name,
        x: kid.x,
        y: kid.y - (kid.you ? YOUR_TAG_RISE : TAG_RISE),
        width: kid.you ? 52 : 60,
        you: kid.you,
      });
    }
    // The child's own tag is drawn last, over the others.
    tags.sort((one, other) => Number(one.you) - Number(other.you));

    const centre = you ?? { x: CENTRE_X, y: DESK_Y };
    const zoom = `${centre.x - ZOOM_WIDTH / 2} ${centre.y - ZOOM_LIFT - ZOOM_HEIGHT / 2} ${ZOOM_WIDTH} ${ZOOM_HEIGHT}`;
    return { drawn, plaques, tags, zoom };
  },
};
