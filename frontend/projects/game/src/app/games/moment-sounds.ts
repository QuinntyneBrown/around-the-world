import { DestroyRef, inject, Injectable } from '@angular/core';
import { GAME_SESSION, SOUND, type GameMoment, type SoundId } from '@atw/api';

/** The sound of each moment of the game (docs/adr/0029-motion-and-sound.md, L2-039 1). */
const SOUND_OF: Record<GameMoment, SoundId> = {
  answerCorrect: 'chime',
  countryReached: 'jingle',
};

/**
 * Plays the sound of each moment the game reports: a chime for the child's correct answer and a
 * jingle for a new country (docs/detailed-designs/classroom/play-motion-and-sound/). A lost duel
 * and a wrong answer are no moment, so no buzzer exists (L2-038 criterion 3). It stops listening
 * when its group is destroyed, and uses no effect (docs/adr/0023).
 */
@Injectable()
export class MomentSounds {
  constructor() {
    const sound = inject(SOUND);
    const stop = inject(GAME_SESSION).watchMoments((moment) => sound.play(SOUND_OF[moment]));
    inject(DestroyRef).onDestroy(stop);
  }
}
