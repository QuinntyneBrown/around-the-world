/** A callback waiting on the game's clock. */
interface Waiting {
  readonly id: number;
  readonly atMs: number;
  readonly run: () => void;
}

/**
 * The game's clock (docs/adr/0020-solo-duel-clock-and-states.md). It counts game time from
 * the wall clock it is given and runs each callback whose time has come when `tick()` is
 * called, in time order, with `now()` reading that callback's own time. It sets no timer of
 * its own, so a unit test drives it with a fake wall clock and a spec by holding `Date.now`.
 */
export class GameClock {
  private readonly startedAt: number;
  private waiting: Waiting[] = [];
  private nextId = 1;
  /** The time of the callback running, while one runs. */
  private running: number | null = null;

  constructor(private readonly wallNow: () => number) {
    this.startedAt = wallNow();
  }

  /** The game time in milliseconds since the clock started. */
  now(): number {
    return this.running ?? this.wallNow() - this.startedAt;
  }

  /** Runs the callback once the game time has moved on by `ms`; returns its handle. */
  after(ms: number, run: () => void): number {
    const id = this.nextId++;
    this.waiting.push({ id, atMs: this.now() + ms, run });
    return id;
  }

  /** Forgets a callback that has not run. */
  cancel(handle: number | null): void {
    if (handle !== null) this.waiting = this.waiting.filter((waiting) => waiting.id !== handle);
  }

  /** Forgets every callback that has not run. */
  clear(): void {
    this.waiting = [];
  }

  /** Runs, in time order, every callback whose time has come, including those they add. */
  tick(): void {
    const now = this.wallNow() - this.startedAt;
    for (;;) {
      const due = this.waiting
        .filter((waiting) => waiting.atMs <= now)
        .sort((one, other) => one.atMs - other.atMs || one.id - other.id)[0];
      if (!due) return;
      this.waiting = this.waiting.filter((waiting) => waiting !== due);
      this.running = due.atMs;
      try {
        due.run();
      } finally {
        this.running = null;
      }
    }
  }
}
