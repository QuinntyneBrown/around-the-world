import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Top bar (docs/design-system/components/top-bar.html): the screen's `<header>` with Back, the
 * screen's one `<h1>` and a right slot. It sits on the native `<header>` (docs/adr/0012). The
 * page projects Back as `<a atw-icon-button slot="back" routerLink aria-label="Back">`, and
 * anything for the right slot as other content.
 */
@Component({
  selector: 'header[atw-top-bar]',
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'topbar' },
})
export class TopBar {
  /** The screen's title, in the child's words: "Pick your kid". */
  readonly heading = input.required<string>();
}
