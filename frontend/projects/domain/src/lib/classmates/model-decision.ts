import { type ModelDecision } from '@atw/api';

/** The largest answer a flash card can have, and so a decision (L2-021 criterion 2). */
export const MAX_ANSWER = 999;
/** The longest time a decision may take: a Chill card's 10 seconds (ADR 0030). */
export const MAX_AFTER_MS = 10_000;

/**
 * The JSON Schema every prompt is constrained to: exactly a whole-number `answer` and a
 * whole-number `afterMs` (docs/adr/0030-classmates-with-the-on-device-model.md).
 */
export const DECISION_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: 'integer', minimum: 0, maximum: MAX_ANSWER },
    afterMs: { type: 'integer', minimum: 1, maximum: MAX_AFTER_MS },
  },
  required: ['answer', 'afterMs'],
  additionalProperties: false,
} as const;

const inRange = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

/**
 * Reads the model's output as a decision (L2-021 criterion 2, L2-042 criterion 1): JSON holding
 * exactly a whole-number `answer` from 0 to 999 and a whole-number `afterMs` from 1 to 10,000.
 * Anything else is null. The text is neither kept nor passed on.
 */
export function parseModelDecision(text: string): ModelDecision | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.length !== 2 || keys[0] !== 'afterMs' || keys[1] !== 'answer') return null;
  const { answer, afterMs } = record;
  if (!inRange(answer, 0, MAX_ANSWER) || !inRange(afterMs, 1, MAX_AFTER_MS)) return null;
  return { answer, afterMs };
}
