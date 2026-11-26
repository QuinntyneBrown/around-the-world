import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One column, or two from 992px: split (1.1 : 1), side (352px : rest), wide first (1.25 : 1). */
export type ScreenBodyColumns = 'one' | 'split' | 'side' | 'wide-first';

/**
 * Screen body (docs/design-system/components/screen.html): the screen's `<main id="main">`,
 * centred, up to 1152px wide, one column and then two from 992px.
 */
@Component({
  selector: 'main[atw-screen-body]',
  templateUrl: './screen-body.html',
  styleUrl: './screen-body.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'screen__body',
    id: 'main',
    '[class.screen__body--split]': "columns() === 'split'",
    '[class.screen__body--side]': "columns() === 'side'",
    '[class.screen__body--wide-first]': "columns() === 'wide-first'",
    '[class.screen__body--center]': 'center()',
    '[class.screen__body--narrow]': 'narrow()',
  },
})
export class ScreenBody {
  readonly columns = input<ScreenBodyColumns>('one');
  /** Centres the content down the screen. */
  readonly center = input(false);
  /** A narrow centred column. */
  readonly narrow = input(false);
}
