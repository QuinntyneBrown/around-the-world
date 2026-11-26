import { type FlashCard } from '@atw/api';
import { KID_PROFILES } from './classmate-profile';
import { OnDeviceClassmateModel, OnDeviceModelSession } from './on-device-model';
import { type PromptApi, type PromptApiOptions, type PromptApiSession } from './prompt-api';

const CARD: FlashCard = { kind: 'times', left: 7, right: 8 };

/** A Prompt API session whose prompts the test answers. */
class FakePromptSession implements PromptApiSession {
  readonly clones: FakePromptSession[] = [];
  readonly prompts: { input: string; options?: object; answer(text: string): void }[] = [];
  reply: string | Error | null = null;
  destroyed = false;

  async clone(): Promise<PromptApiSession> {
    const clone = new FakePromptSession();
    clone.reply = this.reply;
    this.clones.push(clone);
    return clone;
  }

  prompt(input: string, options?: { signal?: AbortSignal }): Promise<string> {
    if (this.reply instanceof Error) return Promise.reject(this.reply);
    if (this.reply !== null) return Promise.resolve(this.reply);
    return new Promise((resolve, reject) => {
      this.prompts.push({ input, options, answer: resolve });
      options?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')));
    });
  }

  destroy(): void {
    this.destroyed = true;
  }
}

describe('OnDeviceModelSession (L2-021, L2-042, ADR 0030)', () => {
  it('prompts a clone with the card only, under the decision schema, and destroys the clone', async () => {
    const primed = new FakePromptSession();
    primed.reply = '{"answer":56,"afterMs":1500}';
    const session = new OnDeviceModelSession(primed);
    const decision = await session.decide(CARD, new AbortController().signal);
    expect(decision).toEqual({ answer: 56, afterMs: 1500 });
    expect(primed.clones).toHaveLength(1);
    expect(primed.clones[0].destroyed).toBe(true);
    expect(primed.destroyed).toBe(false);
  });

  it('sends the card text and the response constraint', async () => {
    const primed = new FakePromptSession();
    const session = new OnDeviceModelSession(primed);
    const deciding = session.decide(CARD, new AbortController().signal);
    await vi.waitFor(() => expect(primed.clones[0]?.prompts).toHaveLength(1));
    const [{ input, options }] = primed.clones[0].prompts;
    expect(input).toBe('7 × 8 = ?');
    expect(options).toMatchObject({
      responseConstraint: { required: ['answer', 'afterMs'], additionalProperties: false },
    });
    primed.clones[0].prompts[0].answer('{"answer":56,"afterMs":900}');
    expect(await deciding).toEqual({ answer: 56, afterMs: 900 });
  });

  it.each([
    ['an output that is not an answer and a time', 'I think 56'],
    ['a failure', new Error('The model failed')],
  ])('gives null for %s', async (_, reply) => {
    const primed = new FakePromptSession();
    primed.reply = reply;
    const session = new OnDeviceModelSession(primed);
    expect(await session.decide(CARD, new AbortController().signal)).toBeNull();
    expect(primed.clones[0].destroyed).toBe(true);
  });

  it('gives null, and destroys the clone, when its signal aborts', async () => {
    const primed = new FakePromptSession();
    const session = new OnDeviceModelSession(primed);
    const controller = new AbortController();
    const deciding = session.decide(CARD, controller.signal);
    await vi.waitFor(() => expect(primed.clones[0]?.prompts).toHaveLength(1));
    controller.abort();
    expect(await deciding).toBeNull();
    expect(primed.clones[0].destroyed).toBe(true);
  });

  it('asks nothing when the signal has already aborted', async () => {
    const primed = new FakePromptSession();
    const controller = new AbortController();
    controller.abort();
    expect(await new OnDeviceModelSession(primed).decide(CARD, controller.signal)).toBeNull();
    expect(primed.clones).toHaveLength(0);
  });

  it('aborts every waiting prompt and destroys the primed session when destroyed', async () => {
    const primed = new FakePromptSession();
    const session = new OnDeviceModelSession(primed);
    const deciding = session.decide(CARD, new AbortController().signal);
    await vi.waitFor(() => expect(primed.clones[0]?.prompts).toHaveLength(1));
    session.destroy();
    expect(await deciding).toBeNull();
    expect(primed.destroyed).toBe(true);
    expect(await session.decide(CARD, new AbortController().signal)).toBeNull();
  });
});

describe('OnDeviceClassmateModel (L2-021 criteria 1, 4 and 5, ADR 0030)', () => {
  function api(availability: string | Error): PromptApi & { created: PromptApiOptions[] } {
    const created: PromptApiOptions[] = [];
    return {
      created,
      availability: () =>
        availability instanceof Error
          ? Promise.reject(availability)
          : Promise.resolve(availability),
      create: (options) => {
        created.push(options ?? {});
        return Promise.resolve(new FakePromptSession());
      },
    };
  }

  it.each([
    ['available', true],
    ['downloadable', false],
    ['downloading', false],
    ['unavailable', false],
  ])('is ready when the model is %s: %s', async (availability, ready) => {
    const prompt = api(availability);
    expect(await new OnDeviceClassmateModel(prompt).isReady()).toBe(ready);
    expect(prompt.created).toHaveLength(0);
  });

  it('is not ready when the browser fails to answer', async () => {
    expect(await new OnDeviceClassmateModel(api(new Error('broken'))).isReady()).toBe(false);
  });

  it('primes a session with the profile as its system prompt', async () => {
    const prompt = api('available');
    await new OnDeviceClassmateModel(prompt).openSession(KID_PROFILES.kenji);
    expect(prompt.created[0].initialPrompts).toEqual([
      { role: 'system', content: expect.stringContaining('Skill level: 3 of 5.') },
    ]);
    expect(prompt.created[0].expectedInputs).toEqual([{ type: 'text', languages: ['en'] }]);
  });
});
