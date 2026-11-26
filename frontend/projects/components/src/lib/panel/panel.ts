import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Panel (docs/design-system/components/panel.html): a white surface with a soft edge. It sits
 * on the native `<div>` or `<section>` (docs/adr/0012).
 */
@Component({
  selector: 'div[atw-panel], section[atw-panel]',
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'panel',
    '[class.panel--sm]': "size() === 'sm'",
    '[class.panel--tint]': 'tint()',
    '[class.panel--float]': 'float()',
  },
})
export class Panel {
  readonly size = input<'sm' | 'md'>('md');
  readonly tint = input(false);
  readonly float = input(false);
}
