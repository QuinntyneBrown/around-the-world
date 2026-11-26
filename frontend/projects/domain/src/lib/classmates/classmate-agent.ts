import { type ClassmateModelSession, type FlashCard } from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { type RandomSource } from '../questions/random-source';
import { FLOOR_MS } from './class-pace';
import { type Characteristic, type ClassmateProfile } from './classmate-profile';

/** A classmate's answer to a card and when it comes, from the card appearing. */
export interface ClassmateDecision {
  readonly answer: number;
  readonly afterMs: number;
}

/** The chance of a correct answer and the typical time, by skill level 1 to 5 (ADR 0019). */
const CHANCE_BY_SKILL = [0.55, 0.65, 0.75, 0.83, 0.9];
const TIME_BY_SKILL = [4200, 3500, 2900, 2400, 2000];
const PREFERRED_CHANCE = 0.1;
const PREFERRED_TIME = 0.8;

/** How each characteristic changes the chance and the time. */
const CHARACTER: Record<Characteristic, { chance: number; time: number }> = {
  bold: { chance: -0.05, time: 0.85 },
  planner: { chance: 0.05, time: 1.1 },
  sprinter: { chance: -0.1, time: 0.75 },
  accurate: { chance: 0.1, time: 1.15 },
  dreamer: { chance: -0.05, time: 1.25 },
  quickToGuess: { chance: -0.15, time: 0.8 },
  careful: { chance: 0.08, time: 1.2 },
};

/** The steps a fraction is drawn in from the random source. */
const STEPS = 1000;

/**
 * Answers flash cards on behalf of one classmate, from its profile (L2-020,
 * docs/adr/0019-classmate-profiles.md), and, while it holds a model session, from the on-device
 * model too (L2-021, docs/adr/0030). It decides only an answer and when it comes; the duel
 * decides what the answer does.
 */
export class ClassmateAgent {
  /** The classmate's on-device model session, while the tour has one (L2-021, ADR 0030). */
  private session: ClassmateModelSession | null = null;

  constructor(
    readonly profile: ClassmateProfile,
    private readonly random: RandomSource,
  ) {}

  /** Hands the agent its model session, or takes it away with null. */
  useSession(session: ClassmateModelSession | null): void {
    this.session = session;
  }

  /** Whether the agent holds a model session. */
  get hasSession(): boolean {
    return this.session !== null;
  }

  /**
   * The model's decision on the card, held at or above the floor and `notBeforeMs` exactly as a
   * profile's (L2-020 criterion 5); null with no session, or when the model gives none.
   */
  async decideWithModel(
    card: FlashCard,
    signal: AbortSignal,
    notBeforeMs = FLOOR_MS,
  ): Promise<ClassmateDecision | null> {
    const session = this.session;
    if (!session) return null;
    const decision = await session.decide(card, signal);
    if (!decision || signal.aborted) return null;
    return {
      answer: decision.answer,
      afterMs: Math.max(FLOOR_MS, notBeforeMs, decision.afterMs),
    };
  }

  /** The chance this classmate answers the card correctly. */
  chanceOfRight(card: FlashCard): number {
    const { skill, characteristics } = this.profile;
    let chance = CHANCE_BY_SKILL[skill - 1] + (this.prefers(card) ? PREFERRED_CHANCE : 0);
    for (const trait of characteristics) chance += CHARACTER[trait].chance;
    return Math.min(0.97, Math.max(0.3, chance));
  }

  /** The time this classmate typically takes on the card, before the spread. */
  typicalMs(card: FlashCard): number {
    const { skill, characteristics } = this.profile;
    let time = TIME_BY_SKILL[skill - 1] * (this.prefers(card) ? PREFERRED_TIME : 1);
    for (const trait of characteristics) time *= CHARACTER[trait].time;
    return time;
  }

  /** Decides an answer and its time, never sooner than `notBeforeMs` nor the floor. */
  decide(card: FlashCard, notBeforeMs = FLOOR_MS): ClassmateDecision {
    const right = FlashCardMaker.answerOf(card);
    const isRight = this.fraction() < this.chanceOfRight(card);
    const spread = 0.7 + 0.6 * this.fraction();
    const afterMs = Math.max(FLOOR_MS, notBeforeMs, Math.round(this.typicalMs(card) * spread));
    return { answer: isRight ? right : this.wrong(right), afterMs };
  }

  private prefers(card: FlashCard): boolean {
    return this.profile.preferredMaths.includes(card.kind);
  }

  /** A wrong answer: the right one plus or minus 1 to 3, never below 0. */
  private wrong(right: number): number {
    const by = 1 + this.random.below(3);
    return right - by >= 0 && this.random.below(2) === 0 ? right - by : right + by;
  }

  private fraction(): number {
    return this.random.below(STEPS) / STEPS;
  }
}
