import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** The keys a press on the pad or the keyboard can be. */
export type PadKey = number | 'delete' | 'go';

/**
 * Number pad (docs/design-system/components/number-pad.html): the digits 1 to 9, then
 * "Delete", 0 and "Go" (L2-010). It emits each key pressed, on the pad or on the keyboard, and
 * the page keeps the entry with `NumberEntry`, so two keys pressed between two renders both
 * count. Digits, Backspace and Enter on the keyboard act as its keys, unless the focus is in a
 * text field or Enter is on a link or a button of its own (docs/adr/0020). While `disabled` no
 * key is emitted (L2-010 criterion 6).
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
  /** Each key pressed: a digit, "delete" or "go". */
  readonly keyPress = output<PadKey>();

  protected readonly digits = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

  protected press(key: PadKey): void {
    if (!this.disabled()) this.keyPress.emit(key);
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
