import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Mode grid (docs/design-system/components/mode-card.html): the two ways to play, one above
 * the other, and side by side from 768px. It sits on the native `<div>` (docs/adr/0012).
 */
@Component({
  selector: 'div[atw-mode-grid]',
  templateUrl: './mode-grid.html',
  styleUrl: './mode-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mode-grid' },
})
export class ModeGrid {}
