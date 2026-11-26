import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Room code (docs/design-system/components/room-code.html): "Room code", the code in the
 * largest type on the screen, read letter by letter by a screen reader, an action beside it
 * (`slot="action"`) and "Say it out loud so friends can type it in." (L2-024 criterion 1). It
 * sits on the native `<section>` (docs/adr/0012), named by its label.
 */
@Component({
  selector: 'section[atw-room-code]',
  templateUrl: './room-code.html',
  styleUrl: './room-code.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'room-code', 'aria-labelledby': 'room-code-label' },
})
export class RoomCode {
  /** Four capital letters. */
  readonly code = input.required<string>();
  /** The letters one by one, so a screen reader spells the code: "B O L T". */
  protected readonly spelled = computed(() => [...this.code()].join(' '));
}
