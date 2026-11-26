import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/** One option of a segmented choice: its value and its one word. */
export interface SegmentedOption<T> {
  readonly value: T;
  readonly label: string;
}

/**
 * Segmented choice (docs/design-system/components/segmented.html): three words in one track,
 * exactly one chosen (the card speed). Each is a `<button aria-pressed>` with a tick when
 * chosen (L2-051 criterion 3). It sits on the `<div>` that groups them (docs/adr/0012); the
 * page names the group. It emits the value chosen.
 */
@Component({
  selector: 'div[atw-segmented]',
  imports: [Icon],
  templateUrl: './segmented.html',
  styleUrl: './segmented.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'segmented', role: 'group' },
})
export class Segmented<T> {
  readonly options = input.required<readonly SegmentedOption<T>[]>();
  readonly chosen = input.required<T>();
  readonly disabled = input(false);
  readonly choose = output<T>();
}
