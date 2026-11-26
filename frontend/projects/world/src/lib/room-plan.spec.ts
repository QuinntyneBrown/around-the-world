import { deskPoint, frustumOf, planOf, spotPoint, WHOLE_ROOM, zoomFrame } from './room-plan';

describe('RoomPlan', () => {
  it.each([
    [1, 12, 600, 612],
    [4, 12, 180, 402],
    [7, 12, 600, 192],
    [10, 12, 1020, 402],
  ])(
    'draws desk %i of %i where World Map’s drawn room has it (%i, %i px)',
    (desk, length, x, y) => {
      const point = planOf(deskPoint(desk, length));
      expect(point.x).toBeCloseTo(x, 6);
      expect(point.y).toBeCloseTo(y, 6);
    },
  );

  it('seats a kid 18 px up the plan and puts the traveller on the path 38 px down', () => {
    expect(planOf(spotPoint({ desk: 1, travelling: false }, 6)).y).toBeCloseTo(594, 6);
    expect(planOf(spotPoint({ desk: 1, travelling: true }, 6)).y).toBeCloseTo(650, 6);
  });

  it('zooms round a kid as World Map’s drawn room does', () => {
    expect(zoomFrame({ x: 0, z: 0 })).toEqual({ x: 380, y: 22, width: 440, height: 620 });
  });

  it('shows the whole plan on a canvas of its own aspect', () => {
    expect(frustumOf(WHOLE_ROOM, 1200 / 760, 'meet')).toEqual({
      left: -6,
      right: 6,
      top: 4.02,
      bottom: expect.closeTo(-3.58, 6),
    });
  });

  it('widens a frame to meet a wider canvas and crops it to slice one', () => {
    const meet = frustumOf({ x: 0, y: 0, width: 1200, height: 760 }, 2, 'meet');
    expect(meet.right - meet.left).toBeCloseTo(15.2, 6);
    expect(meet.top - meet.bottom).toBeCloseTo(7.6, 6);
    const slice = frustumOf({ x: 0, y: 0, width: 1200, height: 760 }, 2, 'slice');
    expect(slice.right - slice.left).toBeCloseTo(12, 6);
    expect(slice.top - slice.bottom).toBeCloseTo(6, 6);
  });
});
