import { type ClassroomFigure, type ClassroomState } from '@atw/api';
import { BoxGeometry, Group, type Material, Mesh, MeshLambertMaterial, type Object3D } from 'three';
import { ClassroomScene, landmarkName, type SceneTemplates } from './classroom-scene';
import { HOP_SECONDS } from './kid-character';
import { Palette } from './palette';
import { QUALITY_STEPS } from './quality-scaler';
import { planOf, RoomPlan } from './room-plan';

const COUNTRIES = ['France', 'Egypt', 'Japan', 'UK', 'Italy', 'USA'];

/** A part of a scene: a box with a material of that name. */
function part(name: string, material = name): Mesh {
  const mesh = new Mesh(
    new BoxGeometry(0.1, 0.1, 0.1),
    new MeshLambertMaterial({ name: material }),
  );
  mesh.name = name;
  return mesh;
}

function named(name: string, ...children: Object3D[]): Group {
  const node = new Group();
  node.name = name;
  node.add(...children);
  return node;
}

/** The two scenes as the stand-in exports them, cut down to what the classroom reads. */
function templates(): SceneTemplates {
  const room = named(
    'room',
    part('floor'),
    named('rug', part('rug-top', 'rug'), part('rug-ring-detail', 'rug-line')),
    part('path-dot', 'path'),
    named('desk', part('desk-top'), part('desk-apron', 'desk-side')),
    part('shadow'),
    ...COUNTRIES.map((country) => part(landmarkName(country), 'landmark-stone')),
  );
  const kid = (id: string, ...extra: Object3D[]) =>
    named(`kid-${id}`, part('body', 'kid-body'), part('leg', 'kid-deep'), ...extra);
  const cast = named(
    'cast',
    kid('zuri', part('pencil')),
    kid('kenji'),
    kid('nia'),
    kid('milo', named('bolt', part('bolt-body', 'metal-light'))),
    kid('pip'),
    kid('classmate'),
  );
  return { room, cast };
}

const TOKENS: Record<string, string> = {
  '--color-kid-zuri': '#ffc83d',
  '--color-kid-zuri-deep': '#f2a900',
  '--color-kid-milo': '#22c768',
  '--color-kid-milo-deep': '#0e7a3c',
  '--color-classmate': '#a0a8bd',
  '--palette-white': '#ffffff',
};
const palette = new Palette((token) => TOKENS[token] ?? '');

function figure(id: string, extra: Partial<ClassroomFigure> = {}): ClassroomFigure {
  return {
    id,
    kid: 'zuri',
    desk: 2,
    travelling: false,
    you: false,
    animation: 'idle',
    from: null,
    ...extra,
  };
}

function stateOf(figures: ClassroomFigure[], lit: number[] = []): ClassroomState {
  return {
    desks: COUNTRIES.map((country, index) => ({
      desk: index + 1,
      country,
      lit: lit.includes(index + 1),
    })),
    figures,
    focusDesk: null,
  };
}

function colourOf(mesh: Object3D | undefined): string {
  return ((mesh as Mesh).material as MeshLambertMaterial).color.getHexString();
}

