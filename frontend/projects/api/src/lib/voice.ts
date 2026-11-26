import { InjectionToken, type Signal } from '@angular/core';

/** How a player gives answers: by voice or with the number pad (L1-003). */
export type AnswerWay = 'voice' | 'numberPad';

/** How the browser answered the question about the microphone. */
export type MicrophoneAnswer = 'allowed' | 'refused' | 'failed';

/**
 * Why speech recognition stopped: the microphone was refused, or recognition failed on the
 * device (docs/adr/0025-answering-by-voice.md).
 */
export interface VoiceError {
  readonly code: 'refused' | 'failed';
}

/** What the device heard. No transcript and no sound crosses it (L2-040 criterion 2). */
export interface VoiceListener {
  /** A spoken whole number, read from a final transcript (L2-009 criterion 1). */
  heard?(value: number): void;
  /** Any speech at all, which is what Mic Check waits for (L2-012 criterion 2). */
  heardSpeech?(): void;
  /** The browser heard no speech for a while (L2-012 criterion 11). */
  noSpeech?(): void;
  /** Recognition stopped and will not start again by itself. */
  failed?(error: VoiceError): void;
}

/**
 * The microphone and speech recognition, on the device only
 * (docs/detailed-designs/answering/answer-by-voice/). Only `domain`'s `voice/` implements it.
 */
export interface VoiceAnswer {
  /** Whether the browser can recognise speech on the device. */
  readonly available: boolean;
  /** Asks the browser for the microphone, and closes the stream it opened at once. */
  requestMicrophone(): Promise<MicrophoneAnswer>;
  /** Starts listening; a session the browser ends starts again until `stop()`. */
  start(): void;
  /** Stops listening and releases the microphone. */
  stop(): void;
  /** Tells the listener what is heard; returns a function that stops telling it. */
  listen(listener: VoiceListener): () => void;
}

export const VOICE_ANSWER = new InjectionToken<VoiceAnswer>('VOICE_ANSWER');

/** How Mic Check ended (docs/detailed-designs/answering/check-mic/). */
export type MicCheckOutcome = 'heard' | 'numberPad' | 'refused' | 'failed';

/**
 * The way of answering: the one kept on the device, the one in use in this visit, and whether
 * Mic Check is needed (docs/adr/0025-answering-by-voice.md).
 */
export interface WayOfAnswering {
  /** Whether the browser can recognise speech on the device at all. */
  readonly available: boolean;
  /** The way kept on the device: "Answer by shouting" in Settings (L2-032 criterion 4). */
  readonly kept: Signal<AnswerWay>;
  /** Whether voice may be used in this visit: available, and not refused or failed. */
  readonly voiceOffered: Signal<boolean>;
  /** The way in use: the kept way while voice is offered, the number pad otherwise. */
  readonly way: Signal<AnswerWay>;
  /** Whether a game about to begin shows Mic Check first (L2-012 criteria 5, 6 and 13). */
  readonly micCheckNeeded: Signal<boolean>;
  /** Keeps the way on the device (L2-011 criteria 1 and 2). */
  use(way: AnswerWay): void;
  /** Records how Mic Check ended for this visit. */
  finishMicCheck(outcome: MicCheckOutcome): void;
  /** The microphone was refused: the number pad for the rest of the visit (L2-011 criterion 6). */
  loseVoice(): void;
}

export const WAY_OF_ANSWERING = new InjectionToken<WayOfAnswering>('WAY_OF_ANSWERING');
