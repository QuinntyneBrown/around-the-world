import {
  CARD_SPEEDS,
  MATHS_KINDS,
  TIMES_TABLES,
  TOUR_LENGTHS,
  type CardSpeed,
  type GameSetup,
  type MathsKind,
  type TourLength,
} from '@atw/api';

/*
 * The part of Game Setup's rules the game needs when it opens, to read the setup kept on the
 * device: the defaults and the check of a setup read back. The rest of the rules, which only
 * Game Setup uses, are in game-setup-rules.ts and load with that screen.
 */

const DEFAULTS: GameSetup = {
  kinds: ['times'],
  tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  tourLength: 12,
  cardSpeed: 'normal',
};

/** Times on, tables 2 to 10, a tour of 12 desks and Normal (L2-016 1, L2-017 1). */
export function defaultSetup(): GameSetup {
  return DEFAULTS;
}

/** The kinds in the order offered, each once. */
export function inKindOrder(kinds: readonly MathsKind[]): MathsKind[] {
  return MATHS_KINDS.filter((kind) => kinds.includes(kind));
}

/** The tables in ascending order, each once. */
export function inTableOrder(tables: readonly number[]): number[] {
  return TIMES_TABLES.filter((table) => tables.includes(table));
}

/** A setup read back from anywhere, when every value is one Game Setup offers; else null. */
export function readSetup(value: unknown): GameSetup | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { kinds, tables, tourLength, cardSpeed } = value as Record<string, unknown>;
  if (!Array.isArray(kinds) || !Array.isArray(tables)) return null;
  if (!kinds.every((kind) => (MATHS_KINDS as readonly unknown[]).includes(kind))) return null;
  if (!tables.every((table) => (TIMES_TABLES as readonly unknown[]).includes(table))) return null;
  if (!(TOUR_LENGTHS as readonly unknown[]).includes(tourLength)) return null;
  if (!(CARD_SPEEDS as readonly unknown[]).includes(cardSpeed)) return null;
  const setup: GameSetup = {
    kinds: inKindOrder(kinds as MathsKind[]),
    tables: inTableOrder(tables as number[]),
    tourLength: tourLength as TourLength,
    cardSpeed: cardSpeed as CardSpeed,
  };
  return setup.kinds.length > 0 && setup.tables.length > 0 ? setup : null;
}
