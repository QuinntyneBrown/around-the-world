import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

export type ToyButtonVariant = 'play' | 'friends' | 'solo' | 'go' | 'paper';
export type ToyButtonSize = 'md' | 'lg' | 'xl';

/**
 * Toy button (docs/design-system/components/toy-button.html): the action a screen exists for.
 * It sits on the native element (docs/adr/0012): `<a atw-toy-button routerLink>` when it only
 * goes to another screen, `<button atw-toy-button>` when it acts. The page sets `disabled`,
 * `aria-busy` and the router on the element itself.
 */
@Component({
  selector: 'a[atw-toy-button], button[atw-toy-button]',
  imports: [Icon, NgTemplateOutlet],
  templateUrl: './toy-button.html',
  styleUrl: './toy-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'toy-btn',
    '[class.toy-btn--friends]': "variant() === 'friends'",
    '[class.toy-btn--solo]': "variant() === 'solo'",
    '[class.toy-btn--go]': "variant() === 'go'",
    '[class.toy-btn--paper]': "variant() === 'paper'",
    '[class.toy-btn--md]': "size() === 'md'",
    '[class.toy-btn--xl]': "size() === 'xl'",
    '[class.toy-btn--block]': 'block()',
  },
})
export class ToyButton {
  readonly variant = input<ToyButtonVariant>('play');
  readonly size = input<ToyButtonSize>('lg');
  /** Fills its column. */
  readonly block = input(false);
  /** An icon before the label. */
  readonly icon = input<IconName>();
  /**
   * The label shows from 576px only; below, the icon stands alone and the label stays the
   * button's accessible name through `aria-label`, which the page sets.
   */
  readonly wideLabelOnly = input(false);
}
