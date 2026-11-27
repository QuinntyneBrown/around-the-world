import { type ClassroomFigure, type ClassroomSpot, type ClassroomState } from '@atw/api';
import {
  type AnimationClip,
  Group,
  InstancedMesh,
  type Material,
  type Mesh,
  Matrix4,
  type Object3D,
  Vector3,
} from 'three';
import { KidCharacter } from './kid-character';
import { type Palette } from './palette';
import { type QualityStep } from './quality-scaler';
import { releaseMaterial } from './release';
import { deskAngle, deskPoint, RoomPlan, spotPoint } from './room-plan';

/** The two scenes the classroom is built from (docs/adr/0028): the room and the cast. */
export interface SceneTemplates {
  readonly room: Object3D;
  readonly cast: Object3D;
  readonly walks?: ReadonlyMap<string, AnimationClip>;
}

/** The dots of the path round the ring. */
const PATH_DOTS = 72;
/** A landmark stands on its desk's top. */
const DESK_TOP = 0.4;

/** The node of a country's landmark: "landmark-usa" for USA. */
export function landmarkName(country: string): string {
  return `landmark-${country.toLowerCase().replace(/[^a-z]/g, '')}`;
}

/** A desk as built: its node, its top and its landmark. */
interface BuiltDesk {
  readonly node: Group;
  readonly top: Mesh[];
  readonly landmark: Object3D | null;
}

/**
 * The classroom (docs/detailed-designs/classroom/draw-classroom/): the floor, the world-map
 * rug, the dotted path and a ring of desks, one for each country of the tour with its landmark
 * on it (L2-036 criterion 1), and a `KidCharacter` for each figure. Each desk holder is at their
 * desk and the traveller beside a desk, on the path; the desk the traveller is at and the next
 * stop are lit (L2-034 criterion 1). A moving figure walks to its new spot.
 * Its parts are clones of the two scenes, which own every geometry; the scene owns only the
 * materials it makes (the lit desk top, the kids' colours).
 */
export class ClassroomScene {
  readonly root = new Group();
  private readonly interior: Object3D | null;
  private readonly desks = new Group();
  private readonly figures = new Map<string, KidCharacter>();
  private readonly deskTop: Material | null;
  private readonly litDeskTop: Material | null;
  private readonly path: InstancedMesh | null;
  private built: BuiltDesk[] = [];
  private builtFor = '';
  private tourLength = 0;
  private step: QualityStep | null = null;

  constructor(
    private readonly templates: SceneTemplates,
    private readonly palette: Palette,
  ) {
    this.root.name = 'classroom';
    this.interior = this.part(templates.room, 'classroom-interior');
    if (this.interior) this.root.add(this.interior);
    for (const name of ['floor', 'rug']) {
      const part = this.part(templates.room, name);
      if (part) this.root.add(part);
    }
    const top = this.findMesh(templates.room, 'desk-top');
    this.deskTop = top ? (top.material as Material) : null;
    this.litDeskTop = this.deskTop ? this.deskTop.clone() : null;
    const lit = palette.litDeskTop();
    if (lit)
      (
        this.litDeskTop as (Material & { color?: { setStyle(s: string): void } }) | null
      )?.color?.setStyle(lit);

    const dot = this.findMesh(templates.room, 'path-dot');
    this.path = dot ? new InstancedMesh(dot.geometry, dot.material, PATH_DOTS) : null;
    if (dot && this.path) {
      this.path.name = 'path';
      const matrix = new Matrix4();
      for (let index = 0; index < PATH_DOTS; index++) {
        const angle = (index / PATH_DOTS) * Math.PI * 2;
        matrix.makeTranslation(
          RoomPlan.ringRadius * Math.cos(angle),
          dot.position.y,
          RoomPlan.ringRadius * Math.sin(angle) + RoomPlan.pathShift,
        );
        this.path.setMatrixAt(index, matrix);
      }
      this.root.add(this.path);
    }
    this.root.add(this.desks);
  }

  /** How many desks the ring has. */
  get deskCount(): number {
    return this.built.length;
  }

  /** The landmarks on the desks, in order from desk 1, by their nodes' names. */
  landmarks(): (string | null)[] {
    return this.built.map(({ landmark }) => landmark?.name ?? null);
  }

  /** The desks that are lit, by number. */
  litDesks(): number[] {
    return this.built.flatMap(({ top }, index) =>
      top.some((mesh) => mesh.material === this.litDeskTop) ? [index + 1] : [],
    );
  }

  /** The kid of a figure, by player id, or undefined when it is not in the classroom. */
  figure(id: string): KidCharacter | undefined {
    return this.figures.get(id);
  }

  /** Where a spot is on the floor in this tour. */
  pointOf(spot: ClassroomSpot): Vector3 {
    const point = spotPoint(spot, this.tourLength);
    return new Vector3(point.x, 0, point.z);
  }

  /** Shows the state: builds the ring when the desks change, then places every figure. */
  show(state: ClassroomState): void {
    const key = state.desks.map(({ country }) => country).join('|');
    const rebuilt = key !== this.builtFor;
    if (rebuilt) this.buildDesks(state);
    state.desks.forEach(({ lit }, index) => {
      for (const mesh of this.built[index]?.top ?? []) {
        mesh.material = (lit ? this.litDeskTop : this.deskTop) ?? mesh.material;
      }
    });

    const shown = new Set(state.figures.map(({ id }) => id));
    for (const [id, figure] of this.figures) {
      if (!shown.has(id)) {
        figure.dispose();
        this.figures.delete(id);
      }
    }
    for (const figure of state.figures) this.showFigure(figure, rebuilt);
  }

