import { QUALITY_STEPS, QualityScaler } from './quality-scaler';

/** Draws frames of `ms` each for `forMs`; returns how many times the detail stepped down. */
function draw(scaler: QualityScaler, ms: number, forMs: number): number {
  let steps = 0;
  for (let spent = 0; spent < forMs; spent += ms) if (scaler.frame(ms)) steps++;
  return steps;
}

describe('QualityScaler', () => {
  it('keeps the detail while the classroom draws at 30 frames a second or more', () => {
    const scaler = new QualityScaler();
    expect(draw(scaler, 1000 / 30, 10_000)).toBe(0);
    expect(scaler.step).toBe(QUALITY_STEPS[0]);
  });

  it('keeps the detail through less than 2 seconds below 30 frames a second', () => {
    const scaler = new QualityScaler();
    expect(draw(scaler, 50, 1900)).toBe(0);
  });

  it('steps down after 2 seconds below 30 frames a second (L2-036 4)', () => {
    const scaler = new QualityScaler();
    expect(draw(scaler, 50, 2000)).toBe(1);
    expect(scaler.step).toEqual({ pixelRatio: 1, shadows: 'map', detail: 'high' });
  });

  it('measures again after each step, and stops once it draws at 30 or more', () => {
    const scaler = new QualityScaler();
    draw(scaler, 50, 4000);
    expect(scaler.level).toBe(2);
    expect(draw(scaler, 20, 10_000)).toBe(0);
    expect(scaler.step).toEqual({ pixelRatio: 1, shadows: 'blob', detail: 'high' });
  });

  it.each([
    [0, { pixelRatio: 1.5, shadows: 'map', detail: 'high' }],
    [1, { pixelRatio: 1, shadows: 'map', detail: 'high' }],
    [2, { pixelRatio: 1, shadows: 'blob', detail: 'high' }],
    [3, { pixelRatio: 0.75, shadows: 'blob', detail: 'low' }],
    [4, { pixelRatio: 0.5, shadows: 'blob', detail: 'low' }],
  ])('takes resolution, then shadows, then detail, step %i (docs/adr/0028)', (index, step) => {
    expect(QUALITY_STEPS[index]).toEqual(step);
  });

  it('stays on the last step however slowly it draws', () => {
    const scaler = new QualityScaler(QUALITY_STEPS.length - 1);
    expect(draw(scaler, 200, 20_000)).toBe(0);
    expect(scaler.level).toBe(QUALITY_STEPS.length - 1);
  });

  it('counts a long gap as a pause, not as slow drawing', () => {
    const scaler = new QualityScaler();
    draw(scaler, 50, 1500);
    expect(scaler.frame(5000)).toBe(false);
    expect(draw(scaler, 50, 1500)).toBe(0);
  });

  it('starts at the step it is given', () => {
    expect(new QualityScaler(3).step.detail).toBe('low');
  });
});
