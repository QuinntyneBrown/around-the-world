import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GAME_SESSION, type DuelState, type GameSession } from '@atw/api';
import { DuelPage } from './duel';

/**
 * Duel's loading state stands only until the session publishes the first duel, which a solo
 * game does as it starts (docs/adr/0020), so no behaviour spec can catch it: this test holds
 * the duel back.
 */
describe('DuelPage', () => {
  it('is in its loading state until the first duel is published (L2-031 criterion 4)', async () => {
    const duel = signal<DuelState | null>(null);
    const session: GameSession = {
      hasGame: signal(true),
      setup: signal(null),
      screen: computed(() => 'duel'),
      duel,
      start: () => undefined,
      answer: () => undefined,
      tour: signal(null),
      result: signal(null),
      continue: () => undefined,
      playAgain: () => undefined,
      watchScreen: () => () => undefined,
    };
    TestBed.configureTestingModule({ providers: [{ provide: GAME_SESSION, useValue: session }] });
    const fixture = TestBed.createComponent(DuelPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.flash-card [role="status"]')?.textContent).toContain(
      'Getting the first card ready…',
    );
    expect(element.querySelector('.flash-card__result')?.textContent).toContain('Get ready…');
    expect(element.querySelector('.flash-card')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.duel-hud .skeleton').length).toBeGreaterThan(0);
    expect(element.querySelector('.number-pad')).toBeNull();

    duel.set({
      card: { kind: 'times', left: 6, right: 4 },
      desk: 2,
      tourLength: 12,
      country: 'Egypt',
      traveller: { name: 'You', kid: 'zuri' },
      deskHolder: { name: 'Kenji', kid: 'kenji' },
      role: 'traveller',
      secondsToAnswer: 6,
      timeLeftMs: 6000,
      frozen: false,
      wrongAnswer: null,
      outcome: 'open',
      winner: null,
      answer: null,
      ring: [],
      hop: null,
    });
    await fixture.whenStable();

    expect(element.querySelector('.flash-card__sum')?.textContent).toContain('6 × 4');
    expect(element.querySelector('.flash-card')?.getAttribute('aria-busy')).toBeNull();
    expect(element.querySelector('.number-pad')).not.toBeNull();
  });
});
