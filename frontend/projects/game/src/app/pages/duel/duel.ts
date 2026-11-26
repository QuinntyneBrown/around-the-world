import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DuelHud, FlashCard, Screen } from '@atw/components';

/**
 * Duel (docs/mocks/pages/duel/). Journey 03 opens it from "Go!" in its loading state: the
 * classroom's picture, the duel's HUD in skeletons and the flash card being dealt
 * (docs/adr/0017). Journey 04 deals the cards and plays the duel; the world ring, the desk
 * pill and Pause come with their journeys.
 */
@Component({
  selector: 'atw-duel-page',
  imports: [DuelHud, FlashCard, Screen],
  templateUrl: './duel.html',
  styleUrl: './duel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DuelPage {}
