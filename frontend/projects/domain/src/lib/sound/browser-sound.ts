import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';
import { PLAYER_CHOICES, type Sound, type SoundId } from '@atw/api';

/** The three sounds, in the order they are made (docs/adr/0029-motion-and-sound.md). */
const SOUNDS: readonly SoundId[] = ['pop', 'chime', 'jingle'];

/** The browser's record of a touch, click or key press on the page (User Activation API). */
interface WithUserActivation {
  readonly userActivation?: { readonly hasBeenActive: boolean };
}

/**
 * `Sound` on the browser's audio elements (docs/detailed-designs/classroom/
 * play-motion-and-sound/). It plays nothing while muted (L2-039 criterion 2) or before the
 * browser records the child's first touch (criterion 3). It makes the three audio elements, from
 * the game's own origin, on the first sound it plays, so nothing is fetched until a sound is
 * due, and lets them go when the solo group that provides it is destroyed (L2-048 criterion 3).
 */
@Injectable()
export class BrowserSound implements Sound {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly window = inject(DOCUMENT).defaultView;
  private players: Map<SoundId, HTMLAudioElement> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.release());
  }

  play(sound: SoundId): void {
    if (this.choices.soundMuted() || !this.touched()) return;
    const player = this.made()?.get(sound);
    if (!player) return;
    try {
      player.currentTime = 0;
      // A sound the browser refuses is let go: the game never waits on one.
      void player.play()?.catch(() => undefined);
    } catch {
      // An audio element that cannot play: the game goes on in silence.
    }
  }

  /** Whether the child has touched the page; a browser that cannot say lets its own rule decide. */
  private touched(): boolean {
    const activation = (this.window?.navigator as WithUserActivation | undefined)?.userActivation;
    return activation ? activation.hasBeenActive : true;
  }

  private made(): Map<SoundId, HTMLAudioElement> | null {
    const Audio = this.window?.Audio;
    if (!this.players && Audio) {
      this.players = new Map(
        SOUNDS.map((sound) => {
          const player = new Audio(`sounds/${sound}.wav`);
          player.preload = 'auto';
          return [sound, player];
        }),
      );
    }
    return this.players;
  }

  private release(): void {
    for (const player of this.players?.values() ?? []) {
      player.pause();
      player.removeAttribute('src');
      player.load();
    }
    this.players = null;
  }
}
