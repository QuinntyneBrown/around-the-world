import { GameClock } from './game-clock';

describe('GameClock (docs/adr/0020)', () => {
  function clockAt(start = 10_000) {
    let wall = start;
    const clock = new GameClock(() => wall);
    return { clock, pass: (ms: number) => (wall += ms) };
  }

  it('counts game time from when it started', () => {
    const { clock, pass } = clockAt();
    expect(clock.now()).toBe(0);
    pass(1500);
    expect(clock.now()).toBe(1500);
  });

  it('runs a callback only once its time has come and the clock ticks', () => {
    const { clock, pass } = clockAt();
    const ran: number[] = [];
    clock.after(1000, () => ran.push(clock.now()));
    pass(999);
    clock.tick();
    expect(ran).toEqual([]);
    pass(500);
    clock.tick();
    expect(ran).toEqual([1000]);
  });

  it('runs the callbacks due in time order, and those they add when they are due too', () => {
    const { clock, pass } = clockAt();
    const ran: string[] = [];
    clock.after(3000, () => ran.push('late'));
    clock.after(1000, () => {
      ran.push('early');
      clock.after(500, () => ran.push(`added at ${clock.now()}`));
    });
    pass(5000);
    clock.tick();
    expect(ran).toEqual(['early', 'added at 1500', 'late']);
  });

  it('forgets a callback that is cancelled, or every one when cleared', () => {
    const { clock, pass } = clockAt();
    const ran: string[] = [];
    const handle = clock.after(100, () => ran.push('cancelled'));
    clock.after(200, () => ran.push('cleared'));
    clock.cancel(handle);
    clock.cancel(null);
    pass(150);
    clock.tick();
    clock.clear();
    pass(100);
    clock.tick();
    expect(ran).toEqual([]);
  });
});
