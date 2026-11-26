import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Table key (docs/design-system/components/table-key.html): the times tables as square keys,
 * ×2 to ×12, each on or off, in 4 columns or 6 from 576px. Each is a `<button aria-pressed>`
 * named "{n} times table", with a dot when on (L2-051 criterion 3). With `disabled` every key
 * is disabled and shown not pressed (L2-016 criterion 5). It sits on the `<div>` that groups
 * them (docs/adr/0012); the page names the group. It holds no rule: it emits the table pressed.
 */
@Component({
  selector: 'div[atw-table-keys]',
  templateUrl: './table-keys.html',
  styleUrl: './table-keys.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'table-grid', role: 'group' },
})
export class TableKeys {
  /** The tables offered, in order. */
  readonly tables = input.required<readonly number[]>();
  /** The tables that are on. */
  readonly pressed = input.required<readonly number[]>();
  readonly disabled = input(false);
  readonly toggled = output<number>();
}
