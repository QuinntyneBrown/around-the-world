import { Dialog } from '@angular/cdk/dialog';
import { createEnvironmentInjector, type EnvironmentInjector } from '@angular/core';
import { VOICE_ANSWER, WAY_OF_ANSWERING } from '@atw/api';
import { KeptWayOfAnswering, LazyVoiceAnswer } from '@atw/domain';
import { SETTINGS_TITLE_ID, SettingsDialog } from './settings-dialog';

/**
 * Opens Settings with CDK Dialog (L2-032 criterion 4). Home imports this module when the
 * settings button is first chosen, so the dialog and CDK stay out of Home's chunk. The dialog
 * gets the way of answering from an injector of its own, destroyed when it closes.
 */
export function openSettings(parent: EnvironmentInjector): void {
  const injector = createEnvironmentInjector(
    [
      { provide: VOICE_ANSWER, useClass: LazyVoiceAnswer },
      { provide: WAY_OF_ANSWERING, useClass: KeptWayOfAnswering },
    ],
    parent,
  );
  const ref = injector.get(Dialog).open(SettingsDialog, {
    injector,
    ariaLabelledBy: SETTINGS_TITLE_ID,
    // The safe choice, Done, takes the focus (docs/design-system/components/dialog.html).
    autoFocus: '.dialog__footer .toy-btn',
    // The dialog draws its own backdrop and places its panel in a pane that fills the screen.
    hasBackdrop: false,
    ariaModal: true,
    width: '100%',
    height: '100%',
    restoreFocus: true,
  });
  ref.closed.subscribe(() => injector.destroy());
}
