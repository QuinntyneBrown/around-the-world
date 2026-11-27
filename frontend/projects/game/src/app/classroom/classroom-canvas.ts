import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  input,
  type OnChanges,
  type SimpleChanges,
  type OnInit,
  output,
} from '@angular/core';
import {
  CLASSROOM_RENDERER,
  type ClassroomRenderer,
  type ClassroomState,
  type ClassroomView,
} from '@atw/api';

/** Whether the 3D classroom is drawn, or the still picture stands in for it (L2-036 3). */
export type ClassroomStatus = 'loading' | 'drawn' | 'still';

/**
 * Whether two states show the same classroom, so a screen whose game changes many times a
 * second (the timer bar) gives the renderer a new state only when the classroom changes.
 */
export function sameClassroom(one: ClassroomState | null, other: ClassroomState | null): boolean {
  return one === other || JSON.stringify(one) === JSON.stringify(other);
}

/** From this width World Map shows the whole room; below it, the child's own kid close up. */
const WHOLE_ROOM_FROM = '(min-width: 48rem)';

/**
 * Draws the 3D classroom on the canvas it is on (docs/detailed-designs/classroom/
 * draw-classroom/, docs/adr/0028). Home and Duel place it behind their interface and World Map
 * under its room's labels; no other screen does, so no other screen loads the `world` library
 * (L2-036 criterion 6). It loads the renderer through `CLASSROOM_RENDERER` once the screen is
 * shown, and the interface never waits for it (criterion 2). It tells the page `drawn` when the
 * classroom is drawn and `still` when it cannot be, so the page keeps its still picture and
 * says so (criterion 3). The canvas lives as long as the renderer: when it is destroyed the
 * renderer is disposed, and a renderer still arriving is disposed when it arrives (L2-048 3).
 */
@Directive({
  selector: 'canvas[atwClassroom]',
  host: { 'aria-hidden': 'true' },
})
export class ClassroomCanvas implements OnInit, OnChanges {
  /** What the classroom shows; nothing is shown until it is given. */
  readonly state = input.required<ClassroomState | null>({ alias: 'atwClassroom' });
  /** Behind the interface, or from above (zoomed to the child's kid below 768 px). */
  readonly view = input<'behind' | 'fromAbove'>('behind');
  readonly status = output<ClassroomStatus>();

  private readonly load = inject(CLASSROOM_RENDERER);
  private readonly canvas = inject<ElementRef<HTMLCanvasElement>>(ElementRef).nativeElement;
  private renderer: ClassroomRenderer | null = null;
  private drawn = false;
  private stateSince = performance.now();
  private destroyed = false;
  private readonly wide = typeof matchMedia === 'function' ? matchMedia(WHOLE_ROOM_FROM) : null;

  constructor() {
    const widthChanged = () => this.show();
    this.wide?.addEventListener('change', widthChanged);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.wide?.removeEventListener('change', widthChanged);
      this.renderer?.dispose();
      this.renderer = null;
    });
  }

  ngOnInit(): void {
    void this.draw();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['state']) this.stateSince = performance.now();
    this.show();
  }

  private async draw(): Promise<void> {
    try {
      const renderer = await this.load();
      if (this.destroyed) return;
      this.renderer = renderer;
      await renderer.mount(this.canvas);
      if (this.destroyed) return;
      this.drawn = true;
      this.show();
      this.status.emit('drawn');
    } catch {
      if (this.destroyed) return;
      this.renderer?.dispose();
      this.renderer = null;
      this.status.emit('still');
    }
  }

  private show(): void {
    const state = this.state();
    if (!this.drawn || !this.renderer || !state) return;
    this.renderer.show(state, this.resolvedView(), performance.now() - this.stateSince);
  }

  private resolvedView(): ClassroomView {
    if (this.view() === 'behind') return 'behind';
    return this.wide && !this.wide.matches ? 'fromAboveZoomed' : 'fromAbove';
  }
}
