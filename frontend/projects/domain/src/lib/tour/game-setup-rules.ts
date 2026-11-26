import {
  TIMES_TABLES,
  type CardSpeed,
  type GameSetup,
  type MathsKind,
  type TourLength,
} from '@atw/api';
import { defaultSetup, inKindOrder, inTableOrder, readSetup } from './game-setup';

/** A choice applied to a setup, and whether it was refused because it was the last one on. */
export interface SetupChange {
  readonly setup: GameSetup;
  readonly refused: 'last-kind' | 'last-table' | null;
}

/** A tour's name and about how long it takes (L2-017 criterion 2). */
export interface TourDescription {
  readonly name: string;
  readonly minutes: number;
}

const EASY_TABLES = [2, 3, 4, 5, 10];

const TOURS: Record<TourLength, TourDescription> = {
  6: { name: 'Quick hop', minutes: 2 },
  12: { name: 'Round the world', minutes: 5 },
  24: { name: 'Grand tour', minutes: 10 },
};

const SECONDS_PER_CARD: Record<CardSpeed, number> = { chill: 10, normal: 6, lightning: 3 };

function tablesEnabled(setup: GameSetup): boolean {
  return setup.kinds.includes('times');
}

function toggleKind(setup: GameSetup, kind: MathsKind): SetupChange {
  if (!setup.kinds.includes(kind)) {
    return { setup: { ...setup, kinds: inKindOrder([...setup.kinds, kind]) }, refused: null };
  }
  if (setup.kinds.length === 1) return { setup, refused: 'last-kind' };
  // The tables stay as they are, so they are on again when Times is (L2-016 criterion 6).
  return { setup: { ...setup, kinds: setup.kinds.filter((on) => on !== kind) }, refused: null };
}

function toggleTable(setup: GameSetup, table: number): SetupChange {
  const offered = (TIMES_TABLES as readonly number[]).includes(table);
  if (!offered || !tablesEnabled(setup)) return { setup, refused: null };
  if (!setup.tables.includes(table)) {
    return { setup: { ...setup, tables: inTableOrder([...setup.tables, table]) }, refused: null };
  }
  if (setup.tables.length === 1) return { setup, refused: 'last-table' };
  return { setup: { ...setup, tables: setup.tables.filter((on) => on !== table) }, refused: null };
}

function withTables(setup: GameSetup, tables: readonly number[]): GameSetup {
  return tablesEnabled(setup) ? { ...setup, tables: [...tables] } : setup;
}

/**
 * Every rule of Game Setup (docs/detailed-designs/player/set-up-game/,
 * docs/adr/0017-game-setup-rules-and-states.md): the defaults, the last kind of maths and the
 * last times table that stay on, Easy and All, the tables while Times is off, the tour's name
 * and the seconds per card. Pure functions: a setup in, a new setup out.
 */
export const GameSetupRules = {
  /** Times on, tables 2 to 10, a tour of 12 desks and Normal (L2-016 1, L2-017 1). */
  defaults: defaultSetup,
  /** Turns a kind of maths on or off; the last kind on stays on (L2-016 criteria 2 and 3). */
  toggleKind,
  /** Turns a table on or off; the last stays on, and none changes while Times is off. */
  toggleTable,
  /** Tables 2, 3, 4, 5 and 10 only; nothing while Times is off (L2-016 criterion 4). */
  easy: (setup: GameSetup): GameSetup => withTables(setup, EASY_TABLES),
  /** Tables 2 to 12; nothing while Times is off (L2-016 criterion 4). */
  all: (setup: GameSetup): GameSetup => withTables(setup, TIMES_TABLES),
  /** Whether the times tables can be changed: only while Times is on (L2-016 criterion 5). */
  tablesEnabled,
  /** The tables flash cards may use: none while Times is off (L2-016 criterion 5). */
  tablesInPlay: (setup: GameSetup): readonly number[] => (tablesEnabled(setup) ? setup.tables : []),
  chooseTourLength: (setup: GameSetup, tourLength: TourLength): GameSetup => ({
    ...setup,
    tourLength,
  }),
  chooseCardSpeed: (setup: GameSetup, cardSpeed: CardSpeed): GameSetup => ({
    ...setup,
    cardSpeed,
  }),
  /** The tour's name and about how long it takes (L2-017 criterion 2). */
  describeTour: (length: TourLength): TourDescription => TOURS[length],
  /** The time allowed to answer a flash card (L2-017 criterion 3). */
  secondsPerCard: (speed: CardSpeed): number => SECONDS_PER_CARD[speed],
  /** A setup read back from anywhere, when every value is one Game Setup offers; else null. */
  read: readSetup,
  /** Whether two setups hold the same choices. */
  same: (one: GameSetup, other: GameSetup): boolean =>
    one.tourLength === other.tourLength &&
    one.cardSpeed === other.cardSpeed &&
    one.kinds.join() === other.kinds.join() &&
    one.tables.join() === other.tables.join(),
} as const;
