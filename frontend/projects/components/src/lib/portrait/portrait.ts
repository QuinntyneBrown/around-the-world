import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Bean } from '../bean/bean';
import { Skeleton } from '../skeleton/skeleton';

export type PortraitSize = 'default' | 'sm' | 'md' | 'fill' | 'hero';
/** Loaded shows the picture, loading a skeleton in its shape, failed the drawn kid. */
export type PortraitState = 'loaded' | 'loading' | 'failed';

/**
 * Portrait (docs/design-system/components/portrait.html): a kid's picture on their colour.
 * Beside the kid's name it is decorative (`alt` empty); alone, `alt` is the kid's name. Inside
 * a `PortraitStack` it overlaps the one before it.
 */
@Component({
  selector: 'atw-portrait',
  imports: [Bean, Skeleton],
  templateUrl: './portrait.html',
  styleUrl: './portrait.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Portrait {
  /** The kid, or "classmate" for a classmate who is not one of the five kids: always drawn. */
  readonly kid = input.required<KidId | 'classmate'>();
  /** The picture's address. */
  readonly src = input.required<string>();
  /** The kid's name when the portrait stands alone; empty beside the name. */
  readonly alt = input('');
  readonly size = input<PortraitSize>('default');
  readonly state = input<PortraitState>('loaded');
  /** A round portrait, as in a stack of classmates. */
  readonly round = input(false);
  /** A ring in the kid's colour, as on the duel strip. */
  readonly ring = input(false);
  /** Loaded, loading or failed; a further classmate has no picture and is always drawn. */
  protected readonly shown = computed(() => (this.kid() === 'classmate' ? 'failed' : this.state()));
}
