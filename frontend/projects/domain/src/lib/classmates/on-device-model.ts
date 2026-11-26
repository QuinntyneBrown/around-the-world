import {
  type ClassmateModel,
  type ClassmateModelProfile,
  type ClassmateModelSession,
  type FlashCard,
  type ModelDecision,
} from '@atw/api';
import { ClassmatePrompt } from './classmate-prompt';
import { DECISION_SCHEMA, parseModelDecision } from './model-decision';
import { type PromptApi, type PromptApiOptions, type PromptApiSession } from './prompt-api';

/** English text in and out, the same when asking about the model and when creating a session. */
const ENGLISH: PromptApiOptions = {
  expectedInputs: [{ type: 'text', languages: ['en'] }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }],
};

/**
 * One classmate's session over the Prompt API (L2-021, ADR 0030). Each decision prompts a clone
 * of the primed session, destroyed after, so the context never grows over a tour. A failure, a
 * refusal, an abort or an output that is not an answer and a time is null; nothing is thrown.
 */
export class OnDeviceModelSession implements ClassmateModelSession {
  private readonly pending = new Set<AbortController>();
  private destroyed = false;

  constructor(private readonly primed: PromptApiSession) {}

  async decide(card: FlashCard, signal: AbortSignal): Promise<ModelDecision | null> {
    if (this.destroyed || signal.aborted) return null;
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    this.pending.add(controller);
    let clone: PromptApiSession | null = null;
    try {
      clone = await this.primed.clone({ signal: controller.signal });
      if (controller.signal.aborted) return null;
      const text = await clone.prompt(ClassmatePrompt.card(card), {
        responseConstraint: DECISION_SCHEMA,
        signal: controller.signal,
      });
      return controller.signal.aborted ? null : parseModelDecision(text);
    } catch {
      return null;
    } finally {
      clone?.destroy();
      signal.removeEventListener('abort', abort);
      this.pending.delete(controller);
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    for (const controller of this.pending) controller.abort();
    this.pending.clear();
    this.primed.destroy();
  }
}

/**
 * The on-device model over Chrome's Prompt API (L2-021, ADR 0030). It is imported dynamically by
 * `LazyClassmateModel`, so none of it is in the initial bundle.
 */
export class OnDeviceClassmateModel implements ClassmateModel {
  constructor(private readonly api: PromptApi) {}

  /** Ready only when the model is downloaded: a session of one that is not starts a download. */
  async isReady(): Promise<boolean> {
    try {
      return (await this.api.availability(ENGLISH)) === 'available';
    } catch {
      return false;
    }
  }

  async openSession(profile: ClassmateModelProfile): Promise<ClassmateModelSession> {
    const primed = await this.api.create({
      ...ENGLISH,
      initialPrompts: [{ role: 'system', content: ClassmatePrompt.priming(profile) }],
    });
    return new OnDeviceModelSession(primed);
  }
}
