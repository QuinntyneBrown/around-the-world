import { InjectionToken } from '@angular/core';
import { type KidId } from './kid';

/** What a kid in the classroom is doing at a moment of the game (L2-037 criterion 2). */
export type KidAnimation = 'idle' | 'thinking' | 'hop' | 'winCheer' | 'soClose';

/**
 * Which part of the room a screen shows (docs/detailed-designs/classroom/draw-classroom/):
 * behind the interface of Home and Duel, the whole room from above on World Map from 768 px,
 * or the room from above zoomed to the device's own kid below 768 px (L2-034 criterion 5).
 */
export type ClassroomView = 'behind' | 'fromAbove' | 'fromAboveZoomed';

/** Where a figure stands: seated at a desk, or travelling, on the path beside it. */
export interface ClassroomSpot {
  readonly desk: number;
  readonly travelling: boolean;
}

/** One desk of the ring: its number from 1, its country, and whether it is lit. */
export interface ClassroomDesk {
  readonly desk: number;
  /** The country, whose landmark stands on the desk (docs/adr/0028). */
  readonly country: string;
  /** The desk the traveller is at and the next stop are lit (L2-034 criterion 1). */
  readonly lit: boolean;
}

/** One player in the classroom: their kid, where they are and what they are doing. */
export interface ClassroomFigure extends ClassroomSpot {
  /** The player's id: two players of a room may share a kid (docs/adr/0028). */
  readonly id: string;
  /** Their kid, or "classmate" for a classmate who is not one of the five kids. */
  readonly kid: KidId | 'classmate';
  /** Whether it is the device's own player. */
  readonly you: boolean;
  readonly animation: KidAnimation;
  /** With `hop`, where the figure hops from; it is drawn there first and then hops. */
  readonly from: ClassroomSpot | null;
}

/**
 * What the classroom shows (docs/detailed-designs/classroom/draw-classroom/): the desks in
 * order from desk 1, every figure, and the desk a view behind the interface looks at. It holds
 * no nickname.
 */
export interface ClassroomState {
  readonly desks: readonly ClassroomDesk[];
  readonly figures: readonly ClassroomFigure[];
  /** The desk of the duel, which Duel's view looks at; null shows the whole ring (Home). */
  readonly focusDesk: number | null;
}

/** Why the classroom cannot be drawn: no WebGL, or a scene that did not load (L2-036 3). */
export interface ClassroomError {
  readonly code: 'noWebGL' | 'sceneFailed';
}

/**
 * The classroom's renderer (docs/detailed-designs/classroom/draw-classroom/). Only the `world`
 * library implements it, and it is loaded only when the classroom is first drawn.
 */
export interface ClassroomRenderer {
  /**
   * Loads the scenes and starts drawing on the canvas. It rejects with a `ClassroomError` when
   * the device has no WebGL or a scene fails to load.
   */
  mount(canvas: HTMLCanvasElement): Promise<void>;
  /** Shows the state in the view; a figure that has moved since the last state hops there. */
  show(state: ClassroomState, view: ClassroomView): void;
  /**
   * Stops the animation loop and disposes every geometry, material, texture, render target and
   * the renderer itself (L2-048 criterion 3). A `mount` in progress is abandoned.
   */
  dispose(): void;
}

/** Loads the renderer: bound to a dynamic `import()` of `@atw/world` (L2-047 criterion 2). */
export type ClassroomRendererLoader = () => Promise<ClassroomRenderer>;

export const CLASSROOM_RENDERER = new InjectionToken<ClassroomRendererLoader>('CLASSROOM_RENDERER');
