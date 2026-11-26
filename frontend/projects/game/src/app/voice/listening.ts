import { DestroyRef, Directive, inject, output } from '@angular/core';
import { VOICE_ANSWER, type VoiceError } from '@atw/api';

/**
 * Listens while its element is shown: it starts speech recognition when it is created and stops
 * it when it is destroyed, so the page listens exactly while it shows "Shout it!" (L2-009
 * criterion 5), with no effect (docs/adr/0025-answering-by-voice.md). It hears numbers only.
 */
@Directive({ selector: '[atwListening]' })
export class Listening {
  /** A spoken whole number (L2-009 criterion 1). */
  readonly heard = output<number>();
  /** Recognition stopped: the microphone was refused, or it failed on the device. */
  readonly failed = output<VoiceError>();

  constructor() {
    const voice = inject(VOICE_ANSWER);
    const stopListening = voice.listen({
      heard: (value) => this.heard.emit(value),
      failed: (error) => this.failed.emit(error),
    });
    voice.start();
    inject(DestroyRef).onDestroy(() => {
      stopListening();
      voice.stop();
    });
  }
}
