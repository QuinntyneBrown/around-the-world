/** One step of the classroom's detail (docs/adr/0028). */
export interface QualityStep {
  /** The resolution, as a ratio of CSS pixels; never above the device's own. */
  readonly pixelRatio: number;
  /** Real shadows from a shadow map, or the cheap baked blob under each kid and desk. */
  readonly shadows: 'map' | 'blob';
  /** At `low` the small decorations (the parts named `*-detail`) are not drawn. */
  readonly detail: 'high' | 'low';
}

/**
 * The steps, from the most detail to the least. Each takes the cheap form of a technique before
 * the next drops anything (AGENTS.md, Low-power rendering): first a lower resolution, then the
 * baked blob shadows in place of the shadow map, then the small decorations, then a lower
 * resolution again. The last step still draws the whole classroom.
 */
export const QUALITY_STEPS: readonly QualityStep[] = [
  { pixelRatio: 1.5, shadows: 'map', detail: 'high' },
  { pixelRatio: 1, shadows: 'map', detail: 'high' },
  { pixelRatio: 1, shadows: 'blob', detail: 'high' },
  { pixelRatio: 0.75, shadows: 'blob', detail: 'low' },
  { pixelRatio: 0.5, shadows: 'blob', detail: 'low' },
];

/** The frame rate below which the detail is scaled back (L2-036 criterion 4). */
const SLOWEST_FPS = 30;
/** How long the classroom is measured before each decision. */
const WINDOW_MS = 2000;
/** A gap this long is a pause (a hidden page), not a slow frame. */
const PAUSE_MS = 1000;

/**
 * Measures the classroom's frame rate and steps its detail down when it draws below 30 frames
 * a second for 2 seconds, measuring again after each step until it draws at 30 or more
 * (L2-036 criterion 4, docs/adr/0028). It never steps back up.
 */
export class QualityScaler {
  private elapsed = 0;
  private frames = 0;

  constructor(private index = 0) {}

  get step(): QualityStep {
    return QUALITY_STEPS[this.index];
  }

  /** The step's index, so the next screen can start where this one ended. */
  get level(): number {
    return this.index;
  }

  /** Counts one frame drawn after `ms`; true when the detail has just stepped down. */
  frame(ms: number): boolean {
    if (ms > PAUSE_MS) {
      this.restart();
      return false;
    }
    this.elapsed += ms;
    this.frames++;
    if (this.elapsed < WINDOW_MS) return false;
    const fps = (this.frames * 1000) / this.elapsed;
    this.restart();
    if (fps >= SLOWEST_FPS || this.index === QUALITY_STEPS.length - 1) return false;
    this.index++;
    return true;
  }

  private restart(): void {
    this.elapsed = 0;
    this.frames = 0;
  }
}
