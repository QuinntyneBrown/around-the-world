import { ThreeClassroomRenderer } from './three-classroom-renderer';

describe('ThreeClassroomRenderer', () => {
  it('refuses to draw on a device with no WebGL, so the still picture stands in (L2-036 3)', async () => {
    const canvas = document.createElement('canvas');
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);
    await expect(new ThreeClassroomRenderer().mount(canvas)).rejects.toEqual({ code: 'noWebGL' });
  });

  it('can be disposed before it was ever mounted, and twice', () => {
    const renderer = new ThreeClassroomRenderer();
    renderer.dispose();
    expect(() => renderer.dispose()).not.toThrow();
  });
});
