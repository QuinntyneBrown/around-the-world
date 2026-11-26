import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Cluster (docs/design-system/components/screen.html): things in a row that wrap. It sits on
 * the native `<div>` (docs/adr/0012).
 */
@Component({
  selector: 'div[atw-cluster]',
  templateUrl: './cluster.html',
  styleUrl: './cluster.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'cluster',
    '[class.cluster--tight]': 'tight()',
    '[class.cluster--between]': 'between()',
  },
})
export class Cluster {
  readonly tight = input(false);
  /** Pushes the first and last items to the ends. */
  readonly between = input(false);
}
