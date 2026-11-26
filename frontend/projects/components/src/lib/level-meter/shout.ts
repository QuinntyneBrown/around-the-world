import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';
import { LevelMeter } from './level-meter';

/**
 * "Shout it!" (docs/design-system/components/level-meter.html): the pill on the flash card
 * that says the device is listening, with the small level meter (L2-009 criterion 4). It sits
 * on the native `<p>` (docs/adr/0012).
 */
@Component({
  selector: 'p[atw-shout]',
  imports: [Icon, LevelMeter],
  templateUrl: './shout.html',
  styleUrl: './shout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'shout' },
})
export class Shout {}
