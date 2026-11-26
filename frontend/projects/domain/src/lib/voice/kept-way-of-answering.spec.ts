import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  PLAYER_CHOICES,
  VISIT,
  VOICE_ANSWER,
  type AnswerWay,
  type MicCheckOutcome,
  type PlayerChoices,
  type Visit,
} from '@atw/api';
import { KeptWayOfAnswering } from './kept-way-of-answering';

/** The way of answering, one case per row of docs/adr/0025-answering-by-voice.md. */
describe('KeptWayOfAnswering', () => {
  function wayWith(available: boolean, kept?: AnswerWay) {
    const way = signal<AnswerWay>(kept ?? 'voice');
    const choices = {
      wayOfAnswering: way,
      changeWayOfAnswering: (changed: AnswerWay) => way.set(changed),
    } as unknown as PlayerChoices;
    const micCheckDone = signal(false);
    const voiceLost = signal(false);
    const visit = {
      micCheckDone,
      voiceLost,
      finishMicCheck: () => micCheckDone.set(true),
      loseVoice: () => voiceLost.set(true),
    } as unknown as Visit;
    TestBed.configureTestingModule({
      providers: [
        KeptWayOfAnswering,
        { provide: PLAYER_CHOICES, useValue: choices },
        { provide: VISIT, useValue: visit },
        { provide: VOICE_ANSWER, useValue: { available } },
      ],
    });
    return { way: TestBed.inject(KeptWayOfAnswering), kept: way };
  }

  it('answers by voice, after Mic Check, when the browser can listen and nothing was chosen', () => {
    const { way } = wayWith(true);
    expect(way.way()).toBe('voice');
    expect(way.voiceOffered()).toBe(true);
    expect(way.micCheckNeeded()).toBe(true);
  });

  it('uses the pad, skips Mic Check and offers no voice where the browser cannot listen', () => {
    const { way } = wayWith(false, 'voice');
    expect(way.kept()).toBe('numberPad');
    expect(way.way()).toBe('numberPad');
    expect(way.voiceOffered()).toBe(false);
    expect(way.micCheckNeeded()).toBe(false);
  });

  it('skips Mic Check when the number pad is kept (L2-012 criterion 13)', () => {
    const { way } = wayWith(true, 'numberPad');
    expect(way.way()).toBe('numberPad');
    expect(way.voiceOffered()).toBe(true);
    expect(way.micCheckNeeded()).toBe(false);
  });

  const outcomes: [MicCheckOutcome, AnswerWay, AnswerWay, boolean][] = [
    ['heard', 'voice', 'voice', true],
    ['numberPad', 'numberPad', 'numberPad', true],
    ['refused', 'voice', 'numberPad', false],
    ['failed', 'voice', 'numberPad', false],
  ];
  for (const [outcome, kept, inUse, offered] of outcomes) {
    it(`after Mic Check ends "${outcome}", keeps ${kept} and plays with ${inUse}`, () => {
      const { way, kept: stored } = wayWith(true);
      way.finishMicCheck(outcome);
      expect(stored()).toBe(kept);
      expect(way.way()).toBe(inUse);
      expect(way.voiceOffered()).toBe(offered);
      // Mic Check is not shown again in the visit (L2-012 criterion 6).
      expect(way.micCheckNeeded()).toBe(false);
    });
  }

  it('keeps the way the child switches to', () => {
    const { way, kept } = wayWith(true);
    way.use('numberPad');
    expect(kept()).toBe('numberPad');
    way.use('voice');
    expect(kept()).toBe('voice');
  });

  it('never keeps voice where the browser cannot listen', () => {
    const { way, kept } = wayWith(false, 'numberPad');
    way.use('voice');
    expect(kept()).toBe('numberPad');
  });

  it('plays with the pad for the rest of the visit once the mic is refused (L2-011 6)', () => {
    const { way, kept } = wayWith(true);
    way.loseVoice();
    expect(way.way()).toBe('numberPad');
    expect(way.voiceOffered()).toBe(false);
    expect(kept()).toBe('voice');
  });
});
