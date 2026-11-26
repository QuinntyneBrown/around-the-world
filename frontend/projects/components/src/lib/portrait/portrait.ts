import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { KidId } from '@atw/api';
import { Bean } from '../bean/bean';
import { Skeleton } from '../skeleton/skeleton';

export type PortraitSize = 'default' | 'sm' | 'md' | 'fill' | 'hero';
/** Loaded shows the picture, loading a skeleton in its shape, failed the drawn kid. */
export type PortraitState = 'loaded' | 'loading' | 'failed';

/**
 * Portrait (docs/design-system/components/portrait.html): a kid's picture on their colour.
 * Beside the kid's name it is decorative (`alt` empty); alone, `alt` is the kid's name.
 */
@Component({
  selector: 'atw-portrait',
  imports: [Bean, Skeleton],
  templateUrl: './portrait.html',
  styleUrl: './portrait.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Portrait {
  readonly kid = input.required<KidId>();
  /** The picture's address. */
  readonly src = input.required<string>();
  /** The kid's name when the portrait stands alone; empty beside the name. */
  readonly alt = input('');
  readonly size = input<PortraitSize>('default');
  readonly state = input<PortraitState>('loaded');
}
