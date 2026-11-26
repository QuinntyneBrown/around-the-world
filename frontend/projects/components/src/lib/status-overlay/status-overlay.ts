import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { Icon, type IconName } from '../icon/icon';

/**
 * Status overlay (docs/design-system/components/status-overlay.html): a card over the dimmed
 * screen while the game cannot go on, "Reconnecting…", or the game is lost. It is announced at
 * once (`role="alert"`). Its one action, when it has one, is projected (`slot="action"`) and takes
 * the focus as the overlay shows. The screen behind is made inert by the page that shows it.
 */
@Component({
  selector: 'atw-status-overlay',
  imports: [Icon],
  templateUrl: './status-overlay.html',
  styleUrl: './status-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'status-overlay', role: 'alert' },
})
export class StatusOverlay implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly heading = input.required<string>();
  readonly text = input.required<string>();
  readonly icon = input<IconName>('wifi-off');

  ngAfterViewInit(): void {
    this.host.nativeElement
      .querySelector<HTMLElement>('.status-overlay__card a, .status-overlay__card button')
      ?.focus();
  }
}
