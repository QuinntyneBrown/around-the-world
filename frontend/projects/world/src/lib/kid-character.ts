import { type KidAnimation, type KidId } from '@atw/api';
import { Group, MathUtils, type Material, type Mesh, type Object3D, type Vector3 } from 'three';
import { type Palette } from './palette';

/** A hop takes about a second (AGENTS.md, Motion and sound); journey 10 gives it its sound. */
export const HOP_SECONDS = 1;
/** How high a hop goes, in metres. */
const HOP_HEIGHT = 0.45;
/** The win cheer: two jumps and a spin. */
const CHEER_SECONDS = 1.2;
/** The "so close": a gentle slump, held until the next moment. */
const SLUMP_SECONDS = 0.4;

/**
 * One kid in the classroom (docs/detailed-designs/classroom/draw-classroom/): the kid's model
 * from the cast's scene, coloured in the kid's colour, and the five animations: idle, thinking,
 * hop, win cheer and "so close" (L2-037 criterion 2). Milo's model holds his robot Bolt
 * (criterion 3); a classmate who is not one of the five kids is the plain bean in a calmer
 * colour (criterion 6). The model's geometries belong to the cast's scene; the kid owns only
 * the materials coloured for it.
 */
export class KidCharacter {
  /** Placed on the floor; the model inside it moves for the animations. */
  readonly root = new Group();
  private readonly model: Object3D;
  private readonly owned: Material[] = [];
  private current: KidAnimation = 'idle';
  private time = 0;
  private hop: { from: Vector3; to: Vector3; elapsed: number } | null = null;

  constructor(
    template: Object3D,
    readonly kid: KidId | 'classmate',
    palette: Palette,
  ) {
    this.model = template.clone(true);
    this.model.position.set(0, 0, 0);
    this.root.name = `figure-${kid}`;
    this.root.add(this.model);
    const colours = palette.kid(kid);
    const tinted = new Map<Material, Material>();
    this.model.traverse((node) => {
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      const material = mesh.material as Material & { color?: { setStyle(style: string): void } };
      const colour =
        material.name === 'kid-body'
          ? colours.body
          : material.name === 'kid-deep'
            ? colours.deep
            : '';
      if (!colour) return;
      let own = tinted.get(material);
      if (!own) {
        own = material.clone();
        (own as typeof material).color?.setStyle(colour);
        tinted.set(material, own);
        this.owned.push(own);
      }
      mesh.material = own;
    });
  }

  get animation(): KidAnimation {
    return this.current;
  }

  /** Whether a hop is under way. */
  get hopping(): boolean {
    return this.hop !== null;
  }

  get position(): Vector3 {
    return this.root.position;
  }

  /** Stands the kid at a point at once. */
  place(point: Vector3): void {
    this.hop = null;
    this.root.position.copy(point);
  }

  /** Hops from where the kid stands to a point (docs/adr/0028). */
  hopTo(point: Vector3): void {
    this.hop = { from: this.root.position.clone(), to: point.clone(), elapsed: 0 };
    this.play('hop');
  }

  play(animation: KidAnimation): void {
    if (animation === this.current) return;
    this.current = animation;
    this.time = 0;
  }

  /** Turns the kid to look towards a point on the floor. */
  face(point: Vector3): void {
    this.root.rotation.y = Math.atan2(
      point.x - this.root.position.x,
      point.z - this.root.position.z,
    );
  }

  /** Moves the animation on; with `still` (reduced motion) every move ends at once. */
  update(seconds: number, still: boolean): void {
    this.time += seconds;
    const model = this.model;
    model.position.y = 0;
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    if (this.hop) {
      this.hop.elapsed += still ? HOP_SECONDS : seconds;
      const done = Math.min(1, this.hop.elapsed / HOP_SECONDS);
      this.root.position.lerpVectors(this.hop.from, this.hop.to, done);
      this.root.position.y = 4 * HOP_HEIGHT * done * (1 - done);
      if (done === 1) {
        this.hop = null;
        this.play('idle');
      }
      return;
    }

    switch (this.current) {
      case 'idle':
        if (!still) model.position.y = 0.015 * (1 + Math.sin(this.time * 2.4));
        break;
      case 'thinking':
        model.rotation.x = 0.06;
        if (!still) model.rotation.z = 0.08 * Math.sin(this.time * 1.8);
        break;
      case 'winCheer': {
        const done = still ? 1 : Math.min(1, this.time / CHEER_SECONDS);
        model.position.y = 0.3 * Math.abs(Math.sin(done * Math.PI * 2));
        model.rotation.y = done * Math.PI * 2;
        break;
      }
      case 'soClose': {
        const done = still ? 1 : Math.min(1, this.time / SLUMP_SECONDS);
        model.rotation.x = MathUtils.lerp(0, 0.22, done);
        model.scale.y = MathUtils.lerp(1, 0.92, done);
        break;
      }
      case 'hop':
        break;
    }
  }

  /** Disposes the materials coloured for this kid. */
  dispose(): void {
    this.root.removeFromParent();
    for (const material of this.owned.splice(0)) material.dispose();
  }
}
