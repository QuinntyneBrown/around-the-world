/**
 * The fakes that run inside the page, installed by the shared fixture before any script of
 * the game runs: a speech recognizer that says what the spec tells it to, a microphone whose
 * permission the spec sets, and an on-device model (Chrome's `LanguageModel`) that answers as
 * the spec tells it to. WebGL is Chromium's own (SwiftShader when there is no GPU): the fakes
 * only count the contexts the game opens, and take WebGL away when the spec asks. Sound is
 * never heard: each sound the game plays is recorded by its file's name, and the audio
 * elements the game makes are counted until it lets them go. The clipboard keeps what the game
 * copied, or refuses to copy when the spec asks. A use the
 * spec did not set up is recorded as a problem, and the fixture fails the spec with it.
 *
 * This function is serialised into the page, so it must not close over anything.
 */
export type MicrophoneSetting = 'unexpected' | 'asking' | 'granted' | 'denied';
export type ModelAvailability = 'missing' | 'unavailable' | 'downloadable' | 'available';

export interface BrowserFakesState {
  problems: string[];
  microphone: MicrophoneSetting;
  speechSupported: boolean;
  /** What `LanguageModel.availability()` answers; `missing` takes `LanguageModel` away. */
  modelAvailability: ModelAvailability;
  /** What a prompt does once the replies set by the spec run out. */
  modelWhenNoReply: 'problem' | 'hold' | 'fail';
  modelReplies: string[];
  /** The primed sessions the game created and destroyed (clones are not counted here). */
  modelSessions: { created: number; destroyed: number };
  /** Every text the game gave the model: each session's system prompt and each prompt. */
  modelAsked: string[];
  /** How many prompts the game aborted while they waited. */
  modelAborted: number;
  /** Answers the oldest waiting prompt with the text; resolves to how many it answered. */
  modelReply(text: string): number;
  /** How many prompts are waiting for `modelReply`. */
  modelWaiting(): number;
  /** How many sessions and clones the game created and has not destroyed. */
  modelOpen(): number;
  say(transcript: string): number;
  /** The recognizers listening report that they heard no speech, and end. */
  silence(): number;
  /** The recognizers listening fail with the browser's error, and end. */
  fail(error: string): number;
  /** How many recognizers are listening. */
  listening(): number;
  /** How many microphone tracks the game opened and has not stopped. */
  openTracks(): number;
  /** Whether the browser gives a WebGL context; false draws no 3D classroom. */
  webglSupported: boolean;
  /** How many WebGL contexts the game opened that are not lost. */
  openContexts(): number;
  /** The sounds the game played, in order, by their file's name: `pop`, `chime`, `jingle`. */
  played: string[];
  /** How many audio elements the game made that still hold a source. */
  openSounds(): number;
  /** Whether a copy to the clipboard works; false refuses it, as a locked-down browser does. */
  clipboardWorks: boolean;
  /** What the game copied to the clipboard, in order. */
  copied: string[];
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
    modelWhenNoReply: 'problem',
    modelReplies: [],
    modelSessions: { created: 0, destroyed: 0 },
    modelAsked: [],
    modelAborted: 0,
    modelReply: () => 0,
    modelWaiting: () => 0,
    modelOpen: () => 0,
    say: () => 0,
    silence: () => 0,
    fail: () => 0,
    listening: () => 0,
    openTracks: () => 0,
    webglSupported: true,
    openContexts: () => 0,
    played: [],
    openSounds: () => 0,
    clipboardWorks: true,
    copied: [],
  };
  Object.defineProperty(window, '__atwFakes', { value: fakes, configurable: false });

  // The browser's question about the microphone, open while the setting is 'asking': it is
  // answered when the spec grants or denies.
  let microphoneSetting: MicrophoneSetting = 'unexpected';
  const asking: (() => void)[] = [];
  Object.defineProperty(fakes, 'microphone', {
    get: () => microphoneSetting,
    set: (value: MicrophoneSetting) => {
      microphoneSetting = value;
      if (value !== 'asking') asking.splice(0).forEach((answer) => answer());
    },
  });

  const notAllowed = () => new DOMException('Permission denied', 'NotAllowedError');

  // ---- Clipboard ------------------------------------------------------------------------
  // CDK Clipboard copies the text of a hidden textarea it selects with execCommand('copy').
  // The fake keeps that text instead of reaching the system's clipboard.
  const execCommand = document.execCommand.bind(document);
  document.execCommand = (command: string, showUi?: boolean, value?: string): boolean => {
    if (command !== 'copy') return execCommand(command, showUi, value);
    if (!fakes.clipboardWorks) return false;
    const focused = document.activeElement;
    const text =
      focused instanceof HTMLTextAreaElement
        ? focused.value
        : ([...document.querySelectorAll('textarea')].pop()?.value ?? '');
    fakes.copied.push(text);
    return true;
  };

  // ---- Microphone -----------------------------------------------------------------------
  const opened: MediaStreamTrack[] = [];
  const silentStream = (): MediaStream => {
    let stream: MediaStream;
    try {
      const context = new AudioContext();
      stream = context.createMediaStreamDestination().stream;
    } catch {
      stream = new MediaStream();
    }
    opened.push(...stream.getAudioTracks());
    return stream;
  };
  fakes.openTracks = () => opened.filter((track) => track.readyState === 'live').length;
  const mediaDevices = navigator.mediaDevices ?? ({} as MediaDevices);
  Object.defineProperty(mediaDevices, 'getUserMedia', {
    configurable: true,
    value: async (constraints?: MediaStreamConstraints): Promise<MediaStream> => {
      if (fakes.microphone === 'unexpected') {
        fakes.problems.push('Unexpected microphone call: getUserMedia');
        throw notAllowed();
      }
      if (fakes.microphone === 'asking') {
        await new Promise<void>((answer) => asking.push(answer));
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

    /** Reports an error the browser gives, then ends, as Chrome's recognizer does. */
    report(error: string): void {
      this.emit(Object.assign(new Event('error'), { error, message: '' }));
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
  fakes.silence = () => {
    const recognizers = [...listening];
    recognizers.forEach((recognizer) => recognizer.report('no-speech'));
    return recognizers.length;
  };
  fakes.fail = (error: string) => {
    const recognizers = [...listening];
    recognizers.forEach((recognizer) => recognizer.report(error));
    return recognizers.length;
  };
  fakes.listening = () => listening.size;
  // processLocally is a property of the recognizer's prototype in Chrome.
  Object.defineProperty(FakeSpeechRecognition.prototype, 'processLocally', {
    configurable: true,
    writable: true,
    value: false,
  });
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
  // Sessions and their clones answer a prompt with the next reply the spec set; when none is
  // left, the prompt waits for `modelReply`, fails, or is a problem, as the spec chose. A prompt
  // given an abort signal rejects when it is aborted, as Chrome's does.
  const openModel = new Set<FakeLanguageModelSession>();
  const waitingPrompts: { answer: (text: string) => void }[] = [];
  const destroyedError = () => new DOMException('The session was destroyed', 'InvalidStateError');
  class FakeLanguageModelSession {
    private destroyed = false;

    constructor(private readonly primed: boolean) {
      openModel.add(this);
      if (primed) fakes.modelSessions.created += 1;
    }

    async clone(options?: { signal?: AbortSignal }): Promise<FakeLanguageModelSession> {
      if (this.destroyed) throw destroyedError();
      options?.signal?.throwIfAborted();
      return new FakeLanguageModelSession(false);
    }

    prompt(input: unknown, options?: { signal?: AbortSignal }): Promise<string> {
      if (this.destroyed) return Promise.reject(destroyedError());
      const signal = options?.signal;
      if (signal?.aborted) return Promise.reject(signal.reason);
      fakes.modelAsked.push(String(input));
      const reply = fakes.modelReplies.shift();
      if (reply !== undefined) return Promise.resolve(reply);
      if (fakes.modelWhenNoReply === 'fail') {
        return Promise.reject(new DOMException('The model failed', 'UnknownError'));
      }
      if (fakes.modelWhenNoReply === 'problem') {
        fakes.problems.push('The on-device model was asked more often than the spec answered');
        return Promise.reject(new DOMException('No answer set by the spec', 'NotSupportedError'));
      }
      return new Promise<string>((resolve, reject) => {
        const entry = {
          answer: (text: string) => {
            signal?.removeEventListener('abort', onAbort);
            resolve(text);
          },
        };
        const onAbort = () => {
          const at = waitingPrompts.indexOf(entry);
          if (at >= 0) waitingPrompts.splice(at, 1);
          fakes.modelAborted += 1;
          reject(signal?.reason);
        };
        signal?.addEventListener('abort', onAbort, { once: true });
        waitingPrompts.push(entry);
      });
    }

    destroy(): void {
      if (this.destroyed) return;
      this.destroyed = true;
      openModel.delete(this);
      if (this.primed) fakes.modelSessions.destroyed += 1;
    }
  }
  const FakeLanguageModel = {
    availability: async () => fakes.modelAvailability,
    create: async (options?: { initialPrompts?: { content: string }[] }) => {
      if (fakes.modelAvailability !== 'available') {
        // In Chrome, creating a session of a model not downloaded starts its download.
        fakes.problems.push('The game started a download of the on-device model');
        throw new DOMException('The model is not available', 'NotSupportedError');
      }
      for (const message of options?.initialPrompts ?? []) fakes.modelAsked.push(message.content);
      return new FakeLanguageModelSession(true);
    },
  };
  fakes.modelReply = (text: string) => {
    const entry = waitingPrompts.shift();
    entry?.answer(text);
    return entry ? 1 : 0;
  };
  fakes.modelWaiting = () => waitingPrompts.length;
  fakes.modelOpen = () => openModel.size;
  let availability: ModelAvailability = 'unavailable';
  const defineModel = () => {
    if (availability === 'missing') {
      delete (window as unknown as Record<string, unknown>)['LanguageModel'];
      return;
    }
    Object.defineProperty(window, 'LanguageModel', {
      configurable: true,
      writable: true,
      value: FakeLanguageModel,
    });
  };
  defineModel();
  Object.defineProperty(fakes, 'modelAvailability', {
    get: () => availability,
    set: (value: ModelAvailability) => {
      availability = value;
      defineModel();
    },
  });

  // ---- WebGL ------------------------------------------------------------------------------
  // A context the game has released (lost) is let go here too, so the count never holds a
  // released canvas, and the page it was on, in memory (docs/adr/0038).
  let contexts: WebGLRenderingContext[] = [];
  const open = () => (contexts = contexts.filter((context) => !context.isContextLost()));
  const getContext = HTMLCanvasElement.prototype.getContext;
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    writable: true,
    value: function (this: HTMLCanvasElement, kind: string, options?: unknown) {
      const webgl = kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl';
      if (webgl && !fakes.webglSupported) return null;
      const context = getContext.call(this, kind, options);
      if (webgl && context && !open().includes(context as WebGLRenderingContext)) {
        contexts.push(context as WebGLRenderingContext);
      }
      return context;
    },
  });
  fakes.openContexts = () => open().length;

  // ---- Sound ------------------------------------------------------------------------------
  // A sound "plays" by being recorded; the browser never makes a noise or asks for a touch.
  // An audio element the game has let go (no source) is let go here too.
  let audios: HTMLAudioElement[] = [];
  const holding = () => (audios = audios.filter((audio) => audio.getAttribute('src')));
  const NativeAudio = window.Audio;
  class CountedAudio extends NativeAudio {
    constructor(src?: string) {
      super(src);
      holding().push(this);
    }
  }
  Object.defineProperty(window, 'Audio', {
    configurable: true,
    writable: true,
    value: CountedAudio,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: function (this: HTMLMediaElement) {
      const file = (this.getAttribute('src') ?? '').split('/').pop() ?? '';
      fakes.played.push(file.replace(/\.[a-z0-9]+$/, ''));
      return Promise.resolve();
    },
  });
  fakes.openSounds = () => holding().length;
}
