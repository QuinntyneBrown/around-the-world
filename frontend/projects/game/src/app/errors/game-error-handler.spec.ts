import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ERROR_PATH, GameErrorHandler } from './game-error-handler';

/** How the game's failures open Something Went Wrong (L2-054 criterion 4, docs/adr/0027). */
describe('GameErrorHandler', () => {
  afterEach(() => vi.restoreAllMocks());

  function handler(url = '/setup', navigation: Promise<boolean> = Promise.resolve(true)) {
    const router = { url, navigateByUrl: vi.fn(() => navigation) };
    TestBed.configureTestingModule({
      providers: [GameErrorHandler, { provide: Router, useValue: router }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    return { errors: TestBed.inject(GameErrorHandler), router };
  }

  it('logs the failure and opens Something Went Wrong, keeping the address', () => {
    const { errors, router } = handler();
    const failure = new Error('broke');
    errors.handleError(failure);
    expect(console.error).toHaveBeenCalledWith('ERROR', failure);
    expect(router.navigateByUrl).toHaveBeenCalledWith(ERROR_PATH, { skipLocationChange: true });
  });

  it('opens it once while it opens, and again for a later failure', async () => {
    const { errors, router } = handler();
    errors.handleError(new Error('one'));
    errors.handleError(new Error('two'));
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    await Promise.resolve();
    await Promise.resolve();
    errors.handleError(new Error('three'));
    expect(router.navigateByUrl).toHaveBeenCalledTimes(2);
  });

  it('only logs a failure on Something Went Wrong itself', () => {
    const { errors, router } = handler(ERROR_PATH);
    errors.handleError(new Error('again'));
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('only logs once Something Went Wrong itself could not open', async () => {
    const { errors, router } = handler('/setup', Promise.reject(new Error('no chunk')));
    errors.handleError(new Error('first'));
    await Promise.resolve();
    await Promise.resolve();
    errors.handleError(new Error('second'));
    expect(router.navigateByUrl).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});
