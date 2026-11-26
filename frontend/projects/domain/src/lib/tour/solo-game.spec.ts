import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PLAYER_CHOICES, type GameSetup, type KidId, type PlayerChoices } from '@atw/api';
import { FlashCardMaker } from '../questions/flash-card-maker';
import { MESSAGE_MS, RIGHT_MS, SoloGame, STAMP_MS, TICK_MS, TIME_UP_MS } from './solo-game';

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

  it('shows "You got it!", then the stamp, then World Map with the hop (L2-033 7, L2-002)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const game = await started();
    const screens: string[] = [];
    game.watchScreen((screen) => screens.push(screen));
    game.answer(answerOf(game));
    vi.advanceTimersByTime(RIGHT_MS);
    expect(game.duel()?.hop).toEqual({
      kind: 'hop',
      traveller: 'you',
      from: 2,
      to: 3,
      passedEmptyDesk: false,
      satDown: null,
    });
    expect(game.screen()).toBe('duel');
    vi.advanceTimersByTime(STAMP_MS);
    expect(game.screen()).toBe('world-map');
    expect(game.tour()).toMatchObject({
      phase: 'moving',
      traveller: 'you',
      travellerDesk: 3,
      stamps: [1, 3],
      lastMove: { kind: 'hop', to: 3 },
    });
    expect(game.tour()?.standings[0]).toEqual({ place: 1, player: 'you', distance: 2 });
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(game.screen()).toBe('duel');
    expect(game.duel()).toMatchObject({ desk: 3, country: 'Japan', outcome: 'open', hop: null });
    expect(game.tour()?.lastMove).toBeNull();
    expect(screens).toEqual(['world-map', 'duel']);
  });

  it('waits on a lost duel for the pill, then sits the child down (L2-033 8, L2-003 1)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    expect(game.duel()?.winner).toBe('deskHolder');
    vi.advanceTimersByTime(10_000);
    expect(game.screen()).toBe('duel');
    game.continue();
    expect(game.screen()).toBe('world-map');
    expect(game.tour()).toMatchObject({
      phase: 'moving',
      traveller: 'kenji',
      travellerDesk: 3,
      lastMove: { kind: 'deskHolderTravels', satDown: 'you', from: 2 },
    });
    expect(game.tour()?.desks[1].holder).toBe('you');
  });

  it('plays the classmates’ duels on World Map while the child is seated (L2-034 7)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    game.continue();
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(game.tour()).toMatchObject({ phase: 'watching', lastMove: null });
    expect(game.screen()).toBe('world-map');
    vi.advanceTimersByTime(5000);
    expect(game.tour()?.phase).toBe('moving');
    expect(game.tour()?.lastMove?.traveller).not.toBe('you');
    expect(game.screen()).toBe('world-map');
  });

  it('plays the classmates’ duels out at once on "Back to the card" (L2-034 12)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    game.continue();
    game.continue();
    expect(game.screen()).toBe('duel');
    expect(game.duel()).toMatchObject({ role: 'deskHolder', desk: 2, outcome: 'open' });
  });

  it('opens World Map with no stamp when the child wins as the desk holder (L2-033 10)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    game.continue();
    game.continue();
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    game.answer(answerOf(game));
    vi.advanceTimersByTime(RIGHT_MS);
    expect(game.duel()?.hop).toBeNull();
    expect(game.screen()).toBe('world-map');
    expect(game.tour()).toMatchObject({
      traveller: 'you',
      travellerDesk: 3,
      stamps: [1],
      lastMove: { kind: 'deskHolderTravels', traveller: 'you' },
    });
  });

  it('stops its clock when the solo group is destroyed (L2-048)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(10_000);
    expect(game.duel()?.outcome).toBe('open');
    expect(vi.getTimerCount()).toBe(0);
  });

  /** The child wins the duel as the traveller; World Map then shows the hop. */
  function winAndHop(game: SoloGame): void {
    game.answer(answerOf(game));
    vi.advanceTimersByTime(RIGHT_MS + STAMP_MS);
  }

  it('ends the tour when the child goes all the way round, then opens the Podium (L2-006 1)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const game = await started();
    for (let hop = 1; hop < 5; hop++) {
      winAndHop(game);
      vi.advanceTimersByTime(MESSAGE_MS);
    }
    winAndHop(game);
    expect(game.screen()).toBe('world-map');
    expect(game.tour()).toMatchObject({ phase: 'over', lastMove: { kind: 'hop', to: 2 } });
    expect(game.result()).toBeNull();
    vi.advanceTimersByTime(MESSAGE_MS);
    expect(game.screen()).toBe('podium');
    expect(game.result()).toMatchObject({
      ending: 'allTheWayRound',
      tourLength: 6,
      winner: 'you',
      winnerDistance: 6,
      yourPlace: 1,
      countriesReached: 6,
    });
    expect(game.result()?.places.map(({ player }) => player)).toEqual([
      'you',
      'kenji',
      'nia',
      'milo',
      'pip',
    ]);
    expect(game.result()?.players.find(({ id }) => id === 'kenji')?.name).toBe('Kenji');
  });

  it('ends the tour on its time limit when the current duel ends (L2-006 2)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    expect(game.duel()?.winner).toBe('deskHolder');
    vi.advanceTimersByTime(180_000);
    expect(game.screen()).toBe('duel');
    game.continue();
    expect(game.screen()).toBe('world-map');
    expect(game.tour()?.phase).toBe('over');
    game.continue();
    expect(game.screen()).toBe('podium');
    expect(game.result()).toMatchObject({
      ending: 'timeLimit',
      winner: 'you',
      winnerDistance: 1,
      yourPlace: 1,
    });
    expect(game.result()?.places[1]).toEqual({ place: 2, player: 'kenji', distance: 1 });
  });

  it('does not end the tour before its time limit (L2-006 2)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    game.continue();
    expect(game.tour()?.phase).toBe('moving');
  });

  it('starts a new tour with the same kid and setup on "Play again" (L2-035 3)', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = await started();
    vi.advanceTimersByTime(5000);
    vi.advanceTimersByTime(180_000);
    game.continue();
    game.continue();
    expect(game.screen()).toBe('podium');
    game.playAgain();
    expect(game.screen()).toBe('duel');
    expect(game.result()).toBeNull();
    expect(game.setup()).toEqual(SETUP);
    expect(game.duel()).toMatchObject({
      desk: 2,
      outcome: 'open',
      traveller: { name: 'You', kid: 'zuri' },
      deskHolder: { name: 'Kenji' },
    });
    expect(game.tour()).toMatchObject({ phase: 'duel', stamps: [1], lastMove: null });
    vi.advanceTimersByTime(5000);
    expect(game.duel()?.winner).toBe('deskHolder');
    game.continue();
    expect(game.tour()?.phase).toBe('moving');
  });
});
