import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { ROOM_CODE_LENGTH, roomCodeLetters } from './room-code-letters';

/**
 * Code field (docs/design-system/components/code-field.html): the four boxes a child types a
 * room's code into, the only thing in the game that is typed (L2-040 criterion 4). One real
 * input labelled "Room code" lies invisible over the boxes; it takes letters only, shows them
 * as capitals and takes four at most (L2-023 criterion 1). `invalid` marks the input
 * `aria-invalid`, which colours the boxes and shakes them once (a colour change only with
 * reduced motion, L2-038 criterion 4). Enter emits `entered` once there are four letters.
 * `value` and `valueChange` pair as `[(value)]`; the field keeps to the framework code every
 * screen already loads, so it adds nothing to the initial bundle (docs/adr/0032).
 */
@Component({
  selector: 'label[atw-code-field]',
  templateUrl: './code-field.html',
  styleUrl: './code-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'code-field' },
})
export class CodeField implements AfterViewInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The letters typed so far, as capitals. */
  readonly value = input('');
  /** The letters after each key, as capitals. */
  readonly valueChange = output<string>();
  /** No room has this code, or it could not be joined: the boxes show it. */
  readonly invalid = input(false);
  /** A join is in progress. */
  readonly disabled = input(false);
  /** The ids of the help and the message line that describe the field. */
  readonly describedBy = input<string>();
  /** Takes the focus when the field is first shown. */
  readonly focusFirst = input(false);
  /** Enter with four letters. */
  readonly entered = output<void>();

  protected readonly boxes = computed(() => {
    const letters = this.value();
    return Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => ({
      letter: letters[i] ?? '',
      waiting: i === letters.length && !this.disabled(),
    }));
  });

  ngAfterViewInit(): void {
    if (this.focusFirst()) this.host.nativeElement.querySelector('input')?.focus();
  }

  protected typed(field: HTMLInputElement): void {
    const letters = roomCodeLetters(field.value);
    field.value = letters;
    this.valueChange.emit(letters);
  }

  /**
   * The boxes show no caret, so before each key the caret moves after the last letter: a
   * Backspace takes that letter, and a new one goes in the waiting box.
   */
  protected toEnd(field: HTMLInputElement): void {
    field.setSelectionRange(field.value.length, field.value.length);
  }

  protected enter(): void {
    if (this.value().length === ROOM_CODE_LENGTH) this.entered.emit();
  }
}
