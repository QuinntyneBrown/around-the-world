import { InjectionToken, type Signal } from '@angular/core';

/**
 * What the game remembers for this visit only, from opening it to closing or reloading it. It
 * is never kept on the device (L2-015 criterion 4).
 */
export interface Visit {
  /** Whether a tour was finished in this visit: Home's button then reads "Play again". */
  readonly tourFinished: Signal<boolean>;
  /** Called when a Podium is shown (journey 06). */
  finishTour(): void;
  /** Whether Mic Check has finished in this visit (L2-012 criterion 6). */
  readonly micCheckDone: Signal<boolean>;
  finishMicCheck(): void;
  /** Whether the microphone was refused, or recognition failed at Mic Check, in this visit. */
  readonly voiceLost: Signal<boolean>;
  loseVoice(): void;
}

export const VISIT = new InjectionToken<Visit>('VISIT');
