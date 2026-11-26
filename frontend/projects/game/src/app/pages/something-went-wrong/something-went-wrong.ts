import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Notice, Screen, ToyButton } from '@atw/components';

/**
 * Something Went Wrong (docs/mocks/pages/something-went-wrong/): the game itself broke. It says
 * so in plain words and nothing of the failure, and offers "Try again", which loads the game
 * afresh at the address where it broke, and "Home" (L2-054 criterion 4, docs/adr/0027).
 */
@Component({
  selector: 'atw-something-went-wrong-page',
  imports: [Notice, RouterLink, Screen, ToyButton],
  templateUrl: './something-went-wrong.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SomethingWentWrongPage {
  private readonly document = inject(DOCUMENT);

  /** The address bar still holds the address where the game broke (GameErrorHandler). */
  protected tryAgain(): void {
    this.document.location.reload();
  }
}
