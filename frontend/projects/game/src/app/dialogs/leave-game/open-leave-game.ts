import { Dialog } from '@angular/cdk/dialog';
import { type Injector } from '@angular/core';
import { LEAVE_GAME_TITLE_ID, LeaveGameDialog, type LeaveGameResult } from './leave-game-dialog';

/**
 * Opens "Leave the game?" with CDK Dialog (L2-033 criterion 4). Duel imports this module on the
 * first press of "Leave the game", so the dialog and CDK stay out of Duel's chunk (ADR 0026).
 * The game goes on behind it; the focus returns to the button when it closes.
 */
export function openLeaveGame(injector: Injector): void {
  injector.get(Dialog).open<LeaveGameResult, unknown, LeaveGameDialog>(LeaveGameDialog, {
    injector,
    ariaLabelledBy: LEAVE_GAME_TITLE_ID,
    // The safe choice, Stay and play, takes the focus (docs/mocks/dialogs/leave-game/).
    autoFocus: '.dialog__footer .toy-btn',
    // The dialog draws its own backdrop and places its panel in a pane that fills the screen.
    hasBackdrop: false,
    ariaModal: true,
    width: '100%',
    height: '100%',
    restoreFocus: true,
  });
}