  /** Moves every kid's animation on, each turned to face a point (the camera) if given. */
  update(seconds: number, still: boolean, facing: Vector3 | null): void {
    for (const figure of this.figures.values()) {
      figure.update(seconds, still);
      if (figure.hopping && !still) continue;
      if (facing) figure.face(facing);
      else figure.root.rotation.y = 0;
    }
  }

  /** The classroom from inside faces its furnishings. The map shows the open tabletop. */
  frameRoom(camera: Vector3 | null, closeUp = false): void {
    if (!this.interior) return;
    this.interior.visible = camera !== null;
    if (camera) this.interior.rotation.y = closeUp ? Math.PI / 2 : Math.atan2(camera.x, camera.z);
    const board = this.root.getObjectByName('floor');
    if (board) board.visible = camera === null;
  }

  /** Applies a step of detail: blob shadows or a shadow map, and the small decorations. */
  applyStep(step: QualityStep): void {
    // Shadows change how every material is drawn, so each is made again once (three.js needs
    // `needsUpdate` when the shadow map is switched on or off after the first frame).
    const shadowsChanged = this.step !== null && this.step.shadows !== step.shadows;
    this.step = step;
    this.root.traverse((node) => {
      if (node.name === 'shadow') {
        node.visible = step.shadows === 'blob';
        return;
      }
      if (node.name.endsWith('-detail')) node.visible = step.detail === 'high';
      const mesh = node as Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = step.shadows === 'map';
      mesh.receiveShadow = step.shadows === 'map';
      if (shadowsChanged)
        for (const material of [mesh.material].flat()) material.needsUpdate = true;
    });
  }

  /** Disposes the kids and the materials the scene made; the scenes' parts are the caller's. */
  dispose(): void {
    for (const figure of this.figures.values()) figure.dispose();
    this.figures.clear();
    this.path?.dispose();
    if (this.litDeskTop) releaseMaterial(this.litDeskTop);
    this.root.clear();
  }

  private showFigure(figure: ClassroomFigure, rebuilt: boolean): void {
    let kid = this.figures.get(figure.id);
    const target = this.pointOf(figure);
    if (!kid || kid.kid !== figure.kid) {
      kid?.dispose();
      kid = this.makeKid(figure);
      this.figures.set(figure.id, kid);
      if (figure.animation === 'hop' && figure.from) {
        kid.place(this.pointOf(figure.from));
        kid.hopTo(target);
      } else {
        kid.place(target);
        kid.play(figure.animation);
      }
      return;
    }
    const moved = kid.position.distanceTo(target) > 0.01 && !kid.hopping;
    if (rebuilt) kid.place(target);
    else if (moved) kid.hopTo(target);
    if (figure.animation !== 'hop' && !kid.hopping) kid.play(figure.animation);
  }

  private makeKid(figure: ClassroomFigure): KidCharacter {
    const template =
      this.templates.cast.getObjectByName(`kid-${figure.kid}`) ??
      this.templates.cast.getObjectByName('kid-classmate');
    if (!template) throw new Error(`The cast has no kid-${figure.kid}`);
    const kid = new KidCharacter(
      template,
      figure.kid,
      this.palette,
      this.templates.walks?.get(figure.kid),
    );
    const blob = this.part(this.templates.room, 'shadow');
    if (blob) {
      blob.scale.setScalar(0.6);
      kid.carry(blob);
    }
    this.root.add(kid.root);
    if (this.step) this.applyStep(this.step);
    return kid;
  }

  private buildDesks(state: ClassroomState): void {
    this.tourLength = state.desks.length;
    this.builtFor = state.desks.map(({ country }) => country).join('|');
    this.desks.clear();
    this.built = state.desks.map(({ desk, country }) => {
      const node = new Group();
      node.name = `desk-${desk}`;
      const point = deskPoint(desk, this.tourLength);
      node.position.set(point.x, 0, point.z);
      // Each desk turns its front to the centre of the rug.
      node.rotation.y = -deskAngle(desk, this.tourLength) - Math.PI / 2;
      const model = this.part(this.templates.room, 'desk');
      const top: Mesh[] = [];
      if (model) {
        node.add(model);
        model.traverse((part) => {
          const mesh = part as Mesh;
          if (mesh.isMesh && mesh.material === this.deskTop) top.push(mesh);
        });
      }
      const blob = this.part(this.templates.room, 'shadow');
      if (blob) node.add(blob);
      const landmark = this.part(this.templates.room, landmarkName(country));
      if (landmark) {
        landmark.position.set(0, DESK_TOP, 0);
        landmark.rotation.y = Math.PI / 2;
        node.add(landmark);
      }
      this.desks.add(node);
      return { node, top, landmark };
    });
    if (this.step) this.applyStep(this.step);
  }

  /** A copy of a part of a scene, sharing its geometry and materials. */
  private part(scene: Object3D, name: string): Object3D | null {
    return scene.getObjectByName(name)?.clone(true) ?? null;
  }

  private findMesh(scene: Object3D, name: string): Mesh | null {
    let found: Mesh | null = null;
    scene.traverse((node) => {
      const mesh = node as Mesh;
      if (!found && mesh.isMesh && (mesh.name === name || this.materialName(mesh) === name)) {
        found = mesh;
      }
    });
    return found;
  }

  private materialName(mesh: Mesh): string {
    return Array.isArray(mesh.material) ? '' : mesh.material.name;
  }
}
