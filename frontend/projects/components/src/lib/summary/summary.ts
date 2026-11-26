import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One line of a summary: "Tour", "12 desks". */
export interface SummaryRow {
  readonly term: string;
  readonly value: string;
}

/**
 * Summary (docs/design-system/components/summary.html): terms and their values, one line each,
 * as the Lobby shows the game's setup (L2-024 criterion 5). It sits on the native `<dl>`
 * (docs/adr/0012).
 */
@Component({
  selector: 'dl[atw-summary]',
  templateUrl: './summary.html',
  styleUrl: './summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'summary' },
})
export class Summary {
  readonly rows = input.required<readonly SummaryRow[]>();
}