describe('ClassroomScene', () => {
  it('builds a desk for each country of the tour, each with its landmark (L2-036 1)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([]));
    expect(scene.deskCount).toBe(6);
    expect(scene.landmarks()).toEqual([
      'landmark-france',
      'landmark-egypt',
      'landmark-japan',
      'landmark-uk',
      'landmark-italy',
      'landmark-usa',
    ]);
  });

  it('lights the desk the traveller is at and the next stop (L2-034 1)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([], [3, 4]));
    expect(scene.litDesks()).toEqual([3, 4]);
    scene.show(stateOf([], [4, 5]));
    expect(scene.litDesks()).toEqual([4, 5]);
  });

  it('seats a desk holder behind their desk and stands the traveller on the path (L2-034 1)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a', { desk: 1 }), figure('b', { desk: 1, travelling: true })]));
    expect(planOf(scene.figure('a')!.position).y).toBeCloseTo(402 + 210 - 18, 6);
    expect(planOf(scene.figure('b')!.position).y).toBeCloseTo(402 + 210 + 38, 6);
  });

  it('gives each kid their own colour and a classmate the calmer one (L2-037 1 and 6)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('z'), figure('c', { kid: 'classmate', desk: 3 })]));
    expect(colourOf(scene.figure('z')!.root.getObjectByName('body'))).toBe('ffc83d');
    expect(colourOf(scene.figure('z')!.root.getObjectByName('leg'))).toBe('f2a900');
    expect(colourOf(scene.figure('c')!.root.getObjectByName('body'))).toBe('a0a8bd');
  });

  it('shows Milo with his robot Bolt, and each kid with their accessory (L2-037 3 and 5)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('m', { kid: 'milo' }), figure('z', { desk: 3 })]));
    expect(scene.figure('m')!.root.getObjectByName('bolt')).toBeDefined();
    expect(scene.figure('z')!.root.getObjectByName('pencil')).toBeDefined();
    expect(scene.figure('z')!.root.getObjectByName('bolt')).toBeUndefined();
  });

  it('plays the animation of the moment for each figure (L2-037 2)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a', { animation: 'thinking' })]));
    expect(scene.figure('a')!.animation).toBe('thinking');
    scene.show(stateOf([figure('a', { animation: 'winCheer' })]));
    expect(scene.figure('a')!.animation).toBe('winCheer');
    scene.show(stateOf([figure('a', { animation: 'soClose' })]));
    expect(scene.figure('a')!.animation).toBe('soClose');
  });

  it('walks along the dotted ring with its root on the floor and arrives at the next desk (L2-034 3)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(
      stateOf([
        figure('t', {
          desk: 3,
          travelling: true,
          animation: 'hop',
          from: { desk: 2, travelling: true },
        }),
      ]),
    );
    const traveller = scene.figure('t')!;
    const target = scene.pointOf({ desk: 3, travelling: true });
    expect(
      traveller.position.distanceTo(scene.pointOf({ desk: 2, travelling: true })),
    ).toBeLessThan(0.001);
    scene.update(HOP_SECONDS / 2, false, null);
    expect(traveller.animation).toBe('hop');
    expect(traveller.position.y).toBe(0);
    expect(Math.hypot(traveller.position.x, traveller.position.z - RoomPlan.pathShift)).toBeCloseTo(
      RoomPlan.ringRadius,
    );
    scene.update(HOP_SECONDS / 2, false, null);
    expect(traveller.position.distanceTo(target)).toBeLessThan(0.001);
    expect(traveller.animation).toBe('idle');
  });

  it('hops a figure that moved between two states', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('t', { desk: 2, travelling: true })]));
    scene.show(stateOf([figure('t', { desk: 3, travelling: true })]));
    expect(scene.figure('t')!.hopping).toBe(true);
  });

  it('fades a hop out where the kid stands and in at the next desk under reduced motion, 200 ms in all (L2-038 4)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('t', { desk: 2, travelling: true })]));
    scene.show(stateOf([figure('t', { desk: 3, travelling: true })]));
    const kid = scene.figure('t')!;
    const from = scene.pointOf({ desk: 2, travelling: true });
    const to = scene.pointOf({ desk: 3, travelling: true });

    // Half way out: still where it stood, nothing moves across the screen
    scene.update(0.05, true, null);
    expect(kid.position.distanceTo(from)).toBeLessThan(0.001);
    expect(kid.opacity).toBeCloseTo(0.5);

    // Half way in: already at the next desk, on the floor
    scene.update(0.1, true, null);
    expect(kid.position.distanceTo(to)).toBeLessThan(0.001);
    expect(kid.opacity).toBeCloseTo(0.5);

    // After 200 ms: there, whole, and the hop is over
    scene.update(0.05, true, null);
    expect(kid.hopping).toBe(false);
    expect(kid.opacity).toBe(1);
    expect(kid.animation).toBe('idle');
  });

  it('fades one kid without fading another kid of the same cast (L2-038 4)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('t', { travelling: true }), figure('h', { desk: 4 })]));
    scene.show(stateOf([figure('t', { desk: 3, travelling: true }), figure('h', { desk: 4 })]));
    scene.update(0.05, true, null);
    const opacities = (id: string) => {
      const found: number[] = [];
      scene.figure(id)!.root.traverse((node) => {
        const mesh = node as Mesh;
        if (mesh.isMesh) found.push((mesh.material as Material).opacity);
      });
      return found;
    };
    expect(opacities('t').every((opacity) => opacity < 1)).toBe(true);
    expect(opacities('h').every((opacity) => opacity === 1)).toBe(true);
  });

  it('leaves the small decorations out and swaps the shadows at the lower steps (L2-036 4)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a')]));
    const detail = scene.root.getObjectByName('rug-ring-detail')!;
    const shadow = scene.root.getObjectByName('shadow')!;
    scene.applyStep(QUALITY_STEPS[0]);
    expect(detail.visible).toBe(true);
    expect(shadow.visible).toBe(false);
    scene.applyStep(QUALITY_STEPS[QUALITY_STEPS.length - 1]);
    expect(detail.visible).toBe(false);
    expect(shadow.visible).toBe(true);
  });

  it('makes every material again once when the shadows change', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a')]));
    scene.applyStep(QUALITY_STEPS[0]);
    const floor = scene.root.getObjectByName('floor') as Mesh;
    const material = floor.material as Material;
    const version = material.version;
    scene.applyStep(QUALITY_STEPS[1]);
    expect(material.version).toBe(version);
    scene.applyStep(QUALITY_STEPS[2]);
    expect(material.version).toBeGreaterThan(version);
  });

  it('removes a figure no longer shown and disposes the materials coloured for it', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a')]));
    const body = scene.figure('a')!.root.getObjectByName('body') as Mesh;
    const disposed = vi.spyOn(body.material as Material, 'dispose');
    scene.show(stateOf([]));
    expect(scene.figure('a')).toBeUndefined();
    expect(disposed).toHaveBeenCalled();
  });

  it('disposes every kid and the materials it made on dispose (L2-048 3)', () => {
    const scene = new ClassroomScene(templates(), palette);
    scene.show(stateOf([figure('a'), figure('b', { desk: 3 })], [3]));
    const materials = ['a', 'b'].map(
      (id) => (scene.figure(id)!.root.getObjectByName('body') as Mesh).material as Material,
    );
    const spies = materials.map((material) => vi.spyOn(material, 'dispose'));
    scene.dispose();
    for (const spy of spies) expect(spy).toHaveBeenCalled();
    expect(scene.root.children).toHaveLength(0);
  });
});
