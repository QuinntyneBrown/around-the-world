/** The words of the numbers under twenty, and the homophones a recognizer gives for some. */
const UNITS: Readonly<Record<string, number>> = {
  zero: 0,
  nought: 0,
  oh: 0,
  one: 1,
  won: 1,
  two: 2,
  to: 2,
  too: 2,
  three: 3,
  four: 4,
  for: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  ate: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Readonly<Record<string, number>> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/** The largest number a spoken answer can be. */
const LARGEST = 999;

/** A number under a hundred from its words: "twenty four", "seven", "ninety". */
function underHundred(words: readonly string[]): number | null {
  if (words.length === 1) return UNITS[words[0]] ?? TENS[words[0]] ?? null;
  if (words.length !== 2) return null;
  const tens = TENS[words[0]];
  const unit = UNITS[words[1]];
  if (tens === undefined || unit === undefined || unit === 0 || unit > 9) return null;
  return tens + unit;
}

/** A number from 0 to 999 from its words, or null. */
function fromWords(words: readonly string[]): number | null {
  const hundred = words.indexOf('hundred');
  if (hundred === -1) return underHundred(words);
  const before = words.slice(0, hundred);
  if (before.length !== 1) return null;
  const count = before[0] === 'a' ? 1 : UNITS[before[0]];
  if (count === undefined || count < 1 || count > 9) return null;
  let after = words.slice(hundred + 1);
  if (after[0] === 'and') after = after.slice(1);
  if (after.length === 0) return words[hundred + 1] === 'and' ? null : count * 100;
  const rest = underHundred(after);
  return rest === null || rest === 0 ? null : count * 100 + rest;
}

/**
 * Reads a whole transcript as a whole number from 0 to 999, or gives null
 * (docs/adr/0025-answering-by-voice.md): digits ("24"), number words ("twenty-four", "a hundred
 * and five") and the homophones of one-word numbers ("for", "ate"). A number among other words
 * gives null, so a guess spoken aloud is never an answer (L2-009 criterion 2).
 */
export function spokenNumber(transcript: string): number | null {
  const text = transcript
    .toLowerCase()
    .replace(/[.,!?;:"“”]/g, ' ')
    .replace(/-/g, ' ')
    .trim();
  if (text === '') return null;
  if (/^\d+$/.test(text)) {
    const value = Number(text);
    return value <= LARGEST ? value : null;
  }
  return fromWords(text.split(/\s+/));
}
