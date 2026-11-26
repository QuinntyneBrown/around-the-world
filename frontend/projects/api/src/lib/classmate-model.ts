import { InjectionToken } from '@angular/core';
import { type FlashCard } from './flash-card';
import { type MathsKind } from './game-setup';

/**
 * What the on-device model may decide for a classmate: an answer and when it comes, read as two
 * numbers (L2-021 criterion 2, L2-042 criterion 1). It has no text.
 */
export interface ModelDecision {
  /** A whole number from 0 to 999. */
  readonly answer: number;
  /** Whole milliseconds from the moment the classmate can answer, from 1 to 10,000. */
  readonly afterMs: number;
}

/** The profile a model session is primed with: nothing of the child (L2-042 criterion 3). */
export interface ClassmateModelProfile {
  readonly skill: number;
  readonly characteristics: readonly string[];
  readonly preferredMaths: readonly MathsKind[];
}

/** One classmate's conversation with the on-device model, for one tour. */
export interface ClassmateModelSession {
  /**
   * The model's decision on the card, or null when it fails, is aborted or is not a whole-number
   * answer and a time. It never throws.
   */
  decide(card: FlashCard, signal: AbortSignal): Promise<ModelDecision | null>;
  /** Aborts every prompt still waiting and lets the session go. */
  destroy(): void;
}

/**
 * The browser's on-device model as the game sees it
 * (docs/detailed-designs/classmates/drive-classmates-with-model/,
 * docs/adr/0030-classmates-with-the-on-device-model.md). Only `domain`'s `classmates/`
 * implements it.
 */
export interface ClassmateModel {
  /** Whether the model is present and already downloaded; never starts a download. */
  isReady(): Promise<boolean>;
  /** Opens a session primed with the profile; rejects when the browser cannot. */
  openSession(profile: ClassmateModelProfile): Promise<ClassmateModelSession>;
}

export const CLASSMATE_MODEL = new InjectionToken<ClassmateModel>('CLASSMATE_MODEL');
