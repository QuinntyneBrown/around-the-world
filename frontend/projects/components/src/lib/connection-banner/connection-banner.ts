import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ConnectionNotice } from '@atw/api';
import { Alert, type AlertTone } from '../alert/alert';
import { type IconName } from '../icon/icon';

/** How each of the connection's banners reads and looks (docs/mocks/notifications/connection-banner/). */
const BANNERS: Record<
  ConnectionNotice['kind'],
  { tone: AlertTone; icon: IconName; title: string; text: string }
> = {
  back: { tone: 'success', icon: 'wifi', title: 'You’re back!', text: 'Same desk, same game.' },
  droppedOut: { tone: 'info', icon: 'person', title: '', text: 'Their desk is empty now.' },
  everyoneLeft: {
    tone: 'danger',
    icon: 'friends',
    title: 'Everyone else has left.',
    text: 'The tour ends here. On to the podium!',
  },
  wobbly: {
    tone: 'warning',
    icon: 'wifi-off',
    title: 'Your internet is wobbly.',
    text: 'Answers might take a moment.',
  },
};

/**
 * The connection's banner (docs/design-system/components/alert.html, as a banner): across the top
 * of Duel, over nothing (L2-029 criteria 2, 4, 5 and 7, docs/adr/0036). It composes `Alert`: a
 * status, or an alert when everyone else has left, since the Podium follows.
 */
@Component({
  selector: 'atw-connection-banner',
  imports: [Alert],
  templateUrl: './connection-banner.html',
  styleUrl: './connection-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConnectionBanner {
  readonly notice = input.required<ConnectionNotice>();

  protected readonly banner = computed(() => {
    const notice = this.notice();
    const banner = BANNERS[notice.kind];
    const title = notice.kind === 'droppedOut' ? `${notice.nickname} dropped out.` : banner.title;
    return { ...banner, title, urgent: notice.kind === 'everyoneLeft' };
  });
}
