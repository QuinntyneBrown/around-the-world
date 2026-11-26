import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Toast region (docs/design-system/components/toast.html, the `toast-region` block): where the
 * Lobby's passing messages stack, newest at the bottom, across the bottom of a phone and at the
 * bottom right, 384 px wide, from 576 px. It is a polite live region labelled "Messages"; its
 * `Toast`s go inside it.
 */
@Component({
  selector: 'div[atw-toast-region]',
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'toast-region',
    role: 'region',
    'aria-label': 'Messages',
    'aria-live': 'polite',
  },
})
export class ToastRegion {}
