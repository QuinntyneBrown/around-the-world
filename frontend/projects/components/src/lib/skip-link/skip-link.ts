import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Skip link (docs/design-system/components/skip-link.html): the first stop of the keyboard on
 * every screen, hidden until it is focused, that jumps past the chrome to the screen's content.
 * It moves the focus itself: with the document's `<base href="/">` a bare `#main` would take the
 * browser to the root address, and so to Home, from any other screen (L2-051 criterion 1).
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

  /** Focuses the target, which takes the focus without joining the Tab order, and stays put. */
  protected skip(event: MouseEvent): void {
    const link = event.currentTarget as HTMLElement;
    const target = link.ownerDocument.getElementById(this.target());
    if (!target) return;
    event.preventDefault();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus();
  }
}
