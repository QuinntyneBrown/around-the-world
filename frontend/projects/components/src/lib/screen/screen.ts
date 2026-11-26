import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Screen (docs/design-system/components/screen.html): the frame a screen sits in, a column at
 * least as tall as the window, or exactly as tall and never scrolling (`fill`: Duel and World
 * Map). It holds the top bar, when there is one, and the screen's body.
 */
@Component({
  selector: 'atw-screen',
  templateUrl: './screen.html',
  styleUrl: './screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'screen', '[class.screen--fill]': 'fill()' },
})
export class Screen {
  readonly fill = input(false);
}
