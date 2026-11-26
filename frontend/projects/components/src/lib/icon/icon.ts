import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The icons the screens use so far, named by what they show. */
export type IconName =
  | 'back'
  | 'check'
  | 'clock'
  | 'delete'
  | 'dice'
  | 'friends'
  | 'frozen'
  | 'home'
  | 'info'
  | 'retry'
  | 'solo';

/**
 * Icon (docs/design-system/foundations/iconography.html): a round line icon on a 24-unit grid
 * with a 2.5px stroke, in the colour of the text beside it. It is decorative: the control it
 * sits in carries the name. A parent sizes it with the custom property `--icon-size`.
 */
@Component({
  selector: 'atw-icon',
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
}
