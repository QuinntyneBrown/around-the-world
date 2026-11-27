import {
  type ClassroomError,
  type ClassroomRenderer,
  type ClassroomState,
  type ClassroomView,
} from '@atw/api';
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MathUtils,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { AnimationLoop } from './animation-loop';
import { ClassroomScene, type SceneTemplates } from './classroom-scene';
import { Palette } from './palette';
import { QualityScaler } from './quality-scaler';
import { releaseTree } from './release';
import { deskAngle, frustumOf, RoomPlan, spotPoint, WHOLE_ROOM, zoomFrame } from './room-plan';
import { loadScenes } from './scene-assets';

/** The step of detail a device reached, so the next screen with the classroom starts there. */
let reachedStep = 0;

/** Half the width a view behind the interface takes in, as an angle. */
const BEHIND_HALF_WIDTH = (24 * Math.PI) / 180;

/** Shadow maps are small: the cheap form of a real shadow. */
const SHADOW_MAP_SIZE = 512;

/**
 * The classroom drawn with Three.js (docs/detailed-designs/classroom/draw-classroom/,
 * docs/adr/0028): one WebGL renderer on the canvas it is given, one `AnimationLoop`, paused
 * while the page is hidden, a `ClassroomScene` for the content and a
 * `QualityScaler` for its detail. `dispose()` stops the loop and releases every geometry,
 * material, texture, render target and the renderer itself, and loses the WebGL context so
 * the device gets its memory back at once (L2-048 criterion 3).
 */
export class ThreeClassroomRenderer implements ClassroomRenderer {
  private readonly aborting = new AbortController();
  private canvas: HTMLCanvasElement | null = null;
  private context: WebGL2RenderingContext | null = null;
  private renderer: WebGLRenderer | null = null;
  private templates: SceneTemplates | null = null;
  private classroom: ClassroomScene | null = null;
  private readonly scene = new Scene();
  private readonly above = new OrthographicCamera();
  private readonly behind = new PerspectiveCamera(40, 1, 0.1, 100);
  private readonly sun = new DirectionalLight(0xffffff, 1.6);
  private readonly scaler = new QualityScaler(reachedStep);
  private resizing: ResizeObserver | null = null;
  private stillMotion: MediaQueryList | null = null;
  private state: ClassroomState | null = null;
  private view: ClassroomView = 'behind';
  private loop: AnimationLoop | null = null;
  private disposed = false;

  constructor() {
    this.scene.add(new HemisphereLight(0xffffff, 0xbfd8ff, 2.4));
    this.sun.position.set(3, 8, 5);
    this.sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
    Object.assign(this.sun.shadow.camera, {
      left: -7,
      right: 7,
      top: 7,
      bottom: -7,
      near: 1,
      far: 25,
    });
    this.scene.add(this.sun);
  }

  async mount(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    // The canvas's own background is the scene's sky; an opaque canvas is the cheap one to
    // composite, and the one a shadow map draws correctly on.
    const palette = Palette.of(canvas);
    const background = palette.background();
    const opaque = background !== '' && !/rgba\(.*,\s*0\)$|transparent/.test(background);
    this.context = canvas.getContext('webgl2', {
      alpha: !opaque,
      antialias: false,
      powerPreference: 'low-power',
    });
    if (!this.context) throw classroomError('noWebGL');
    try {
      this.templates = await loadScenes(palette, this.aborting.signal);
    } catch {
      throw classroomError('sceneFailed');
    }
    if (this.disposed) {
      this.release();
      return;
    }
    const renderer = new WebGLRenderer({ canvas, context: this.context });
    this.renderer = renderer;
    renderer.shadowMap.type = PCFShadowMap;
    const colour = new Color();
    if (opaque) colour.setStyle(background);
    renderer.setClearColor(colour, opaque ? 1 : 0);

    this.classroom = new ClassroomScene(this.templates, palette);
    this.scene.add(this.classroom.root);
    this.applyStep();
    if (this.state) this.classroom.show(this.state);

    this.resizing = new ResizeObserver(() => this.resize());
    this.resizing.observe(canvas);
    this.resize();
    this.stillMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.loop = new AnimationLoop((ms) => this.drawFrame(ms));
    this.loop.start();
  }

