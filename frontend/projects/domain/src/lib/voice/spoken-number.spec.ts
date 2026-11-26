import { spokenNumber } from './spoken-number';

/** One case for each row of the spoken forms of docs/adr/0025-answering-by-voice.md. */
describe('spokenNumber', () => {
  const reads: [string, number][] = [
    ['24', 24],
    ['0', 0],
    ['999', 999],
    ['24.', 24],
    ['twenty-four', 24],
    ['twenty four', 24],
    ['Twenty-Four!', 24],
    ['seven', 7],
    ['twelve', 12],
    ['ninety', 90],
    ['zero', 0],
    ['nought', 0],
    ['oh', 0],
    ['a hundred', 100],
    ['one hundred', 100],
    ['a hundred and five', 105],
    ['one hundred five', 105],
    ['one hundred and forty-four', 144],
    ['nine hundred and ninety-nine', 999],
    ['won', 1],
    ['to', 2],
    ['too', 2],
    ['for', 4],
    ['ate', 8],
  ];
  for (const [transcript, value] of reads) {
    it(`reads "${transcript}" as ${value}`, () => {
      expect(spokenNumber(transcript)).toBe(value);
    });
  }

  const ignores = [
    '',
    'Ready!',
    'um, hang on',
    'um, twenty-four',
    'is it 24',
    '1000',
    '1,000',
    'twenty zero',
    'twenty twelve',
    'four twenty',
    'hundred',
    'ten hundred',
    'one hundred and',
    'one hundred zero',
  ];
  for (const transcript of ignores) {
    it(`reads "${transcript}" as no number`, () => {
      expect(spokenNumber(transcript)).toBeNull();
    });
  }
});
