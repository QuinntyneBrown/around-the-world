import { AnimationLoop, type FrameSource } from './animation-loop';

/** Frames the test draws by hand: `next(ms)` runs the frame asked for, `ms` later. */
class FakeFrames implements FrameSource {
  time = 0;
  private waiting = new Map<number, (now: number) => void>();
  private handles = 0;

  request(callback: (now: number) => void): number {
    this.waiting.set(++this.handles, callback);
    return this.handles;
  }

  cancel(handle: number): void {
    this.waiting.delete(handle);
  }

  now(): number {
    return this.time;
  }

  get asked(): number {
    return this.waiting.size;
  }

  next(ms: number): void {
    this.time += ms;
    const callbacks = [...this.waiting.values()];
    this.waiting.clear();
    for (const callback of callbacks) callback(this.time);
  }
}

/** A page whose visibility the test sets. */
function pageOf(): Document & { show(hidden: boolean): void } {
  const page = new EventTarget() as Document & { show(hidden: boolean): void };
  let hidden = false;
  Object.defineProperty(page, 'hidden', { get: () => hidden });
  page.show = (value) => {
    hidden = value;
    page.dispatchEvent(new Event('visibilitychange'));
  };
  return page;
}

describe('AnimationLoop', () => {
  it('draws each frame with the time since the last', () => {
    const frames = new FakeFrames();
    const drawn: number[] = [];
    const loop = new AnimationLoop((ms) => drawn.push(ms), frames, pageOf());
    loop.start();
    frames.next(16);
    frames.next(20);
    expect(drawn).toEqual([16, 20]);
  });

  it('pauses while the page is hidden, and runs again when it is shown', () => {
    const frames = new FakeFrames();
    const page = pageOf();
    const drawn: number[] = [];
    const loop = new AnimationLoop((ms) => drawn.push(ms), frames, page);
    loop.start();
    page.show(true);
    expect(loop.drawing).toBe(false);
    frames.next(5000);
    expect(drawn).toEqual([]);
    page.show(false);
    frames.next(16);
    expect(drawn).toEqual([16]);
  });

  it('stops for good on dispose: no frame asked for, and showing the page starts nothing (L2-048 3)', () => {
    const frames = new FakeFrames();
    const page = pageOf();
    const loop = new AnimationLoop(() => undefined, frames, page);
    loop.start();
    loop.dispose();
    expect(frames.asked).toBe(0);
    page.show(true);
    page.show(false);
    expect(frames.asked).toBe(0);
    loop.start();
    expect(frames.asked).toBe(0);
  });
});
