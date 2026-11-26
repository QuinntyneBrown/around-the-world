import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SkipLink } from '@atw/components';

/** The `game` app shell: the skip link every screen starts with, then the routed screen. */
@Component({
  selector: 'atw-root',
  imports: [RouterOutlet, SkipLink],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
