import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Panel (docs/design-system/components/panel.html): a white surface with a soft edge. It sits
 * on the native `<div>` or `<section>` (docs/adr/0012). With a `heading`, it opens with its
 * `<h2 class="panel__title">`, which names it.
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
    '[attr.aria-labelledby]': 'heading() ? headingId() : null',
  },
})
export class Panel {
  readonly size = input<'sm' | 'md'>('md');
  readonly tint = input(false);
  readonly float = input(false);
  /** The panel's title, in the child's words: "Which maths?". */
  readonly heading = input<string>();
  /** The title's id, which names the panel and may name a group inside it. */
  readonly headingId = input<string>();
}
