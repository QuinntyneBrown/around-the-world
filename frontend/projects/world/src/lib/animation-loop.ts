/** How the loop reaches the browser's frames, so a unit test can give it fake ones. */
export interface FrameSource {
  request(callback: (now: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

export const browserFrames: FrameSource = {
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
  now: () => performance.now(),
};

/**
 * The classroom's one `requestAnimationFrame` loop (docs/adr/0028). It draws a frame with the
 * time since the last, pauses while the page is hidden and runs again when it is shown, and
 * `dispose()` cancels the frame asked for and stops listening (L2-048 criterion 3).
 */
export class AnimationLoop {
  private frame = 0;
  private last = 0;
  private running = false;
  private disposed = false;

  constructor(
    private readonly draw: (ms: number) => void,
    private readonly frames: FrameSource = browserFrames,
    private readonly page: Document = document,
  ) {
    page.addEventListener('visibilitychange', this.visibilityChanged);
  }

  /** Whether a frame is asked for now. */
  get drawing(): boolean {
    return this.frame !== 0;
  }

  start(): void {
    if (this.disposed) return;
    this.running = true;
    this.resume();
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    this.pause();
    this.page.removeEventListener('visibilitychange', this.visibilityChanged);
  }

  private resume(): void {
    if (this.frame || !this.running || this.page.hidden) return;
    this.last = this.frames.now();
    this.frame = this.frames.request(this.tick);
  }

  private pause(): void {
    if (this.frame) this.frames.cancel(this.frame);
    this.frame = 0;
  }

  private readonly visibilityChanged = () => {
    if (this.page.hidden) this.pause();
    else this.resume();
  };

  private readonly tick = (now: number) => {
    this.frame = this.frames.request(this.tick);
    const ms = Math.max(0, now - this.last);
    this.last = now;
    this.draw(ms);
  };
}
