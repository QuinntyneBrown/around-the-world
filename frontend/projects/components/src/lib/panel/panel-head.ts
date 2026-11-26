import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Panel head (docs/design-system/components/panel.html): a smaller title inside a panel, with
 * its actions at the end of the line ("Times tables" with "Easy" and "All"). It sits on the
 * native `<div>` (docs/adr/0012); the actions are projected.
 */
@Component({
  selector: 'div[atw-panel-head]',
  templateUrl: './panel-head.html',
  styleUrl: './panel-head.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'panel__head', '[class.panel__head--spaced]': 'spaced()' },
})
export class PanelHead {
  readonly heading = input.required<string>();
  /** The title's id, which may name a group below it. */
  readonly headingId = input<string>();
  /** The heading's level: 3 inside a titled panel, 2 when it is the panel's own title (the Lobby's "The game"). */
  readonly level = input<2 | 3>(3);
  /** Space above, when it follows other content in the panel. */
  readonly spaced = input(false);
}
