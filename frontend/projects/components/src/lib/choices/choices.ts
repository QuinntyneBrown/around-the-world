import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** One choice: its value, the number shown and its unit ("12", "desks"). */
export interface ChoiceOption<T> {
  readonly value: T;
  readonly label: string;
  readonly unit: string;
}

/**
 * Choice (docs/design-system/components/choice.html): equal buttons of which exactly one is
 * chosen (the tour length). Each is a `<button aria-pressed>` with a dot when chosen (L2-051
 * criterion 3). It sits on the `<div>` that groups them (docs/adr/0012); the page names the
 * group. It emits the value chosen.
 */
@Component({
  selector: 'div[atw-choices]',
  templateUrl: './choices.html',
  styleUrl: './choices.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'choice-grid', role: 'group' },
})
export class Choices<T> {
  readonly options = input.required<readonly ChoiceOption<T>[]>();
  readonly chosen = input.required<T>();
  readonly disabled = input(false);
  readonly choose = output<T>();
}
