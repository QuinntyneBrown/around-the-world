import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** One toggle chip: its value, its word and its symbol (×, +, −, ÷). */
export interface ToggleChipOption {
  readonly value: string;
  readonly label: string;
  readonly symbol: string;
}

/**
 * Toggle chip (docs/design-system/components/toggle-chip.html): choices that are each on or
 * off, several at once (the kinds of maths). Each is a `<button aria-pressed>` with a tick when
 * on, so colour is never the only mark (L2-051 criterion 3). It sits on the `<div>` that groups
 * them (docs/adr/0012); the page names the group with `aria-label`. It holds no rule: it emits
 * the value pressed.
 */
@Component({
  selector: 'div[atw-toggle-chips]',
  imports: [Icon],
  templateUrl: './toggle-chips.html',
  styleUrl: './toggle-chips.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'toggle-row', role: 'group' },
})
export class ToggleChips {
  readonly options = input.required<readonly ToggleChipOption[]>();
  /** The values that are on. */
  readonly pressed = input.required<readonly string[]>();
  /** Disables every chip. */
  readonly disabled = input(false);
  readonly toggled = output<string>();
}
