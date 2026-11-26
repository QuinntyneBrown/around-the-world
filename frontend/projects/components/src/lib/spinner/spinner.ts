import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Spinner (docs/design-system/components/spinner.html): a small turning ring inside a busy
 * button, before the words that say what is happening. The button carries `aria-busy`.
 */
@Component({
  selector: 'atw-spinner',
  templateUrl: './spinner.html',
  styleUrl: './spinner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'spinner', 'aria-hidden': 'true' },
})
export class Spinner {}
