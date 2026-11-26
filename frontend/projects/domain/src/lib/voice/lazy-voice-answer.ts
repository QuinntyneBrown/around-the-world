import { DestroyRef, inject, Injectable } from '@angular/core';
import { type MicrophoneAnswer, type VoiceAnswer, type VoiceListener } from '@atw/api';
import { onDeviceRecognizer } from './speech-recognition';
import { type SpeechVoiceAnswer } from './speech-voice-answer';

/**
 * The `VoiceAnswer` a route binds: it says at once whether voice is available, and imports
 * `SpeechVoiceAnswer` the first time the microphone is asked for or listening starts, so speech
 * code stays out of the initial bundle (docs/adr/0025-answering-by-voice.md). It stops listening
 * when its route is destroyed.
 */
@Injectable()
export class LazyVoiceAnswer implements VoiceAnswer {
  private readonly recognizer = onDeviceRecognizer();
  readonly available = this.recognizer !== null;
  private readonly listeners = new Set<VoiceListener>();
  private loading: Promise<SpeechVoiceAnswer | null> | null = null;
  private loaded: SpeechVoiceAnswer | null = null;
  private wanted = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.stop();
      this.listeners.clear();
    });
  }

  async requestMicrophone(): Promise<MicrophoneAnswer> {
    const voice = await this.load();
    return voice ? voice.requestMicrophone() : 'failed';
  }

  start(): void {
    if (!this.available) return;
    this.wanted = true;
    void this.load().then((voice) => {
      if (this.wanted) voice?.start();
    });
  }

  stop(): void {
    this.wanted = false;
    this.loaded?.stop();
  }

  listen(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private load(): Promise<SpeechVoiceAnswer | null> {
    const recognizer = this.recognizer;
    if (!recognizer) return Promise.resolve(null);
    this.loading ??= import('./speech-voice-answer').then(
      ({ SpeechVoiceAnswer }) => {
        const voice = new SpeechVoiceAnswer(recognizer);
        voice.listen({
          heard: (value) => this.tell((listener) => listener.heard?.(value)),
          heardSpeech: () => this.tell((listener) => listener.heardSpeech?.()),
          noSpeech: () => this.tell((listener) => listener.noSpeech?.()),
          failed: (error) => this.tell((listener) => listener.failed?.(error)),
        });
        this.loaded = voice;
        return voice;
      },
      () => {
        this.tell((listener) => listener.failed?.({ code: 'failed' }));
        return null;
      },
    );
    return this.loading;
  }

  private tell(call: (listener: VoiceListener) => void): void {
    for (const listener of [...this.listeners]) call(listener);
  }
}
