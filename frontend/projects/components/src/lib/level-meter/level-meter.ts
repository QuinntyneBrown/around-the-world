import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The bars' heights in percent, as the mocks draw them: ten on Mic Check, five in "Shout it!". */
const BARS = [35, 62, 85, 54, 100, 73, 46, 88, 58, 31];
const SMALL_BARS = [50, 83, 58, 100, 42];

/**
 * Level meter (docs/design-system/components/level-meter.html): bars that pulse while the
 * microphone listens. They show listening, not loudness (docs/adr/0025), hold still under
 * reduced motion and are hidden from assistive technology: words always carry the state.
 */
@Component({
  selector: 'atw-level-meter',
  templateUrl: './level-meter.html',
  styleUrl: './level-meter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'level-meter', 'aria-hidden': 'true', '[class.level-meter--sm]': 'small()' },
})
export class LevelMeter {
  /** The small meter inside "Shout it!". */
  readonly small = input(false);
  protected readonly bars = computed(() => (this.small() ? SMALL_BARS : BARS));
}
