import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CLASSMATE_MODEL,
  PLAYER_CHOICES,
  type ClassmateModel,
  type ClassmateModelProfile,
  type ClassmateModelSession,
  type FlashCard,
  type GameSetup,
  type KidId,
  type ModelDecision,
  type PlayerChoices,
} from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { MESSAGE_MS, RIGHT_MS, SoloGame, STAMP_MS, TICK_MS } from './solo-game';

const SETUP: GameSetup = { kinds: ['times'], tables: [7], tourLength: 6, cardSpeed: 'normal' };
/** When Kenji's profile answers right with `Math.random` at 0 (ADR 0019). */
const KENJI_PROFILE_MS = 1786;

/** A session whose decisions the test gives, one prompt at a time. */
class FakeSession implements ClassmateModelSession {
  readonly asked: { card: FlashCard; signal: AbortSignal; give(d: ModelDecision | null): void }[] =
    [];
  destroyed = false;

  constructor(readonly profile: ClassmateModelProfile) {}

  decide(card: FlashCard, signal: AbortSignal): Promise<ModelDecision | null> {
    return new Promise((resolve) => {
      this.asked.push({ card, signal, give: resolve });
      signal.addEventListener('abort', () => resolve(null));
    });
  }

  destroy(): void {
    this.destroyed = true;
  }
}

class FakeModel implements ClassmateModel {
  ready = true;
  /** The number of sessions opened before one fails; Infinity never fails. */
  opensBeforeFailing = Infinity;
  readonly sessions: FakeSession[] = [];
  readyAsked = 0;

  isReady(): Promise<boolean> {
    this.readyAsked++;
    return Promise.resolve(this.ready);
  }

  openSession(profile: ClassmateModelProfile): Promise<ClassmateModelSession> {
    if (this.sessions.length >= this.opensBeforeFailing) {
      return Promise.reject(new Error('Not enough memory'));
    }
    const session = new FakeSession(profile);
    this.sessions.push(session);
    return Promise.resolve(session);
  }
}

