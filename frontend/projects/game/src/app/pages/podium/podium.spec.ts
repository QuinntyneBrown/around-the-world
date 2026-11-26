import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  GAME_SESSION,
  type GameConnection,
  type GameSession,
  type TourResult,
  type Visit,
  VISIT,
} from '@atw/api';
import { PodiumPage } from './podium';

/** A child who came 4th of the five kids with 5 of 12 countries (mock `podium/unplaced`). */
const UNPLACED: TourResult = {
  ending: 'allTheWayRound',
  tourLength: 12,
  winner: 'nia',
  winnerDistance: 12,
  places: [
    { place: 1, player: 'nia', distance: 12 },
    { place: 2, player: 'kenji', distance: 8 },
    { place: 3, player: 'milo', distance: 6 },
    { place: 4, player: 'you', distance: 5 },
    { place: 5, player: 'pip', distance: 2 },
  ],
  players: [
    { id: 'you', name: 'You', kid: 'zuri', you: true },
    { id: 'nia', name: 'Nia', kid: 'nia', you: false },
    { id: 'kenji', name: 'Kenji', kid: 'kenji', you: false },
    { id: 'milo', name: 'Milo', kid: 'milo', you: false },
    { id: 'pip', name: 'Pip', kid: 'pip', you: false },
  ],
  yourPlace: 4,
  passport: [
    'France',
    'Egypt',
    'Japan',
    'UK',
    'Italy',
    'USA',
    'Brazil',
    'India',
    'Kenya',
    'China',
    'Australia',
    'Peru',
  ].map((country, index) => ({
    desk: index + 1,
    country,
    stamped: index === 0 || (index >= 2 && index <= 5),
  })),
  countriesReached: 5,
};

/**
 * The Podium's loading state stands only until the session publishes the result, which a solo
 * game does before the Podium opens, and a child placed 4th needs three kids to travel further
 * than them, which no spec can drive through the classmates (docs/adr/0024): these tests set the
 * result.
 */
describe('PodiumPage', () => {
  function podium(result: TourResult | null) {
    const finished = vi.fn();
    const session: GameSession = {
      hasGame: signal(true),
      setup: signal(null),
      screen: computed(() => 'podium'),
      duel: signal(null),
      tour: signal(null),
      result: signal(result),
      start: () => undefined,
      answer: () => undefined,
      continue: () => undefined,
      playAgain: () => undefined,
      watchScreen: () => () => undefined,
      watchMoments: () => () => undefined,
      stickers: signal([]),
      connection: signal<GameConnection>('live'),
      notice: signal(null),
      sendSticker: () => undefined,
      kind: 'solo',
      paused: signal(false),
      pause: () => undefined,
      resume: () => undefined,
      leave: () => Promise.resolve(),
    };
    const visit: Visit = {
      tourFinished: signal(false),
      finishTour: finished,
      micCheckDone: signal(true),
      finishMicCheck: () => undefined,
      voiceLost: signal(false),
      loseVoice: () => undefined,
      room: signal(null),
      enterRoom: () => undefined,
      leaveRoom: () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: GAME_SESSION, useValue: session },
        { provide: VISIT, useValue: visit },
      ],
    });
    return { fixture: TestBed.createComponent(PodiumPage), finished };
  }

  it('is in its loading state until the result is published (L2-031 criterion 4)', async () => {
    const { fixture, finished } = podium(null);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.podium__headline')?.textContent).toBe('Counting the desks…');
    expect(element.querySelector('[role="status"]')?.textContent).toBe('Working out the places…');
    expect(element.querySelector('main')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.podium__steps .skeleton').length).toBe(6);
    expect(element.querySelector('.passport.skeleton')).not.toBeNull();
    expect(element.querySelector('.podium__place[data-kid]')).toBeNull();
    expect(finished).not.toHaveBeenCalled();
  });

  it('puts a child outside the top three in the passport only (L2-035 criterion 2)', async () => {
    const { fixture, finished } = podium(UNPLACED);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.podium__headline')?.textContent).toBe(
      'Nia made it round first!',
    );
    const names = [...element.querySelectorAll('.podium__name')].map((name) => name.textContent);
    expect(names).toEqual(['Nia', 'Kenji', 'Milo']);
    expect(element.querySelector('.passport__head p')?.textContent).toBe(
      '5 of 12 countries · 4th place',
    );
    expect(element.querySelectorAll('.stamp:not(.stamp--missing)').length).toBe(5);
    expect(element.querySelectorAll('.stamp--missing').length).toBe(7);
    expect(finished).toHaveBeenCalledTimes(1);
  });
});
