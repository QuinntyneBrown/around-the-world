/** The timers a `PausableTimer` runs on: the browser's, or a test's. */
export interface TimerHost {
  now(): number;
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const BROWSER: TimerHost = {
  now: () => Date.now(),
  setTimeout: (callback, ms) => setTimeout(callback, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Calls `done` once, `ms` after it starts, not counting the time it is paused: a passing
 * message leaves after 4 seconds, waiting while it is pointed at or focused
 * (docs/design-system/components/toast.html). `stop` releases it.
 */
export class PausableTimer {
  private handle: unknown = null;
  private left: number;
  private startedAt = 0;
  private finished = false;

  constructor(
    ms: number,
    private readonly done: () => void,
    private readonly host: TimerHost = BROWSER,
  ) {
    this.left = ms;
  }

  /** Starts, or runs on after a pause; nothing when running or finished. */
  resume(): void {
    if (this.finished || this.handle !== null) return;
    this.startedAt = this.host.now();
    this.handle = this.host.setTimeout(() => {
      this.handle = null;
      this.finished = true;
      this.done();
    }, this.left);
  }

  /** Holds the time left; nothing when not running. */
  pause(): void {
    if (this.handle === null) return;
    this.host.clearTimeout(this.handle);
    this.handle = null;
    this.left = Math.max(0, this.left - (this.host.now() - this.startedAt));
  }

  /** Never calls `done`. */
  stop(): void {
    this.pause();
    this.finished = true;
  }
}
