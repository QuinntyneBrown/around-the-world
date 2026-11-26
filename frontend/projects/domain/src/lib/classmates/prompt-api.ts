/**
 * The part of Chrome's built-in Prompt API (`LanguageModel`) the classmates use
 * (docs/adr/0030-classmates-with-the-on-device-model.md). Only `classmates/` reads it.
 */
export interface PromptApiSession {
  prompt(
    input: string,
    options?: { readonly responseConstraint?: object; readonly signal?: AbortSignal },
  ): Promise<string>;
  clone(options?: { readonly signal?: AbortSignal }): Promise<PromptApiSession>;
  destroy(): void;
}

export interface PromptApiMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface PromptApiOptions {
  readonly expectedInputs?: readonly { type: 'text'; languages: readonly string[] }[];
  readonly expectedOutputs?: readonly { type: 'text'; languages: readonly string[] }[];
  readonly initialPrompts?: readonly PromptApiMessage[];
}

export interface PromptApi {
  availability(options?: PromptApiOptions): Promise<string>;
  create(options?: PromptApiOptions): Promise<PromptApiSession>;
}

/** The browser's Prompt API, or null when the browser has none. */
export function promptApi(): PromptApi | null {
  const api = (globalThis as { LanguageModel?: Partial<PromptApi> }).LanguageModel;
  return typeof api?.availability === 'function' && typeof api.create === 'function'
    ? (api as PromptApi)
    : null;
}
