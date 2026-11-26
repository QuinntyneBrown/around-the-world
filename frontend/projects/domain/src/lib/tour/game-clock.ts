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
 * `pause()` holds the game time and `resume()` lets it run on from there, never counting the
 * wall time between, so every wait on it waits while a game is paused (docs/adr/0027).
 */
export class GameClock {
  private readonly startedAt: number;
  private waiting: Waiting[] = [];
  private nextId = 1;
  /** The time of the callback running, while one runs. */
  private running: number | null = null;
  /** The wall time spent paused, before the pause going on, if any. */
  private heldMs = 0;
  /** The wall time the clock was paused at, while it is paused. */
  private pausedAt: number | null = null;

  constructor(private readonly wallNow: () => number) {
    this.startedAt = wallNow();
  }

  /** The game time in milliseconds since the clock started. */
  now(): number {
    return this.running ?? this.gameNow();
  }

  /** Whether the game time is held. */
  get paused(): boolean {
    return this.pausedAt !== null;
  }

  /** Holds the game time where it is; nothing runs until `resume()`. */
  pause(): void {
    if (this.pausedAt === null) this.pausedAt = this.wallNow();
  }

  /** Lets the game time run on from where it was held. */
  resume(): void {
    if (this.pausedAt === null) return;
    this.heldMs += this.wallNow() - this.pausedAt;
    this.pausedAt = null;
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
    if (this.paused) return;
    const now = this.gameNow();
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

  private gameNow(): number {
    return (this.pausedAt ?? this.wallNow()) - this.startedAt - this.heldMs;
  }
}
