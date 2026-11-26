import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Pill (docs/design-system/components/pill.html): one short fact over a picture, "Egypt · desk
 * 2 of 12". It is plain text on the native `<p>`, white or, with `inverse`, navy.
 */
@Component({
  selector: 'p[atw-pill]',
  templateUrl: './pill.html',
  styleUrl: './pill.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'pill numeric', '[class.pill--inverse]': 'inverse()' },
})
export class Pill {
  readonly inverse = input(false);
}
