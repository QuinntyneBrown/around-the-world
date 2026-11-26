import { type MicrophoneAnswer, type VoiceAnswer, type VoiceListener } from '@atw/api';
import { type Recognizer, type RecognizerConstructor } from './speech-recognition';
import { spokenNumber } from './spoken-number';

/** The language recognition listens in (docs/adr/0025-answering-by-voice.md). */
export const RECOGNITION_LANGUAGE = 'en-US';
const ON_DEVICE = { langs: [RECOGNITION_LANGUAGE], processLocally: true } as const;

/**
 * `VoiceAnswer` on the browser's own speech recognition, on the device only. It is the only code
 * that touches the microphone or speech recognition, and `LazyVoiceAnswer` imports it
 * dynamically. A transcript is read by `spokenNumber` and dropped: only a number, or the fact
 * that speech was heard, leaves this class, and no sound is recorded, kept or sent (L2-040).
 */
export class SpeechVoiceAnswer implements VoiceAnswer {
  readonly available = true;
  private readonly listeners = new Set<VoiceListener>();
  private recognition: Recognizer | null = null;
  private wanted = false;

  constructor(private readonly Recognition: RecognizerConstructor) {}

  async requestMicrophone(): Promise<MicrophoneAnswer> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } });
    } catch (error) {
      const refused =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      return refused ? 'refused' : 'failed';
    }
    // The stream only asked the question: it is closed at once (L2-040 criterion 2).
    for (const track of stream.getTracks()) track.stop();
    return this.languageReady();
  }

  start(): void {
    this.wanted = true;
    if (!this.recognition) this.begin();
  }

  stop(): void {
    this.wanted = false;
    const recognition = this.recognition;
    this.recognition = null;
    recognition?.abort();
  }

  listen(listener: VoiceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Whether the on-device language pack is there, installing it when it can be downloaded. */
  private async languageReady(): Promise<MicrophoneAnswer> {
    const { available, install } = this.Recognition;
    if (typeof available !== 'function') return 'allowed';
    try {
      const state = await available.call(this.Recognition, ON_DEVICE);
      if (state === 'available') return 'allowed';
      if (state === 'unavailable' || typeof install !== 'function') return 'failed';
      return (await install.call(this.Recognition, ON_DEVICE)) ? 'allowed' : 'failed';
    } catch {
      return 'failed';
    }
  }

  private begin(): void {
    const recognition = new this.Recognition();
    recognition.lang = RECOGNITION_LANGUAGE;
    recognition.processLocally = true;
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      if (this.recognition !== recognition) return;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (!result.isFinal || result.length === 0) continue;
        this.tell((listener) => listener.heardSpeech?.());
        const value = spokenNumber(result[0].transcript);
        if (value !== null) this.tell((listener) => listener.heard?.(value));
      }
    };
    recognition.onerror = ({ error }) => {
      if (this.recognition !== recognition || error === 'aborted') return;
      if (error === 'no-speech') return this.tell((listener) => listener.noSpeech?.());
      const code =
        error === 'not-allowed' || error === 'service-not-allowed' ? 'refused' : 'failed';
      this.wanted = false;
      this.tell((listener) => listener.failed?.({ code }));
    };
    recognition.onend = () => {
      if (this.recognition !== recognition) return;
      this.recognition = null;
      // A session the browser ends starts again while the page still listens.
      if (this.wanted) this.begin();
    };
    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.recognition = null;
      this.wanted = false;
      this.tell((listener) => listener.failed?.({ code: 'failed' }));
    }
  }

  private tell(call: (listener: VoiceListener) => void): void {
    for (const listener of [...this.listeners]) call(listener);
  }
}
