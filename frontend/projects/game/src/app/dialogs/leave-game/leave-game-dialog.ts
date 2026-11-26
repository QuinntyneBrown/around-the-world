import { DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GAME_SESSION } from '@atw/api';
import { Dialog, Spinner, ToyButton } from '@atw/components';

/** The id of the dialog's title, which names it. */
export const LEAVE_GAME_TITLE_ID = 'leave-game-title';

/** How the dialog closed: the player left, or stays and plays on. */
export type LeaveGameResult = 'left' | undefined;

/**
 * Leave the game (docs/mocks/dialogs/leave-game/), opened from Duel in a game with friends with
 * CDK Dialog: it asks first, and "Leave" tells the room, busy meanwhile with nothing else to
 * choose, then opens Home (L2-033 criterion 4, docs/adr/0027). What the room does when a player
 * leaves is designed in the `rooms` subsystem.
 */
@Component({
  selector: 'atw-leave-game-dialog',
  imports: [Dialog, Spinner, ToyButton],
  templateUrl: './leave-game-dialog.html',
  styleUrl: './leave-game-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveGameDialog {
  private readonly ref = inject<DialogRef<LeaveGameResult>>(DialogRef);
  private readonly session = inject(GAME_SESSION);
  private readonly router = inject(Router);

  protected readonly titleId = LEAVE_GAME_TITLE_ID;
  /** While the room is being told: "Leaving…", and the dialog cannot be closed. */
  protected readonly leaving = signal(false);

  protected stay(): void {
    if (!this.leaving()) this.ref.close();
  }

  protected async leave(): Promise<void> {
    this.leaving.set(true);
    // Escape and a press outside are refused while the room is told.
    this.ref.disableClose = true;
    await this.session.leave();
    this.ref.close('left');
    await this.router.navigateByUrl('/');
  }
}
