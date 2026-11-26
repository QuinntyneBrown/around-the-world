import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon } from '../icon/icon';

/** What the listener shows: asking, listening (with rings), heard (a tick) or the mic off. */
export type ListenerState = 'asking' | 'listening' | 'heard' | 'off';

/**
 * Listener (docs/design-system/components/listener.html): Milo and Bolt in a circle on Mic
 * Check, with a badge that says whether the microphone hears. The rings show only while
 * listening and are hidden under reduced motion; the page's words always carry the state.
 */
@Component({
  selector: 'atw-listener',
  imports: [Icon],
  templateUrl: './listener.html',
  styleUrl: './listener.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'listener', '[attr.data-kid]': 'kid()' },
})
export class Listener {
  readonly state = input<ListenerState>('asking');
  readonly picture = input.required<string>();
  /** The picture's words: "Milo and his robot Bolt". */
  readonly alt = input.required<string>();
  readonly kid = input('milo');
  protected readonly badge = computed(() => {
    const state = this.state();
    return state === 'off' ? 'mic-off' : state === 'heard' ? 'check' : 'mic';
  });
}
