import { PausableTimer, type TimerHost } from './pausable-timer';

/** A clock the test moves on by hand: nothing waits. */
class FakeTimers implements TimerHost {
  private time = 0;
  private timers: { at: number; callback: () => void; id: number }[] = [];
  private next = 0;

  now(): number {
    return this.time;
  }

  setTimeout(callback: () => void, ms: number): unknown {
    const id = this.next++;
    this.timers.push({ at: this.time + ms, callback, id });
    return id;
  }

  clearTimeout(handle: unknown): void {
    this.timers = this.timers.filter((timer) => timer.id !== handle);
  }

  pass(ms: number): void {
    this.time += ms;
    const due = this.timers.filter((timer) => timer.at <= this.time);
    this.timers = this.timers.filter((timer) => timer.at > this.time);
    due.forEach((timer) => timer.callback());
  }
}

describe('PausableTimer (a passing message leaves after 4 seconds, waiting while held)', () => {
  let timers: FakeTimers;
  let done: number;
  const make = () => new PausableTimer(4000, () => done++, timers);

  beforeEach(() => {
    timers = new FakeTimers();
    done = 0;
  });

  it('is done 4 seconds after it starts, once', () => {
    const timer = make();
    timer.resume();
    timers.pass(3999);
    expect(done).toBe(0);
    timers.pass(1);
    expect(done).toBe(1);
    timers.pass(10000);
    expect(done).toBe(1);
  });

  it('does not count the time it is paused', () => {
    const timer = make();
    timer.resume();
    timers.pass(3000);
    timer.pause();
    timers.pass(60000);
    expect(done).toBe(0);
    timer.resume();
    timers.pass(999);
    expect(done).toBe(0);
    timers.pass(1);
    expect(done).toBe(1);
  });

  it('ignores a second resume while running and a pause while paused', () => {
    const timer = make();
    timer.resume();
    timers.pass(2000);
    timer.resume();
    timer.pause();
    timer.pause();
    timer.resume();
    timers.pass(2000);
    expect(done).toBe(1);
  });

  it('is never done once stopped', () => {
    const timer = make();
    timer.resume();
    timer.stop();
    timer.resume();
    timers.pass(10000);
    expect(done).toBe(0);
  });
});
