import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Stack (docs/design-system/components/screen.html): spaces things down a column. It sits on
 * the native `<section>`, `<div>` or `<span>` (docs/adr/0012).
 */
@Component({
  selector: 'section[atw-stack], div[atw-stack], span[atw-stack]',
  templateUrl: './stack.html',
  styleUrl: './stack.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'stack',
    '[class.stack--sm]': "gap() === 'sm'",
    '[class.stack--lg]': "gap() === 'lg'",
    '[class.stack--center]': 'center()',
    '[class.stack--middle]': 'middle()',
  },
})
export class Stack {
  readonly gap = input<'sm' | 'md' | 'lg'>('md');
  /** Centres the items and their text. */
  readonly center = input(false);
  /** Centres the items down the column. */
  readonly middle = input(false);
}
