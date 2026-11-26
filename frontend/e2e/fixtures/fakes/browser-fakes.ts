/**
 * The fakes that run inside the page, installed by the shared fixture before any script of
 * the game runs: a speech recognizer that says what the spec tells it to, a microphone whose
 * permission the spec sets, and an on-device model (Chrome's `LanguageModel`) that answers as
 * the spec tells it to. A use the spec did not set up is recorded as a problem, and the
 * fixture fails the spec with it.
 *
 * This function is serialised into the page, so it must not close over anything.
 */
export type MicrophoneSetting = 'unexpected' | 'granted' | 'denied';

export interface BrowserFakesState {
  problems: string[];
  microphone: MicrophoneSetting;
  speechSupported: boolean;
  modelAvailability: 'unavailable' | 'downloadable' | 'available';
  modelReplies: string[];
  modelSessions: { created: number; destroyed: number };
  say(transcript: string): number;
}

declare global {
  interface Window {
    __atwFakes: BrowserFakesState;
  }
}

export function installBrowserFakes(): void {
  const fakes: BrowserFakesState = {
    problems: [],
    microphone: 'unexpected',
    speechSupported: true,
    modelAvailability: 'unavailable',
    modelReplies: [],
    modelSessions: { created: 0, destroyed: 0 },
    say: () => 0,
  };
  Object.defineProperty(window, '__atwFakes', { value: fakes, configurable: false });

  const notAllowed = () => new DOMException('Permission denied', 'NotAllowedError');

  // ---- Microphone -----------------------------------------------------------------------
  const silentStream = (): MediaStream => {
    try {
      const context = new AudioContext();
      return context.createMediaStreamDestination().stream;
    } catch {
      return new MediaStream();
    }
  };
  const mediaDevices = navigator.mediaDevices ?? ({} as MediaDevices);
  Object.defineProperty(mediaDevices, 'getUserMedia', {
    configurable: true,
    value: async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      if (fakes.microphone === 'unexpected') {
        fakes.problems.push('Unexpected microphone call: getUserMedia');
        throw notAllowed();
      }
      if (fakes.microphone === 'denied') throw notAllowed();
      return constraints?.audio ? silentStream() : new MediaStream();
    },
  });
  if (navigator.permissions) {
    const query = navigator.permissions.query.bind(navigator.permissions);
    Object.defineProperty(navigator.permissions, 'query', {
      configurable: true,
      value: (descriptor: PermissionDescriptor): Promise<PermissionStatus> => {
        if (descriptor.name !== ('microphone' as PermissionName)) return query(descriptor);
        const state: PermissionState =
          fakes.microphone === 'granted'
            ? 'granted'
            : fakes.microphone === 'denied'
              ? 'denied'
              : 'prompt';
        const status = new EventTarget() as PermissionStatus;
        Object.defineProperties(status, {
          state: { value: state },
          name: { value: 'microphone' },
          onchange: { value: null, writable: true },
        });
        return Promise.resolve(status);
      },
    });
  }

  // ---- Speech recognition ---------------------------------------------------------------
  const listening = new Set<FakeSpeechRecognition>();
  class FakeSpeechRecognition extends EventTarget {
    lang = '';
    continuous = false;
    interimResults = false;
    maxAlternatives = 1;
    onstart: ((event: Event) => void) | null = null;
    onaudiostart: ((event: Event) => void) | null = null;
    onresult: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onend: ((event: Event) => void) | null = null;

    private emit(event: Event): void {
      this.dispatchEvent(event);
      const handler = (this as unknown as Record<string, unknown>)[`on${event.type}`];
      if (typeof handler === 'function') handler.call(this, event);
    }

    start(): void {
      if (fakes.microphone !== 'granted') {
        if (fakes.microphone === 'unexpected') {
          fakes.problems.push('Unexpected microphone call: SpeechRecognition.start');
        }
        queueMicrotask(() => {
          this.emit(Object.assign(new Event('error'), { error: 'not-allowed', message: '' }));
          this.emit(new Event('end'));
        });
        return;
      }
      listening.add(this);
      queueMicrotask(() => {
        this.emit(new Event('start'));
        this.emit(new Event('audiostart'));
      });
    }

    stop(): void {
      this.end();
    }

    abort(): void {
      this.end();
    }

    hear(transcript: string): void {
      const alternative = { transcript, confidence: 0.95 };
      const result = Object.assign([alternative], {
        isFinal: true,
        item: (index: number) => [alternative][index],
      });
      const results = Object.assign([result], { item: (index: number) => [result][index] });
      this.emit(Object.assign(new Event('result'), { resultIndex: 0, results }));
      if (!this.continuous) this.end();
    }

    private end(): void {
      if (!listening.delete(this)) return;
      queueMicrotask(() => this.emit(new Event('end')));
    }
  }
  fakes.say = (transcript: string) => {
    const recognizers = [...listening];
    recognizers.forEach((recognizer) => recognizer.hear(transcript));
    return recognizers.length;
  };
  let supported = true;
  const defineRecognizer = () => {
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
      if (supported) {
        Object.defineProperty(window, name, {
          configurable: true,
          writable: true,
          value: FakeSpeechRecognition,
        });
      } else {
        delete (window as unknown as Record<string, unknown>)[name];
      }
    }
  };
  defineRecognizer();
  Object.defineProperty(fakes, 'speechSupported', {
    get: () => supported,
    set: (value: boolean) => {
      supported = value;
      defineRecognizer();
    },
  });

  // ---- On-device model (Chrome's Prompt API) ----------------------------------------------
  class FakeLanguageModelSession {
    private destroyed = false;

    async prompt(): Promise<string> {
      if (this.destroyed) throw new DOMException('The session was destroyed', 'InvalidStateError');
      const reply = fakes.modelReplies.shift();
      if (reply === undefined) {
        fakes.problems.push('The on-device model was asked more often than the spec answered');
        throw new DOMException('No answer set by the spec', 'NotSupportedError');
      }
      return reply;
    }

    destroy(): void {
      if (this.destroyed) return;
      this.destroyed = true;
      fakes.modelSessions.destroyed += 1;
    }
  }
  const FakeLanguageModel = {
    availability: async () => fakes.modelAvailability,
    create: async () => {
      if (fakes.modelAvailability !== 'available') {
        throw new DOMException('The model is not available', 'NotSupportedError');
      }
      fakes.modelSessions.created += 1;
      return new FakeLanguageModelSession();
    },
  };
  Object.defineProperty(window, 'LanguageModel', {
    configurable: true,
    writable: true,
    value: FakeLanguageModel,
  });
}
