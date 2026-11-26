/**
 * The parts of the browser's speech recognition the game uses (the Web Speech API, with
 * Chrome's on-device recognition). TypeScript's DOM library does not describe them.
 */
export interface Recognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { readonly error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}

export interface RecognitionResultEvent {
  readonly resultIndex: number;
  readonly results: ArrayLike<ArrayLike<{ readonly transcript: string }> & { isFinal: boolean }>;
}

/** What the browser says about its on-device language pack. */
export type LanguageAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

export interface RecognizerOptions {
  readonly langs: readonly string[];
  readonly processLocally: boolean;
}

export interface RecognizerConstructor {
  new (): Recognizer;
  readonly prototype: object;
  available?(options: RecognizerOptions): Promise<LanguageAvailability>;
  install?(options: RecognizerOptions): Promise<boolean>;
}

/**
 * The browser's speech recognition, when it can recognise speech on the device; null otherwise
 * (docs/adr/0025-answering-by-voice.md). It creates nothing and opens no microphone.
 */
export function onDeviceRecognizer(): RecognizerConstructor | null {
  const scope = globalThis as unknown as Record<string, unknown>;
  const found = scope['SpeechRecognition'] ?? scope['webkitSpeechRecognition'];
  if (typeof found !== 'function') return null;
  const recognizer = found as RecognizerConstructor;
  return 'processLocally' in recognizer.prototype ? recognizer : null;
}
