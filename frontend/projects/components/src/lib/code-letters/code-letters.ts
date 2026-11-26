import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Code letters (docs/design-system/components/code-letters.html): four letters in boxes, a
 * picture of what a room code looks like. It is not a room's code and not a field: one image
 * whose name spells the letters ("A room code looks like B O L T").
 */
@Component({
  selector: 'atw-code-letters',
  templateUrl: './code-letters.html',
  styleUrl: './code-letters.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'code-letters',
    role: 'img',
    '[attr.aria-label]': 'label()',
  },
})
export class CodeLetters {
  /** Four capital letters. */
  readonly letters = input.required<string>();
  protected readonly each = computed(() => [...this.letters()]);
  protected readonly label = computed(() => `A room code looks like ${this.each().join(' ')}`);
}
