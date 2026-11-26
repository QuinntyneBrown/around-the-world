import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PLAYER_CHOICES, type GameSetup, type KidId, type PlayerChoices } from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { SoloGame, TICK_MS, TIME_UP_MS } from './solo-game';

const SETUP: GameSetup = { kinds: ['times'], tables: [7], tourLength: 6, cardSpeed: 'normal' };

describe('SoloGame', () => {
  beforeEach(() => vi.useFakeTimers({ now: Date.parse('2026-01-05T09:00:00Z') }));
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function soloGame(kid: KidId = 'zuri'): SoloGame {
    const choices = { kid: signal<KidId | null>(kid) } as unknown as PlayerChoices;
    TestBed.configureTestingModule({
      providers: [SoloGame, { provide: PLAYER_CHOICES, useValue: choices }],
    });
    return TestBed.inject(SoloGame);
  }

  /** Starts a game and lets the classmates' agents arrive. */
  async function started(kid: KidId = 'zuri'): Promise<SoloGame> {
    const game = soloGame(kid);
    game.start(SETUP);
    await vi.dynamicImportSettled();
    return game;
  }

  function answerOf(game: SoloGame): number {
    const duel = game.duel();
    if (!duel) throw new Error('No duel');
    return FlashCardMaker.answerOf(duel.card);
  }

  it('holds no game until one starts', () => {
    const game = soloGame();
    expect(game.hasGame()).toBe(false);
    expect(game.setup()).toBeNull();
    expect(game.screen()).toBeNull();
    expect(game.duel()).toBeNull();
  });

  it('starts at Duel with the first duel at desk 2, the player travelling (L2-007 3, 4)', () => {
    const game = soloGame();
    game.start(SETUP);
    expect(game.hasGame()).toBe(true);
    expect(game.setup()).toEqual(SETUP);
    expect(game.screen()).toBe('duel');
    const duel = game.duel();
    expect(duel).toMatchObject({
      desk: 2,
      tourLength: 6,
      country: 'Egypt',
      role: 'traveller',
      traveller: { name: 'You', kid: 'zuri' },
      deskHolder: { name: 'Kenji', kid: 'kenji' },
      secondsToAnswer: 6,
      timeLeftMs: 6000,
      frozen: false,
      outcome: 'open',
      answer: null,
    });
    expect(duel?.card.kind).toBe('times');
  });

  it('places the five kids round the ring, the player at the duel’s desk', () => {
    const game = soloGame('nia');
    game.start(SETUP);
    expect(game.duel()?.ring).toEqual([
      { kid: 'zuri', desk: 2, you: false },
      { kid: 'kenji', desk: 3, you: false },
      { kid: 'milo', desk: 4, you: false },
      { kid: 'pip', desk: 5, you: false },
      { kid: 'nia', desk: 2, you: true },
    ]);
  });

  it('lets the child win with the first correct answer, and shows the answer (L2-001 1)', async () => {
    const game = await started();
    game.answer(answerOf(game));
    expect(game.duel()).toMatchObject({
      outcome: 'won',
      winner: 'traveller',
      answer: answerOf(game),
    });
  });

  it('freezes the child for 1 second after a wrong answer, then lets them answer (L2-004)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const game = await started();
    const right = answerOf(game);
    game.answer(right + 1);
    expect(game.duel()).toMatchObject({ frozen: true, wrongAnswer: right + 1 });
    game.answer(right);
    expect(game.duel()?.outcome).toBe('open');
    vi.advanceTimersByTime(1000);
    expect(game.duel()).toMatchObject({ frozen: false, wrongAnswer: null });
    game.answer(right);
    expect(game.duel()?.winner).toBe('traveller');
  });

  it('lets a classmate who answers correctly first win (L2-001 2)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    expect(game.duel()).toMatchObject({ outcome: 'won', winner: 'deskHolder' });
  });

  it('never takes a classmate’s answer sooner than 800 ms (L2-020 5)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(800 - TICK_MS);
    expect(game.duel()?.outcome).toBe('open');
  });

  it('drains the time left as the clock ticks', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const game = await started();
    vi.advanceTimersByTime(2000);
    expect(game.duel()?.timeLeftMs).toBe(4000);
  });

  it('shows the answer when the time runs out, then deals a new card to the same two (L2-005 2)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const game = await started();
    const first = game.duel()?.card;
    vi.advanceTimersByTime(6000);
    expect(game.duel()).toMatchObject({
      outcome: 'timedOut',
      answer: answerOf(game),
      winner: null,
    });
    vi.advanceTimersByTime(TIME_UP_MS);
    const next = game.duel();
    expect(next).toMatchObject({
      outcome: 'open',
      desk: 2,
      frozen: false,
      deskHolder: { name: 'Kenji' },
    });
    expect(next?.card).not.toEqual(first);
  });

  it('stops its clock when the solo group is destroyed (L2-048)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(10_000);
    expect(game.duel()?.outcome).toBe('open');
    expect(vi.getTimerCount()).toBe(0);
  });
});
