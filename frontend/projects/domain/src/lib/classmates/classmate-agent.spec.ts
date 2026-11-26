import { type FlashCard, type MathsKind } from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { fixedRandom, mathRandom, type RandomSource } from '../questions/random-source';
import { ClassPace, CATCH_UP_MS, FLOOR_MS } from './class-pace';
import { ClassmateAgent } from './classmate-agent';
import { KID_PROFILES, type ClassmateProfile, type SkillLevel } from './classmate-profile';

const TIMES: FlashCard = { kind: 'times', left: 6, right: 4 };

function profile(skill: SkillLevel, preferredMaths: MathsKind[] = []): ClassmateProfile {
  return { id: `skill-${skill}`, kid: null, skill, characteristics: [], preferredMaths };
}

/** Answers 100 cards of a kind and counts the right answers and the mean time. */
function play(agent: ClassmateAgent, kind: MathsKind) {
  const maker = new FlashCardMaker(
    { kinds: [kind], tables: [2, 3, 4, 5, 6, 7, 8, 9, 10], tourLength: 12, cardSpeed: 'normal' },
    mathRandom,
  );
  let right = 0;
  let time = 0;
  for (let card = 0; card < 100; card++) {
    const flashCard = maker.next();
    const decision = agent.decide(flashCard);
    if (decision.answer === FlashCardMaker.answerOf(flashCard)) right++;
    time += decision.afterMs;
  }
  return { right, meanMs: time / 100 };
}

/** A random source whose fractions are spread evenly, so 100 cards are a fair sample. */
function evenly(): RandomSource {
  let step = 0;
  return { below: (limit) => Math.floor(((step++ * 0.618034) % 1) * limit) };
}

describe('ClassmateAgent (L2-020, docs/adr/0019)', () => {
  it('answers correctly more often and sooner at the highest skill than the lowest (criterion 2)', () => {
    const highest = play(new ClassmateAgent(profile(5), evenly()), 'times');
    const lowest = play(new ClassmateAgent(profile(1), evenly()), 'times');
    expect(highest.right).toBeGreaterThan(lowest.right);
    expect(highest.meanMs).toBeLessThan(lowest.meanMs);
  });

  it('answers a kind it prefers correctly more often and sooner (criterion 3)', () => {
    const agent = new ClassmateAgent(profile(3, ['times']), evenly());
    const times = play(agent, 'times');
    const divide = play(new ClassmateAgent(profile(3, ['times']), evenly()), 'divide');
    expect(times.right).toBeGreaterThan(divide.right);
    expect(times.meanMs).toBeLessThan(divide.meanMs);
  });

  it('never answers sooner than the floor of 800 ms (criterion 5)', () => {
    const fastest: ClassmateProfile = { ...profile(5, ['times']), characteristics: ['sprinter'] };
    const agent = new ClassmateAgent(fastest, fixedRandom(0));
    expect(agent.decide(TIMES).afterMs).toBeGreaterThanOrEqual(FLOOR_MS);
  });

  it('answers no sooner than it is told, as after two lost duels (criterion 5)', () => {
    const agent = new ClassmateAgent(profile(5), fixedRandom(0));
    expect(agent.decide(TIMES, ClassPace.notBeforeMs(2)).afterMs).toBeGreaterThanOrEqual(
      CATCH_UP_MS,
    );
  });

  it('gives a right answer at its fastest when the source gives 0', () => {
    const decision = new ClassmateAgent(profile(3), fixedRandom(0)).decide(TIMES);
    expect(decision).toEqual({ answer: 24, afterMs: Math.round(2900 * 0.7) });
  });

  it('gives a wrong answer near the right one at its slowest when the source gives the most', () => {
    const decision = new ClassmateAgent(profile(3), fixedRandom(999)).decide(TIMES);
    expect(decision.answer).not.toBe(24);
    expect(Math.abs(decision.answer - 24)).toBeLessThanOrEqual(3);
    expect(decision.afterMs).toBe(Math.round(2900 * (0.7 + 0.6 * 0.999)));
  });

  it('never gives a wrong answer below 0', () => {
    const agent = new ClassmateAgent(profile(1), fixedRandom(999, 999, 0, 0));
    const zero: FlashCard = { kind: 'minus', left: 12, right: 12 };
    for (let card = 0; card < 20; card++)
      expect(agent.decide(zero).answer).toBeGreaterThanOrEqual(0);
  });
});

describe('ClassPace (L2-020 criterion 5)', () => {
  it.each([
    [0, FLOOR_MS],
    [1, FLOOR_MS],
    [2, CATCH_UP_MS],
    [5, CATCH_UP_MS],
  ])('after %i duels lost in a row, a classmate answers no sooner than %i ms', (lost, ms) => {
    expect(ClassPace.notBeforeMs(lost)).toBe(ms);
  });
});

describe('ClassmateAgent with a model session (L2-021, ADR 0030)', () => {
  const card: FlashCard = { kind: 'times', left: 7, right: 8 };
  const profile: ClassmateProfile = { id: 'kenji', ...KID_PROFILES.kenji };

  function agentDeciding(decision: { answer: number; afterMs: number } | null): ClassmateAgent {
    const agent = new ClassmateAgent(profile, mathRandom);
    agent.useSession({ decide: () => Promise.resolve(decision), destroy: () => undefined });
    return agent;
  }

  it('has no model decision without a session', async () => {
    const agent = new ClassmateAgent(profile, mathRandom);
    expect(agent.hasSession).toBe(false);
    expect(await agent.decideWithModel(card, new AbortController().signal)).toBeNull();
  });

  it('takes the model’s answer and time', async () => {
    const agent = agentDeciding({ answer: 54, afterMs: 1500 });
    expect(agent.hasSession).toBe(true);
    expect(await agent.decideWithModel(card, new AbortController().signal)).toEqual({
      answer: 54,
      afterMs: 1500,
    });
  });

  it.each([
    [100, FLOOR_MS, FLOOR_MS],
    [1500, CATCH_UP_MS, CATCH_UP_MS],
    [2500, CATCH_UP_MS, 2500],
  ])('holds a time of %i ms at or above %i ms (L2-020 5)', async (afterMs, notBefore, held) => {
    const agent = agentDeciding({ answer: 56, afterMs });
    const decision = await agent.decideWithModel(card, new AbortController().signal, notBefore);
    expect(decision?.afterMs).toBe(held);
  });

  it('has none when the model gives none, or the signal aborted', async () => {
    expect(
      await agentDeciding(null).decideWithModel(card, new AbortController().signal),
    ).toBeNull();
    const controller = new AbortController();
    controller.abort();
    const agent = agentDeciding({ answer: 56, afterMs: 1500 });
    expect(await agent.decideWithModel(card, controller.signal)).toBeNull();
  });

  it('loses its session when it is taken away', () => {
    const agent = agentDeciding(null);
    agent.useSession(null);
    expect(agent.hasSession).toBe(false);
  });
});
