import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Skip link (docs/design-system/components/skip-link.html): the first stop of the keyboard on
 * every screen, hidden until it is focused, that jumps past the chrome to the screen's content.
 */
@Component({
  selector: 'atw-skip-link',
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkipLink {
  /** The id of the element the link skips to. */
  readonly target = input.required<string>();

  protected readonly href = computed(() => `#${this.target()}`);
}
