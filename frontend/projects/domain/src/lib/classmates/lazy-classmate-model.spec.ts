import { TestBed } from '@angular/core/testing';
import { KID_PROFILES } from './classmate-profile';
import { LazyClassmateModel } from './lazy-classmate-model';

describe('LazyClassmateModel (ADR 0030)', () => {
  const global = globalThis as { LanguageModel?: unknown };
  afterEach(() => delete global.LanguageModel);

  function lazyModel(): LazyClassmateModel {
    TestBed.configureTestingModule({ providers: [LazyClassmateModel] });
    return TestBed.inject(LazyClassmateModel);
  }

  /** A browser's `LanguageModel` with the model available, counting what it creates. */
  function browserModel(availability = 'available') {
    const sessions: { destroyed: boolean }[] = [];
    global.LanguageModel = {
      availability: () => Promise.resolve(availability),
      create: () => {
        const session = {
          destroyed: false,
          clone: () => Promise.reject(new Error('unused')),
          prompt: () => Promise.reject(new Error('unused')),
          destroy: () => (session.destroyed = true),
        };
        sessions.push(session);
        return Promise.resolve(session);
      },
    };
    return sessions;
  }

  it('is not ready, at once, in a browser with no on-device model', async () => {
    expect(await lazyModel().isReady()).toBe(false);
  });

  it('is not ready when the model is not downloaded', async () => {
    browserModel('downloadable');
    expect(await lazyModel().isReady()).toBe(false);
  });

  it('is ready when the model is available', async () => {
    browserModel();
    expect(await lazyModel().isReady()).toBe(true);
  });

  it('destroys a session once, by its owner or with its route', async () => {
    const sessions = browserModel();
    const model = lazyModel();
    const first = await model.openSession(KID_PROFILES.kenji);
    await model.openSession(KID_PROFILES.nia);
    first.destroy();
    expect(sessions.map(({ destroyed }) => destroyed)).toEqual([true, false]);
    TestBed.resetTestingModule();
    expect(sessions.map(({ destroyed }) => destroyed)).toEqual([true, true]);
  });

  it('refuses to open a session in a browser with no on-device model', async () => {
    await expect(lazyModel().openSession(KID_PROFILES.kenji)).rejects.toThrow();
  });
});
