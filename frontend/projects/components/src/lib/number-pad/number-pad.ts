import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';
import { NumberEntry } from './number-entry';

/** The keys a press on the pad or the keyboard can be. */
export type PadKey = number | 'delete' | 'go';

/**
 * Number pad (docs/design-system/components/number-pad.html): the digits 1 to 9, then
 * "Delete", 0 and "Go" (L2-010). The `entry` is two-way (`[(entry)]`), so the page shows the
 * digits on the flash card as they are pressed and empties it for a new card and when a freeze
 * ends (L2-010 criterion 7). "Go" emits the whole number, and nothing when no digit is entered. Digits, Backspace and Enter on the keyboard act as its
 * keys, unless the focus is in a text field or Enter is on a link or a button of its own
 * (docs/adr/0020). While `disabled` no key enters anything (L2-010 criterion 6).
 */
@Component({
  selector: 'atw-number-pad',
  imports: [Icon],
  templateUrl: './number-pad.html',
  styleUrl: './number-pad.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'number-pad',
    role: 'group',
    'aria-label': 'Number pad',
    '(document:keydown)': 'onKey($event)',
  },
})
export class NumberPad {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly disabled = input(false);
  readonly entry = input('');
  readonly entryChange = output<string>();
  readonly go = output<number>();
  /** Every key pressed, for the pop of a key (L2-039). */
  readonly keyPress = output<PadKey>();

  protected readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  protected press(key: PadKey): void {
    if (this.disabled()) return;
    this.keyPress.emit(key);
    if (key === 'go') {
      const value = NumberEntry.value(this.entry());
      if (value !== null) this.go.emit(value);
    } else if (key === 'delete') {
      this.entryChange.emit(NumberEntry.removeLast(this.entry()));
    } else {
      this.entryChange.emit(NumberEntry.add(this.entry(), key));
    }
  }

  protected onKey(event: KeyboardEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^[0-9]$/.test(event.key)) this.press(Number(event.key));
    else if (event.key === 'Backspace') this.press('delete');
    else if (event.key === 'Enter' && !this.ownsOther(target)) this.press('go');
    else return;
    event.preventDefault();
  }

  /** Whether the target is a link or a button that is not one of the pad's own keys. */
  private ownsOther(target: Element | null): boolean {
    return !!target?.closest('a, button') && !this.host.nativeElement.contains(target);
  }
}
