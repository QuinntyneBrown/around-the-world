import { type KidId, type MathsKind } from '@atw/api';

/** A trait that shapes how a classmate answers (docs/adr/0019-classmate-profiles.md). */
export type Characteristic =
  'bold' | 'planner' | 'sprinter' | 'accurate' | 'dreamer' | 'quickToGuess' | 'careful';

/** A skill level, from 1 (lowest) to 5 (highest). */
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

/**
 * One classmate: a skill level, characteristics and preferred kinds of maths (L2-020). A
 * classmate who is one of the five kids has that kid; a further classmate has none.
 */
export interface ClassmateProfile {
  readonly id: string;
  readonly kid: KidId | null;
  readonly skill: SkillLevel;
  readonly characteristics: readonly Characteristic[];
  readonly preferredMaths: readonly MathsKind[];
}

/** The five kids' profiles, which fit each kid (L2-020 criterion 6, ADR 0019). */
export const KID_PROFILES: Record<KidId, Omit<ClassmateProfile, 'id'>> = {
  zuri: { kid: 'zuri', skill: 4, characteristics: ['bold'], preferredMaths: ['times', 'plus'] },
  kenji: {
    kid: 'kenji',
    skill: 3,
    characteristics: ['planner'],
    preferredMaths: ['times', 'divide'],
  },
  nia: { kid: 'nia', skill: 4, characteristics: ['sprinter'], preferredMaths: ['plus', 'minus'] },
  milo: {
    kid: 'milo',
    skill: 5,
    characteristics: ['accurate'],
    preferredMaths: ['times', 'divide'],
  },
  pip: { kid: 'pip', skill: 2, characteristics: ['dreamer'], preferredMaths: ['plus'] },
};

/** The further classmates' profiles, taken in turn (ADR 0019). */
export const FURTHER_PROFILES: readonly Omit<ClassmateProfile, 'id' | 'kid'>[] = [
  { skill: 1, characteristics: ['quickToGuess'], preferredMaths: ['plus'] },
  { skill: 2, characteristics: ['careful'], preferredMaths: ['minus'] },
  { skill: 3, characteristics: ['bold'], preferredMaths: ['times'] },
  { skill: 2, characteristics: ['dreamer'], preferredMaths: ['divide'] },
  { skill: 4, characteristics: ['careful'], preferredMaths: ['times', 'minus'] },
  { skill: 1, characteristics: ['dreamer'], preferredMaths: ['plus', 'minus'] },
  { skill: 3, characteristics: ['quickToGuess'], preferredMaths: ['divide', 'plus'] },
];
