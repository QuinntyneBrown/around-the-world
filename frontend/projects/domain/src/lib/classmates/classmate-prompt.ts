import { type ClassmateModelProfile, type FlashCard, type MathsKind } from '@atw/api';
import { MAX_AFTER_MS } from './model-decision';
import { FLOOR_MS } from './class-pace';

const SIGNS: Record<MathsKind, string> = { times: '×', plus: '+', minus: '−', divide: '÷' };
/** How a characteristic is written for the model. */
const WORDS: Record<string, string> = { quickToGuess: 'quick to guess' };

/**
 * Builds the two texts the on-device model is given (L2-042 criterion 3, ADR 0030): the priming
 * text holds the classmate's profile only, and the card text the flash card only. Neither holds
 * anything of the child: no nickname, no voice, nothing they said and none of their answers.
 */
export const ClassmatePrompt = {
  priming(profile: ClassmateModelProfile): string {
    const characteristics = profile.characteristics.map((trait) => WORDS[trait] ?? trait);
    return [
      "You are a classmate in a children's maths flash-card game.",
      `Skill level: ${profile.skill} of 5.`,
      `Characteristics: ${characteristics.join(', ')}.`,
      `Preferred maths: ${profile.preferredMaths.join(', ')}.`,
      'A higher skill answers correctly more often and sooner; preferred maths is easier.',
      'For each flash card, reply with JSON only: "answer", the whole number you would say',
      '(sometimes wrong, as a child of your skill would be), and "afterMs", how many',
      `milliseconds you take to say it (between ${FLOOR_MS} and ${MAX_AFTER_MS}).`,
    ].join(' ');
  },

  card(card: FlashCard): string {
    return `${card.left} ${SIGNS[card.kind]} ${card.right} = ?`;
  },
};
