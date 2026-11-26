import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Pill } from '../pill/pill';

/**
 * Stamp card (docs/design-system/components/stamp-card.html): the passport stamp that stands
 * in place of the flash card after a hop: "Passport stamp!", the country reached, its landmark
 * and who hops to which desk (L2-038 criterion 5). It is a status, so it is read out.
 */
@Component({
  selector: 'atw-stamp-card',
  imports: [Pill],
  templateUrl: './stamp-card.html',
  styleUrl: './stamp-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'stamp-card', role: 'status' },
})
export class StampCard {
  readonly country = input.required<string>();
  readonly landmark = input.required<string>();
  /** "Zuri hops to desk 6 of 12". */
  readonly hop = input.required<string>();
}
