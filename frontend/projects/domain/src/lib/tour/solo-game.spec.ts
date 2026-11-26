import { TestBed } from '@angular/core/testing';
import { type GameSetup } from '@atw/api';
import { SoloGame } from './solo-game';

const SETUP: GameSetup = { kinds: ['plus'], tables: [7], tourLength: 6, cardSpeed: 'chill' };

describe('SoloGame', () => {
  function soloGame(): SoloGame {
    TestBed.configureTestingModule({ providers: [SoloGame] });
    return TestBed.inject(SoloGame);
  }

  it('holds no game until one starts', () => {
    const game = soloGame();
    expect(game.hasGame()).toBe(false);
    expect(game.setup()).toBeNull();
    expect(game.screen()).toBeNull();
  });

  it('starts a game with the setup it is given, at Duel (L2-018 criterion 1)', () => {
    const game = soloGame();
    game.start(SETUP);
    expect(game.hasGame()).toBe(true);
    expect(game.setup()).toEqual(SETUP);
    expect(game.screen()).toBe('duel');
  });
});
