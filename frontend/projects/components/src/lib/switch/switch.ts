import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let next = 0;

/**
 * Switch (docs/design-system/components/switch.html): a setting that is on or off at once,
 * with its label and help on one line. The `<button role="switch">` is named by the label,
 * described by the help, and says "On" or "Off" in words as well as colour. A switch that
 * cannot be turned on says why in its help.
 */
@Component({
  selector: 'atw-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'setting' },
})
export class Switch {
  /** The setting's name: "Answer by shouting". */
  readonly label = input.required<string>();
  /** What off means, or why it cannot be turned on. */
  readonly help = input.required<string>();
  readonly checked = input(false);
  readonly disabled = input(false);
  /** Pressed: the page turns the setting over. */
  readonly toggled = output<boolean>();
  protected readonly id = `atw-switch-${next++}`;
}