  show(state: ClassroomState, view: ClassroomView, elapsedMs = 0): void {
    const firstFrame = this.state === null;
    this.state = state;
    this.view = view;
    this.classroom?.show(state);
    this.frameCamera();
    if (firstFrame) this.drawFrame(elapsedMs);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.aborting.abort();
    this.release();
  }

  private release(): void {
    this.loop?.dispose();
    this.loop = null;
    this.resizing?.disconnect();
    this.resizing = null;
    this.classroom?.dispose();
    this.classroom = null;
    if (this.templates) {
      releaseTree(this.templates.room);
      releaseTree(this.templates.cast);
      this.templates = null;
    }
    this.scene.clear();
    this.sun.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.forceContextLoss();
      this.renderer = null;
    } else {
      this.context?.getExtension('WEBGL_lose_context')?.loseContext();
    }
    this.context = null;
    this.canvas = null;
  }

  /** Draws one frame, `ms` after the last. */
  private drawFrame(ms: number): void {
    if (!this.renderer || !this.classroom) return;
    const still = this.stillMotion?.matches ?? false;
    const facing = this.view === 'behind' ? this.behind.position : null;
    this.classroom.update(ms / 1000, still, facing);
    if (this.scaler.frame(ms)) {
      reachedStep = this.scaler.level;
      this.applyStep();
    }
    this.renderer.render(this.scene, this.view === 'behind' ? this.behind : this.above);
  }

  /** Scales the detail to the scaler's step (L2-036 criterion 4). */
  private applyStep(): void {
    const step = this.scaler.step;
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(step.pixelRatio, devicePixelRatio || 1));
      this.renderer.shadowMap.enabled = step.shadows === 'map';
      this.sun.castShadow = step.shadows === 'map';
      this.resize();
    }
    this.classroom?.applyStep(step);
  }

  private resize(): void {
    if (!this.canvas || !this.renderer) return;
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.frameCamera();
  }

  /** Points the camera for the view (docs/adr/0028). */
  private frameCamera(): void {
    const width = this.canvas?.clientWidth || 1;
    const height = this.canvas?.clientHeight || 1;
    const aspect = width / height;
    if (this.view === 'behind') {
      this.behind.aspect = aspect;
      // Wide enough for the ring whatever the canvas's shape.
      const fov = 2 * Math.atan(Math.tan(BEHIND_HALF_WIDTH) / aspect);
      this.behind.fov = MathUtils.clamp(MathUtils.radToDeg(fov), 34, 72);
      const focus = this.state?.focusDesk ?? null;
      const tourLength = this.state?.desks.length ?? 12;
      if (focus === null) {
        // Home: the whole ring from the front, the kids at the front desks nearest.
        this.behind.position.set(0, 3.8, 9.4);
        this.behind.lookAt(0, 0.3, 1.6);
      } else {
        // Look across the desk so both faces frame the flash card. The holder stands
        // behind the desk in -z and the traveller on the path in +z.
        const angle = deskAngle(focus, tourLength);
        const deskX = RoomPlan.ringRadius * Math.cos(angle);
        const deskZ = RoomPlan.ringRadius * Math.sin(angle) + 0.2;
        const distance = Math.max(1.85, 1.6 / aspect);
        this.behind.position.set(deskX + distance, 0.84, deskZ + 0.12);
        this.behind.lookAt(deskX, 0.49, deskZ);
      }
      this.classroom?.frameRoom(this.behind.position, focus !== null);
      this.behind.updateProjectionMatrix();
      return;
    }
    this.classroom?.frameRoom(null);
    const zoomed = this.view === 'fromAboveZoomed';
    const you = this.state?.figures.find((figure) => figure.you);
    const frame =
      zoomed && you && this.state
        ? zoomFrame(spotPoint(you, this.state.desks.length))
        : zoomed
          ? zoomFrame({ x: 0, z: 0 })
          : WHOLE_ROOM;
    Object.assign(this.above, frustumOf(frame, aspect, zoomed ? 'slice' : 'meet'));
    this.above.near = 0.1;
    this.above.far = 100;
    const elevation = RoomPlan.elevation;
    this.above.position.set(0, Math.sin(elevation) * 30, Math.cos(elevation) * 30);
    this.above.up.set(0, 1, 0);
    this.above.lookAt(0, 0, 0);
    this.above.updateProjectionMatrix();
  }
}

function classroomError(code: ClassroomError['code']): ClassroomError {
  return { code };
}
