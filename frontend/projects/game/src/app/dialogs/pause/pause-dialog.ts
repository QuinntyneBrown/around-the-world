import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GAME_SESSION } from '@atw/api';
import { Dialog, ToyButton } from '@atw/components';

/** The id of the dialog's title, which names it. */
export const PAUSE_TITLE_ID = 'pause-title';

/** How the Pause dialog closed: "Go home", or anything else, which keeps playing. */
export type PauseResult = 'home' | undefined;

/**
 * Pause (docs/mocks/dialogs/pause/), opened over a solo game with CDK Dialog once the game's
 * clock has stopped: "Keep playing", which Escape and the close button also do, and "Go home",
 * which leaves the game and opens Home (L2-033 criterion 4, docs/adr/0027).
 */
@Component({
  selector: 'atw-pause-dialog',
  imports: [Dialog, ToyButton],
  templateUrl: './pause-dialog.html',
  styleUrl: './pause-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PauseDialog {
  private readonly ref = inject<DialogRef<PauseResult>>(DialogRef);
  private readonly session = inject(GAME_SESSION);
  private readonly router = inject(Router);

  protected readonly titleId = PAUSE_TITLE_ID;
  /** The country of the desk the game is at: the duel's, or the traveller's on World Map. */
  protected readonly country = computed(() => {
    const duel = this.session.duel();
    if (duel) return duel.country;
    const tour = this.session.tour();
    return tour?.desks[tour.travellerDesk - 1]?.country ?? '';
  });

  protected keepPlaying(): void {
    this.ref.close();
  }

  protected async goHome(): Promise<void> {
    await this.session.leave();
    this.ref.close('home');
    await this.router.navigateByUrl('/');
  }
}
