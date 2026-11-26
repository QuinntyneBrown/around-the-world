import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  CLASSMATE_MODEL,
  GAME_SESSION,
  type GameSetup,
  PLAYER_CHOICES,
  type PlayerChoices,
  WAY_OF_ANSWERING,
} from '@atw/api';
import { GameSetupRules, SoloGame } from '@atw/domain';
import { GameSetupPage } from './game-setup';

@Component({ template: '' })
class DuelStandIn {}

/**
 * "Go!" hands the setup to the solo game (L2-018 criterion 1). What the game holds is not on
 * any screen until journey 04 deals the first flash card, so this test reads the session.
 */
describe('GameSetupPage', () => {
  async function gameSetup(kept: GameSetup) {
    const setup = signal(kept);
    const choices: PlayerChoices = {
      kid: signal('zuri'),
      nickname: signal({ adjective: 0, animal: 0 }),
      setup,
      confirmKid: () => undefined,
      changeSetup: (changed) => setup.set(changed),
      wayOfAnswering: signal('numberPad'),
      changeWayOfAnswering: () => undefined,
      soundMuted: signal(false),
      setSoundMuted: () => undefined,
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'duel', component: DuelStandIn }]),
        { provide: PLAYER_CHOICES, useValue: choices },
        { provide: GAME_SESSION, useClass: SoloGame },
        // No on-device model: the classmates play from their profiles (docs/adr/0030).
        { provide: CLASSMATE_MODEL, useValue: { isReady: () => Promise.resolve(false) } },
        // Mic Check is not needed, so "Go!" opens Duel (its behaviour specs cover Mic Check).
        { provide: WAY_OF_ANSWERING, useValue: { micCheckNeeded: signal(false) } },
      ],
    });
    const fixture = TestBed.createComponent(GameSetupPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const press = async (selector: string, text: string) => {
      const button = [...element.querySelectorAll<HTMLButtonElement>(selector)].find((candidate) =>
        candidate.textContent?.includes(text),
      );
      button?.click();
      await fixture.whenStable();
    };
    return { element, press, session: TestBed.inject(GAME_SESSION) };
  }

  it('starts the solo game with the defaults when nothing is changed, and opens Duel', async () => {
    const { press, session } = await gameSetup(GameSetupRules.defaults());

    await press('.toy-btn', 'Go!');

    expect(session.setup()).toEqual(GameSetupRules.defaults());
    expect(TestBed.inject(Router).url).toBe('/duel');
  });

  it('starts the solo game with the setup as the child left it', async () => {
    const { press, session } = await gameSetup(GameSetupRules.defaults());

    await press('.toggle-chip', 'Divide');
    await press('.choice', '24');
    await press('.segmented__option', 'Lightning');
    await press('.toy-btn', 'Go!');

    expect(session.setup()).toEqual({
      kinds: ['times', 'divide'],
      tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
      tourLength: 24,
      cardSpeed: 'lightning',
    });
  });
});
