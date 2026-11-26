import { KID_PROFILES, FURTHER_PROFILES } from './classmate-profile';
import { ClassmatePrompt } from './classmate-prompt';

describe('ClassmatePrompt (L2-042 criterion 3, ADR 0030)', () => {
  it('primes with the profile: skill, characteristics and preferred maths', () => {
    expect(ClassmatePrompt.priming(KID_PROFILES.kenji)).toBe(
      "You are a classmate in a children's maths flash-card game. Skill level: 3 of 5. " +
        'Characteristics: planner. Preferred maths: times, divide. A higher skill answers ' +
        'correctly more often and sooner; preferred maths is easier. For each flash card, ' +
        'reply with JSON only: "answer", the whole number you would say (sometimes wrong, as a ' +
        'child of your skill would be), and "afterMs", how many milliseconds you take to say ' +
        'it (between 800 and 10000).',
    );
  });

  it('writes a characteristic in words', () => {
    expect(ClassmatePrompt.priming(FURTHER_PROFILES[0])).toContain(
      'Characteristics: quick to guess.',
    );
  });

  it('holds no name, not even the kid’s', () => {
    expect(ClassmatePrompt.priming(KID_PROFILES.zuri)).not.toMatch(/zuri/i);
  });

  it.each([
    [{ kind: 'times', left: 7, right: 8 }, '7 × 8 = ?'],
    [{ kind: 'plus', left: 12, right: 9 }, '12 + 9 = ?'],
    [{ kind: 'minus', left: 20, right: 6 }, '20 − 6 = ?'],
    [{ kind: 'divide', left: 56, right: 7 }, '56 ÷ 7 = ?'],
  ] as const)('gives the card %o as %s', (card, text) => {
    expect(ClassmatePrompt.card(card)).toBe(text);
  });
});
