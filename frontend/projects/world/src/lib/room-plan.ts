import { type ClassroomSpot } from '@atw/api';

/**
 * One plan for the 3D room and World Map's drawn room (docs/adr/0028). The room is laid out in
 * metres round the centre of the rug: the desks stand on a circle of 4.2 m, desk 1 at the front
 * and the others clockwise. Seen from above at 30°, at 100 px a metre, that circle is the
 * ellipse of `RoomLayout` in `@atw/components` (420 by 210 px round 600, 402 in a plan of 1200
 * by 760), so the drawn room's name tags and plaques sit over the 3D room. A change to one is
 * made in both.
 */
export const RoomPlan = {
  /** The plan's size in px, its centre and its scale: World Map's SVG viewBox. */
  width: 1200,
  height: 760,
  centreX: 600,
  centreY: 402,
  pxPerMetre: 100,
  /** World Map's camera looks down at 30°, so the ground is drawn at half its depth. */
  elevation: Math.PI / 6,
  ringRadius: 4.2,
  /** A seated kid stands this far behind their desk, as seen from the front. */
  seatBack: 0.36,
  /** The dotted path is the ring moved this far to the front. */
  pathShift: 0.76,
  /** The zoomed view on a phone, in px, round the device's own kid (L2-034 criterion 5). */
  zoomWidth: 440,
  zoomHeight: 620,
  zoomLift: 70,
} as const;

export interface GroundPoint {
  readonly x: number;
  readonly z: number;
}

/** The angle of desk n round the ring, from the front, clockwise as seen from above. */
export function deskAngle(desk: number, tourLength: number): number {
  return ((90 + ((desk - 1) * 360) / tourLength) * Math.PI) / 180;
}

/** Where desk n stands on the floor. */
export function deskPoint(desk: number, tourLength: number): GroundPoint {
  const angle = deskAngle(desk, tourLength);
  return {
    x: RoomPlan.ringRadius * Math.cos(angle),
    z: RoomPlan.ringRadius * Math.sin(angle),
  };
}

/** Where a figure stands: behind its desk when seated, on the path in front when travelling. */
export function spotPoint(spot: ClassroomSpot, tourLength: number): GroundPoint {
  const desk = deskPoint(spot.desk, tourLength);
  return {
    x: desk.x,
    z: desk.z + (spot.travelling ? RoomPlan.pathShift : -RoomPlan.seatBack),
  };
}

/** A rectangle of the plan, in px. */
export interface PlanFrame {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Where a point on the floor is drawn on the plan, in px. */
export function planOf(point: GroundPoint): { x: number; y: number } {
  return {
    x: RoomPlan.centreX + point.x * RoomPlan.pxPerMetre,
    y: RoomPlan.centreY + point.z * RoomPlan.pxPerMetre * Math.sin(RoomPlan.elevation),
  };
}

/** The whole room, as World Map draws it from 768 px. */
export const WHOLE_ROOM: PlanFrame = { x: 0, y: 0, width: RoomPlan.width, height: RoomPlan.height };

/** The zoomed view round a point on the floor, as `RoomLayout` zooms to the child's own kid. */
export function zoomFrame(point: GroundPoint): PlanFrame {
  const centre = planOf(point);
  return {
    x: centre.x - RoomPlan.zoomWidth / 2,
    y: centre.y - RoomPlan.zoomLift - RoomPlan.zoomHeight / 2,
    width: RoomPlan.zoomWidth,
    height: RoomPlan.zoomHeight,
  };
}

/** An orthographic camera's frustum, in metres of the screen round the centre of the rug. */
export interface Frustum {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * The frustum that shows a frame of the plan on a canvas of this aspect, as SVG's
 * `preserveAspectRatio` does: `meet` shows the whole frame, `slice` fills the canvas.
 */
export function frustumOf(frame: PlanFrame, aspect: number, fit: 'meet' | 'slice'): Frustum {
  const metres = RoomPlan.pxPerMetre;
  let width = frame.width / metres;
  let height = frame.height / metres;
  const centreX = (frame.x + frame.width / 2 - RoomPlan.centreX) / metres;
  const centreY = (RoomPlan.centreY - frame.y - frame.height / 2) / metres;
  const wider = aspect > width / height;
  if (wider === (fit === 'meet')) width = height * aspect;
  else height = width / aspect;
  return {
    left: centreX - width / 2,
    right: centreX + width / 2,
    top: centreY + height / 2,
    bottom: centreY - height / 2,
  };
}
