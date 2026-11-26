import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GAME_SESSION, type GameSession, type TourState } from '@atw/api';
import { WorldMapPage } from './world-map';

/**
 * World Map's loading state stands only until the session publishes the tour, which a solo
 * game does before World Map opens (docs/adr/0023), so no behaviour spec can catch it: this test
 * holds the tour back.
 */
describe('WorldMapPage', () => {
  it('is in its loading state until the tour is published (L2-031 criterion 4)', async () => {
    const tour = signal<TourState | null>(null);
    const session: GameSession = {
      hasGame: signal(true),
      setup: signal(null),
      screen: computed(() => 'world-map'),
      duel: signal(null),
      tour,
      start: () => undefined,
      answer: () => undefined,
      continue: () => undefined,
      watchScreen: () => () => undefined,
    };
    TestBed.configureTestingModule({ providers: [{ provide: GAME_SESSION, useValue: session }] });
    const fixture = TestBed.createComponent(WorldMapPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.world-map__where')?.textContent).toContain(
      'Drawing the classroom…',
    );
    expect(element.querySelector('.world-map__room [role="status"]')?.textContent).toContain(
      'Drawing the classroom…',
    );
    expect(element.querySelector('.world-map__room')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.standings__item .skeleton').length).toBe(10);
    expect(element.querySelector('.world-map__view')).toBeNull();

    tour.set({
      tourLength: 6,
      desks: ['France', 'Egypt', 'Japan', 'UK', 'Italy', 'USA'].map((country, index) => ({
        desk: index + 1,
        country,
        landmark: '',
        holder: index === 0 ? null : `c${index + 1}`,
      })),
      players: [{ id: 'you', name: 'You', kid: 'zuri', you: true }],
      traveller: 'you',
      travellerDesk: 2,
      standings: [{ place: 1, player: 'you', distance: 1 }],
      lastMove: null,
      stamps: [],
      phase: 'duel',
    });
    await fixture.whenStable();

    expect(element.querySelector('.world-map__where')?.textContent).toContain(
      'You’re travelling · desk 2 of 6 · next stop Japan',
    );
    expect(element.querySelector('.world-map__room')?.getAttribute('aria-busy')).toBeNull();
    expect(element.querySelector('.world-map__view--room')).not.toBeNull();
  });
});
