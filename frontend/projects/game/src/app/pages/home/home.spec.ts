import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PICTURE_LOADER, PLAYER_CHOICES, VISIT, type PlayerChoices } from '@atw/api';
import { GameSetupRules, NicknameGenerator } from '@atw/domain';
import { VisitState } from '../../visit/visit-state';
import { HomePage } from './home';

/**
 * Home's `played` state (L2-032 criterion 2): the Podium finishes a tour in journey 06, so until
 * then no behaviour spec can reach it, and this test sets the visit directly.
 */
describe('HomePage', () => {
  async function home(visit: VisitState) {
    const choices: PlayerChoices = {
      kid: signal('zuri'),
      nickname: signal({ adjective: 0, animal: 0 }),
      setup: signal(GameSetupRules.defaults()),
      confirmKid: () => undefined,
      changeSetup: () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLAYER_CHOICES, useValue: choices },
        { provide: NicknameGenerator, useValue: new NicknameGenerator() },
        { provide: PICTURE_LOADER, useValue: { preload: () => Promise.resolve('loaded') } },
        { provide: VISIT, useValue: visit },
      ],
    });
    const fixture = TestBed.createComponent(HomePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('reads "Play" before a tour is finished in this visit', async () => {
    const element = await home(new VisitState());
    expect(element.querySelector('.home__play')?.textContent?.trim()).toBe('Play');
  });

  it('reads "Play again" after a tour is finished in this visit, and still opens Solo Or Friends', async () => {
    const visit = new VisitState();
    visit.finishTour();
    const element = await home(visit);
    const play = element.querySelector('.home__play');
    expect(play?.textContent?.trim()).toBe('Play again');
    expect(play?.getAttribute('href')).toBe('/play');
    expect(element.querySelector('.kid-chip__name')?.textContent?.trim()).toBe(
      'Speedy Otter as Zuri',
    );
  });
});
