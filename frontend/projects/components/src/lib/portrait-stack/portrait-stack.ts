import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Portrait stack (docs/design-system/components/portrait.html): round portraits in a row, each
 * overlapping the one before it. It sits on the native `<div>` (docs/adr/0012); the page
 * projects the `atw-portrait`s.
 */
@Component({
  selector: 'div[atw-portrait-stack]',
  templateUrl: './portrait-stack.html',
  styleUrl: './portrait-stack.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'portrait-stack' },
})
export class PortraitStack {}