describe('SoloGame with the on-device model (L2-021, ADR 0030)', () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.parse('2026-01-05T09:00:00Z') }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function soloGame(model: FakeModel, kid: KidId = 'zuri'): SoloGame {
    const choices = { kid: signal<KidId | null>(kid) } as unknown as PlayerChoices;
    TestBed.configureTestingModule({
      providers: [
        SoloGame,
        { provide: PLAYER_CHOICES, useValue: choices },
        { provide: CLASSMATE_MODEL, useValue: model },
      ],
    });
    return TestBed.inject(SoloGame);
  }

  /** Starts a game and lets the agents and the sessions arrive. */
  async function started(model: FakeModel): Promise<SoloGame> {
    const game = soloGame(model);
    game.start(SETUP);
    await vi.dynamicImportSettled();
    await settled();
    return game;
  }

  /** Lets every promise waiting settle, without moving the clock. */
  async function settled(): Promise<void> {
    await vi.advanceTimersByTimeAsync(0);
  }

  function answerOf(game: SoloGame): number {
    const duel = game.duel();
    if (!duel) throw new Error('No duel');
    return FlashCardMaker.answerOf(duel.card);
  }

  /** Kenji, the desk holder of the first duel, is the first session. */
  const kenji = (model: FakeModel) => model.sessions[0];

  it('deals the first card before asking about the model (L2-021 criteria 3 and 4)', () => {
    const model = new FakeModel();
    const game = soloGame(model);
    game.start(SETUP);
    expect(game.duel()).toMatchObject({ desk: 2, outcome: 'open' });
    expect(model.sessions).toHaveLength(0);
  });

  it('opens one session for each classmate, in desk order, primed with its profile (L2-021 1)', async () => {
    const model = new FakeModel();
    await started(model);
    expect(model.sessions.map(({ profile }) => profile)).toEqual([
      expect.objectContaining({ kid: 'kenji', skill: 3 }),
      expect.objectContaining({ kid: 'nia' }),
      expect.objectContaining({ kid: 'milo' }),
      expect.objectContaining({ kid: 'pip' }),
      expect.objectContaining({ kid: null }),
    ]);
  });

  it('opens no session when the model is not ready (L2-021 criteria 4 and 5)', async () => {
    const model = new FakeModel();
    model.ready = false;
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started(model);
    expect(model.readyAsked).toBe(1);
    expect(model.sessions).toHaveLength(0);
    vi.advanceTimersByTime(KENJI_PROFILE_MS + TICK_MS);
    expect(game.duel()).toMatchObject({ outcome: 'won', winner: 'deskHolder' });
  });

  it('stops opening at the first session that cannot be opened', async () => {
    const model = new FakeModel();
    model.opensBeforeFailing = 2;
    await started(model);
    expect(model.sessions).toHaveLength(2);
  });

  it('asks the classmate’s session about the card, and uses a decision before the profile’s time', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const model = new FakeModel();
    const game = await started(model);
    expect(kenji(model).asked).toHaveLength(1);
    expect(kenji(model).asked[0].card).toEqual(game.duel()?.card);

    kenji(model).asked[0].give({ answer: answerOf(game), afterMs: 1000 });
    await settled();
    vi.advanceTimersByTime(1000 - TICK_MS);
    expect(game.duel()?.outcome).toBe('open');
    vi.advanceTimersByTime(TICK_MS);
    expect(game.duel()).toMatchObject({ outcome: 'won', winner: 'deskHolder' });
  });

  it('gives a model’s wrong answer as the classmate’s, and the duel freezes the classmate', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const model = new FakeModel();
    const game = await started(model);
    kenji(model).asked[0].give({ answer: answerOf(game) + 1, afterMs: 900 });
    await settled();
    // The profile's right answer at 1,786 ms was replaced: Kenji answers wrong at 900 ms, is
    // frozen for a second, and is asked again when the freeze ends.
    vi.advanceTimersByTime(2000);
    expect(game.duel()?.outcome).toBe('open');
    expect(kenji(model).asked).toHaveLength(2);
  });

  it('holds a model decision at the floor of 800 ms (L2-020 5)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const model = new FakeModel();
    const game = await started(model);
    kenji(model).asked[0].give({ answer: answerOf(game), afterMs: 1 });
    await settled();
    vi.advanceTimersByTime(800 - TICK_MS);
    expect(game.duel()?.outcome).toBe('open');
    vi.advanceTimersByTime(TICK_MS);
    expect(game.duel()?.winner).toBe('deskHolder');
  });

  it('answers at once when a decision arrives after its own time but before the profile’s', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const model = new FakeModel();
    const game = await started(model);
    vi.advanceTimersByTime(2000);
    kenji(model).asked[0].give({ answer: answerOf(game), afterMs: 1000 });
    await settled();
    vi.advanceTimersByTime(TICK_MS);
    expect(game.duel()?.winner).toBe('deskHolder');
  });

  it('aborts the prompt and answers from the profile when the profile’s time comes first (L2-021 3)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const model = new FakeModel();
    const game = await started(model);
    vi.advanceTimersByTime(KENJI_PROFILE_MS + TICK_MS);
    expect(kenji(model).asked[0].signal.aborted).toBe(true);
    expect(game.duel()).toMatchObject({ outcome: 'won', winner: 'deskHolder' });
  });

  it('keeps the profile’s answer when the model gives none (L2-021 2)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const model = new FakeModel();
    const game = await started(model);
    kenji(model).asked[0].give(null);
    await settled();
    vi.advanceTimersByTime(KENJI_PROFILE_MS - TICK_MS);
    expect(game.duel()?.outcome).toBe('open');
    vi.advanceTimersByTime(2 * TICK_MS);
    expect(game.duel()?.winner).toBe('deskHolder');
  });

  it('aborts the prompt when the child wins first', async () => {
    const model = new FakeModel();
    const game = await started(model);
    game.answer(answerOf(game));
    expect(kenji(model).asked[0].signal.aborted).toBe(true);
  });

  it('keeps the sessions between duels, and destroys them when the tour ends (L2-021 6)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const model = new FakeModel();
    const game = await started(model);
    game.answer(answerOf(game));
    vi.advanceTimersByTime(RIGHT_MS + STAMP_MS);
    expect(game.screen()).toBe('world-map');
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(game.screen()).toBe('duel');
    expect(model.sessions.some(({ destroyed }) => destroyed)).toBe(false);

    // The tour's 3 minutes pass, and the classmate's win ends it.
    vi.spyOn(Math, 'random').mockReturnValue(0);
    vi.advanceTimersByTime(180_000);
    expect(game.duel()?.winner).toBe('deskHolder');
    game.continue();
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(game.screen()).toBe('podium');
    expect(model.sessions.every(({ destroyed }) => destroyed)).toBe(true);
  });

  it('destroys the sessions when the child leaves, and none arrives after (L2-021 6)', async () => {
    const model = new FakeModel();
    const game = await started(model);
    await game.leave();
    expect(model.sessions).toHaveLength(5);
    expect(model.sessions.every(({ destroyed }) => destroyed)).toBe(true);
  });

  it('destroys a session that arrives after the child left', async () => {
    const model = new FakeModel();
    const game = soloGame(model);
    game.start(SETUP);
    await game.leave();
    await settled();
    expect(model.sessions.every(({ destroyed }) => destroyed)).toBe(true);
  });

  it('opens new sessions for "Play again", after its first card', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const model = new FakeModel();
    const game = await started(model);
    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(180_000);
    game.continue();
    game.continue();
    expect(game.screen()).toBe('podium');
    game.playAgain();
    await settled();
    expect(model.sessions).toHaveLength(10);
    expect(model.sessions.slice(0, 5).every(({ destroyed }) => destroyed)).toBe(true);
    expect(model.sessions.slice(5).some(({ destroyed }) => destroyed)).toBe(false);
    expect(model.sessions[5].asked).toHaveLength(1);
  });
});
