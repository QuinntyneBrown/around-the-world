import { InjectionToken } from '@angular/core';

/**
 * The game's three sounds (L2-039): a pop for a key of the number pad, a chime for a correct
 * answer and a jingle for a new country (docs/adr/0029-motion-and-sound.md).
 */
export type SoundId = 'pop' | 'chime' | 'jingle';

/**
 * Plays the game's sounds (docs/detailed-designs/classroom/play-motion-and-sound/). A sound
 * plays only while sound is on (`PlayerChoices.soundMuted`) and once the child has touched the
 * page; otherwise `play` does nothing (L2-039 criteria 2 and 3). It never throws.
 */
export interface Sound {
  play(sound: SoundId): void;
}

export const SOUND = new InjectionToken<Sound>('SOUND');
