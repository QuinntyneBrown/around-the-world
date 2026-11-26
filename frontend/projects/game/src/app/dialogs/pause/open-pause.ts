import { Dialog } from '@angular/cdk/dialog';
import { type Injector } from '@angular/core';
import { GAME_SESSION } from '@atw/api';
import { PAUSE_TITLE_ID, PauseDialog, type PauseResult } from './pause-dialog';

/** The dialog's id: a second request while it is open opens nothing (docs/adr/0027). */
const PAUSE_ID = 'pause';

/**
 * Stops the game's clock and opens Pause with CDK Dialog (L2-033 criterion 4). Duel imports this
 * module on the first press of Pause, and the browser's Back during a game does the same, so the
 * dialog and CDK stay out of Duel's chunk (docs/adr/0026). Any close but "Go home" resumes the
 * game, and the focus returns to where it was.
 */
export function openPause(injector: Injector): void {
  const dialogs = injector.get(Dialog);
  if (dialogs.getDialogById(PAUSE_ID)) return;
  const session = injector.get(GAME_SESSION);
  session.pause();
  const ref = dialogs.open<PauseResult, unknown, PauseDialog>(PauseDialog, {
    id: PAUSE_ID,
    injector,
    ariaLabelledBy: PAUSE_TITLE_ID,
    // The safe choice, Keep playing, takes the focus (docs/mocks/dialogs/pause/).
    autoFocus: '.dialog__footer .toy-btn',
    // The dialog draws its own backdrop and places its panel in a pane that fills the screen.
    hasBackdrop: false,
    ariaModal: true,
    width: '100%',
    height: '100%',
    restoreFocus: true,
    // The browser's Back is held by the game screens' guard, which restores the history with a
    // popstate of its own; that must not close the dialog it opened.
    closeOnNavigation: false,
  });
  ref.closed.subscribe((result) => {
    if (result !== 'home') session.resume();
  });
}
