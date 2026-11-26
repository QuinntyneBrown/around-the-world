import { type Locator } from '@playwright/test';

/** One CSS animation an element plays: its keyframes' name, its length and how often it plays. */
export interface PlayedAnimation {
  /** The keyframes' name, as the stylesheet names it (`flip-in`, `shake`, `fade-in`). */
  name: string;
  ms: number;
  times: number;
}

/**
 * How an element moves, read from the browser's computed style, so a spec can say what plays
 * with and without reduced motion (L2-038): its animations, and whether it is tilted.
 */
export interface Motion {
  animations: PlayedAnimation[];
  /** The element's own `rotate`, `none` when it stands upright. */
  rotate: string;
}

/** Reads the motion of the element the locator finds. */
export function motionOf(locator: Locator): Promise<Motion> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const names = style.animationName.split(',').map((name) => name.trim());
    const lengths = style.animationDuration.split(',').map((length) => length.trim());
    const counts = style.animationIterationCount.split(',').map((count) => count.trim());
    const ms = (length: string) =>
      length.endsWith('ms') ? parseFloat(length) : parseFloat(length) * 1000;
    return {
      animations: names
        .filter((name) => name !== 'none')
        .map((name, index) => ({
          // Angular scopes a component's keyframes with its own prefix; the name is the end.
          name: name.replace(/^.*_/, ''),
          ms: ms(lengths[index % lengths.length]),
          times: Number(counts[index % counts.length]),
        })),
      rotate: style.rotate,
    };
  });
}

/** The animations by name, so a spec can find one whatever their order. */
export function named(motion: Motion, name: string): PlayedAnimation | undefined {
  return motion.animations.find((animation) => animation.name === name);
}
