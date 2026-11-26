import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonShape = 'text' | 'title' | 'block' | 'round' | 'panel';

/**
 * Skeleton (docs/design-system/components/skeleton.html): a placeholder in the shape of
 * content still arriving. It is hidden from assistive technology; the screen's status says in
 * words what is arriving (L2-031 criterion 4). A parent may give it a size class, such as a
 * portrait's.
 */
@Component({
  selector: 'atw-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'skeleton',
    'aria-hidden': 'true',
    '[class.skeleton--text]': "shape() === 'text'",
    '[class.skeleton--title]': "shape() === 'title'",
    '[class.skeleton--block]': "shape() === 'block'",
    '[class.skeleton--round]': "shape() === 'round'",
    '[class.skeleton--panel]': "shape() === 'panel'",
    '[class.skeleton--short]': 'short()',
  },
})
export class Skeleton {
  readonly shape = input<SkeletonShape>('text');
  readonly short = input(false);
}
