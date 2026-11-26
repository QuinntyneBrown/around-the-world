import { computed, inject, Injectable } from '@angular/core';
import {
  PLAYER_CHOICES,
  VISIT,
  VOICE_ANSWER,
  type AnswerWay,
  type MicCheckOutcome,
  type WayOfAnswering,
} from '@atw/api';

/**
 * `WayOfAnswering` from what the device keeps (`PlayerChoices.wayOfAnswering`) and what the
 * visit remembers (`Visit`); it holds no state of its own, so each route that binds it agrees
 * with the others (docs/adr/0025-answering-by-voice.md).
 */
@Injectable()
export class KeptWayOfAnswering implements WayOfAnswering {
  private readonly choices = inject(PLAYER_CHOICES);
  private readonly visit = inject(VISIT);

  readonly available = inject(VOICE_ANSWER).available;
  readonly kept = computed<AnswerWay>(() =>
    this.available ? this.choices.wayOfAnswering() : 'numberPad',
  );
  readonly voiceOffered = computed(() => this.available && !this.visit.voiceLost());
  readonly way = computed<AnswerWay>(() => (this.voiceOffered() ? this.kept() : 'numberPad'));
  readonly micCheckNeeded = computed(() => this.way() === 'voice' && !this.visit.micCheckDone());

  use(way: AnswerWay): void {
    if (way === 'voice' && !this.available) return;
    this.choices.changeWayOfAnswering(way);
  }

  finishMicCheck(outcome: MicCheckOutcome): void {
    this.visit.finishMicCheck();
    if (outcome === 'heard') this.use('voice');
    else if (outcome === 'numberPad') this.use('numberPad');
    // A refusal or a failure keeps the way as it was, so the next visit asks again.
    else this.visit.loseVoice();
  }

  loseVoice(): void {
    this.visit.loseVoice();
  }
}
