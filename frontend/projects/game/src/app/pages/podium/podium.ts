import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_SESSION, VISIT } from '@atw/api';
import { Passport, Podium, Screen, ScreenBody, Skeleton, Stack, ToyButton } from '@atw/components';
import { kidById } from '@atw/domain';
import { PodiumWords } from './podium-words';

/**
 * Podium (docs/mocks/pages/podium/): the headline, the top three, the child's passport, and
 * "Play again" and "Home" (L2-035). It shows the result `GameSession` publishes when the tour is
 * over; until then it is in its loading state ("Counting the desks…"), which a solo game never
 * shows, as it publishes the result before the Podium opens (docs/adr/0024-ending-a-tour.md).
 * "Home" leaves the solo group, which destroys the game (L2-035 criterion 4).
 */
@Component({
  selector: 'atw-podium-page',
  imports: [Passport, Podium, RouterLink, Screen, ScreenBody, Skeleton, Stack, ToyButton],
  templateUrl: './podium.html',
  styleUrl: './podium.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodiumPage {
  private readonly session = inject(GAME_SESSION);

  protected readonly result = this.session.result;
  protected readonly headline = computed(() => {
    const result = this.result();
    return result ? PodiumWords.headline(result) : '';
  });
  protected readonly cheer = computed(() => {
    const result = this.result();
    return result ? PodiumWords.cheer(result) : '';
  });
  protected readonly places = computed(() => {
    const result = this.result();
    return result ? PodiumWords.places(result) : [];
  });
  protected readonly kid = computed(() => {
    const result = this.result();
    return result ? PodiumWords.yourKid(result) : 'zuri';
  });
  protected readonly picture = computed(() => kidById(this.kid()).picture);
  protected readonly stamps = computed(() => {
    const result = this.result();
    return result ? PodiumWords.stamps(result) : [];
  });

  constructor() {
    // Home's button reads "Play again" once a Podium has been shown (L2-032 criterion 2).
    if (this.result()) inject(VISIT).finishTour();
  }

  /** A new tour with the same kid and setup; the game then opens Duel (L2-035 criterion 3). */
  protected playAgain(): void {
    this.session.playAgain();
  }
}
