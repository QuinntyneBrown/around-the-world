import { type AnswerWay, type GameSetup, type MathsKind } from '@atw/api';
import { type SummaryRow } from '@atw/components';

const SIGNS: Record<MathsKind, string> = { times: '×', plus: '+', minus: '−', divide: '÷' };

/**
 * The maths of a setup in a few signs (L2-024 criterion 5): "×2 to ×10" for Times alone, the
 * signs of the other kinds before the tables ("× + −, ×2 to ×12"), the tables one by one when
 * they are not a run ("×2, ×5, ×7"), and the signs alone without Times ("+ −").
 */
export function mathsWords(setup: GameSetup): string {
  const tables = setup.kinds.includes('times') ? tableWords(setup.tables) : '';
  if (setup.kinds.length === 1 && tables !== '') return tables;
  const signs = setup.kinds.map((kind) => SIGNS[kind]).join(' ');
  return tables === '' ? signs : `${signs}, ${tables}`;
}

function tableWords(tables: readonly number[]): string {
  if (tables.length === 0) return '';
  const first = tables[0];
  const last = tables[tables.length - 1];
  const isRun = tables.every((table, i) => table === first + i);
  if (tables.length === 1) return `×${first}`;
  return isRun ? `×${first} to ×${last}` : tables.map((table) => `×${table}`).join(', ');
}

/**
 * The Lobby's panel "The game": the maths, the tour length and how this device answers, which
 * is not part of the room's setup ("The number pad" is to confirm, docs/adr/0031).
 */
export function setupRows(setup: GameSetup, way: AnswerWay): SummaryRow[] {
  return [
    { term: 'Maths', value: mathsWords(setup) },
    { term: 'Tour', value: `${setup.tourLength} desks` },
    { term: 'Answer by', value: way === 'voice' ? 'Shouting it!' : 'The number pad' },
  ];
}
