import { type VoiceListener } from '@atw/api';
import { type Recognizer, type RecognitionResultEvent } from './speech-recognition';
import { RECOGNITION_LANGUAGE, SpeechVoiceAnswer } from './speech-voice-answer';

/** A recognizer the test drives: it records how it was set up, started and aborted. */
class TestRecognizer implements Recognizer {
  static made: TestRecognizer[] = [];
  lang = '';
  continuous = false;
  interimResults = true;
  maxAlternatives = 5;
  processLocally = false;
  onresult: ((event: RecognitionResultEvent) => void) | null = null;
  onerror: ((event: { readonly error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = 0;
  aborted = 0;

  constructor() {
    TestRecognizer.made.push(this);
  }

  start(): void {
    this.started += 1;
  }

  abort(): void {
    this.aborted += 1;
  }

  hear(transcript: string, isFinal = true): void {
    const result = Object.assign([{ transcript }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }

  fail(error: string): void {
    this.onerror?.({ error });
    this.onend?.();
  }
}

describe('SpeechVoiceAnswer', () => {
  beforeEach(() => (TestRecognizer.made = []));

  function listening() {
    const voice = new SpeechVoiceAnswer(TestRecognizer);
    const heard: number[] = [];
    const told: string[] = [];
    const listener: VoiceListener = {
      heard: (value) => heard.push(value),
      heardSpeech: () => told.push('speech'),
      noSpeech: () => told.push('no speech'),
      failed: ({ code }) => told.push(`failed ${code}`),
    };
    voice.listen(listener);
    voice.start();
    return { voice, heard, told, recognizer: () => TestRecognizer.made.at(-1) as TestRecognizer };
  }

  it('listens on the device, in en-US, for final results only (docs/adr/0025)', () => {
    const { recognizer } = listening();
    expect(recognizer()).toMatchObject({
      lang: RECOGNITION_LANGUAGE,
      processLocally: true,
      continuous: true,
      interimResults: false,
      maxAlternatives: 1,
      started: 1,
    });
  });

  it('tells a spoken number, and only that speech was heard for other words', () => {
    const { heard, told, recognizer } = listening();
    recognizer().hear('twenty-four');
    recognizer().hear('um, hang on');
    recognizer().hear('42', false);
    expect(heard).toEqual([24]);
    expect(told).toEqual(['speech', 'speech']);
  });

  it('tells "no speech" and starts again while still listening', () => {
    const { told, recognizer } = listening();
    const first = recognizer();
    first.fail('no-speech');
    expect(told).toEqual(['no speech']);
    expect(TestRecognizer.made).toHaveLength(2);
    expect(recognizer()).not.toBe(first);
  });

  const failures: [string, string][] = [
    ['not-allowed', 'failed refused'],
    ['service-not-allowed', 'failed refused'],
    ['network', 'failed failed'],
    ['audio-capture', 'failed failed'],
    ['language-not-supported', 'failed failed'],
  ];
  for (const [error, told] of failures) {
    it(`stops for good on "${error}"`, () => {
      const listened = listening();
      listened.recognizer().fail(error);
      expect(listened.told).toEqual([told]);
      expect(TestRecognizer.made).toHaveLength(1);
    });
  }

  it('aborts on stop, ignores what the aborted session says after, and does not start again', () => {
    const { voice, heard, told, recognizer } = listening();
    const first = recognizer();
    voice.stop();
    expect(first.aborted).toBe(1);
    first.hear('7');
    first.fail('aborted');
    expect(heard).toEqual([]);
    expect(told).toEqual([]);
    expect(TestRecognizer.made).toHaveLength(1);
  });

  it('stops telling a listener that stopped listening', () => {
    const voice = new SpeechVoiceAnswer(TestRecognizer);
    const heard: number[] = [];
    const stop = voice.listen({ heard: (value) => heard.push(value) });
    voice.start();
    stop();
    (TestRecognizer.made[0] as TestRecognizer).hear('5');
    expect(heard).toEqual([]);
  });
});
