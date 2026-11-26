import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { GAME_SESSION, VOICE_ANSWER, WAY_OF_ANSWERING, type MicCheckOutcome } from '@atw/api';
import {
  IconButton,
  LevelMeter,
  Listener,
  Screen,
  Spinner,
  TextButton,
  TopBar,
  ToyButton,
  type ListenerState,
} from '@atw/components';
import { kidById } from '@atw/domain';

/** The steps of Mic Check (docs/detailed-designs/answering/check-mic/). */
export type MicCheckStep =
  'asking' | 'waiting' | 'listening' | 'notHeard' | 'heard' | 'refused' | 'failed';

/** The words of each step (docs/mocks/pages/mic-check/). */
const WORDS: Record<MicCheckStep, { title: string; body: string }> = {
  asking: {
    title: 'You answer by shouting!',
    body: 'Bolt listens for your answer. Your voice is never saved or sent to anyone.',
  },
  waiting: {
    title: 'Say yes to the mic',
    body: 'Your browser is asking if Bolt can listen. Choose “Allow”.',
  },
  listening: { title: 'Shout “Ready!”', body: 'As loud as you like. Bolt is listening.' },
  notHeard: {
    title: 'Bolt didn’t catch that',
    body: 'Try once more, a bit louder and closer to the screen.',
  },
  heard: { title: 'Bolt heard you!', body: 'Your mic works. When a card flips, shout the answer.' },
  refused: {
    title: 'Bolt can’t hear you',
    body: 'The mic is turned off. Ask a grown-up to allow it in the browser, or play with the number pad.',
  },
  failed: {
    title: 'Bolt’s ears aren’t working',
    body: 'Listening stopped working on this device. You can still play by tapping your answers.',
  },
};

/**
 * Mic Check (docs/mocks/pages/mic-check/): asks for the microphone and for a shout of
 * "Ready!" before the first duel, and settles the way of answering (L2-012). It touches the
 * microphone only through `VOICE_ANSWER`, and stops listening when a way is chosen and when it
 * is destroyed (L2-040 criterion 2). Leaving it deals the first card (L2-012 criterion 8).
 */
@Component({
  selector: 'atw-mic-check-page',
  imports: [
    IconButton,
    LevelMeter,
    Listener,
    RouterLink,
    Screen,
    Spinner,
    TextButton,
    TopBar,
    ToyButton,
  ],
  templateUrl: './mic-check.html',
  styleUrl: './mic-check.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MicCheckPage {
  private readonly session = inject(GAME_SESSION);
  private readonly voice = inject(VOICE_ANSWER);
  private readonly way = inject(WAY_OF_ANSWERING);
  private destroyed = false;

  protected readonly milo = kidById('milo');
  protected readonly step = signal<MicCheckStep>('asking');
  protected readonly words = computed(() => WORDS[this.step()]);
  /** The refusal and the failure are alerts; every other step is a status. */
  protected readonly alert = computed(() => this.step() === 'refused' || this.step() === 'failed');
  protected readonly listener = computed<ListenerState>(() => {
    const step = this.step();
    if (step === 'listening' || step === 'heard') return step;
    return this.alert() ? 'off' : 'asking';
  });

  constructor() {
    const stopListening = this.voice.listen({
      heardSpeech: () => this.whileListening('heard'),
      noSpeech: () => this.whileListening('notHeard'),
      failed: ({ code }) => {
        this.voice.stop();
        this.step.set(code === 'refused' ? 'refused' : 'failed');
      },
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      stopListening();
      this.voice.stop();
    });
  }

  /** "Turn on mic": the browser asks the child, and Mic Check waits for the answer. */
  protected async turnOnMic(): Promise<void> {
    this.step.set('waiting');
    const answer = await this.voice.requestMicrophone();
    // The child may have tapped instead, or left, while the browser asked.
    if (this.destroyed || this.step() !== 'waiting') return;
    if (answer === 'allowed') this.listen();
    else this.step.set(answer === 'refused' ? 'refused' : 'failed');
  }

  /** Listens for "Ready!", the first time and after "Try again" (L2-012 criterion 11). */
  protected listen(): void {
    this.step.set('listening');
    this.voice.start();
  }

  /** "Let's go!" starts the game with voice (L2-012 criterion 2). */
  protected letsGo(): void {
    this.finish('heard');
  }

  /** "Use number pad" after a refusal or a failure (L2-012 criteria 3 and 12). */
  protected useNumberPad(): void {
    this.finish(this.step() === 'refused' ? 'refused' : 'failed');
  }

  /** "Too noisy? Tap answers instead" (L2-012 criterion 4). */
  protected tapInstead(): void {
    this.finish('numberPad');
  }

  private whileListening(next: 'heard' | 'notHeard'): void {
    if (this.step() !== 'listening') return;
    this.voice.stop();
    this.step.set(next);
  }

  private finish(outcome: MicCheckOutcome): void {
    this.voice.stop();
    this.way.finishMicCheck(outcome);
    this.session.continue();
  }
}
