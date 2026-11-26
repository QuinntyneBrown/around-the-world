import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  type ClassmateModel,
  type ClassmateModelProfile,
  type ClassmateModelSession,
} from '@atw/api';
import { type OnDeviceClassmateModel } from './on-device-model';
import { promptApi } from './prompt-api';

/**
 * The `ClassmateModel` the solo group binds (docs/adr/0030-classmates-with-the-on-device-model.md).
 * With no `LanguageModel` in the browser it is not ready, at once; otherwise it imports the
 * Prompt API code the first time it is asked, so none of it is in the initial bundle. Every
 * session it opened and its owner did not destroy is destroyed with its route.
 */
@Injectable()
export class LazyClassmateModel implements ClassmateModel {
  private readonly api = promptApi();
  private loading: Promise<OnDeviceClassmateModel | null> | null = null;
  private readonly opened = new Set<ClassmateModelSession>();
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      for (const session of this.opened) session.destroy();
      this.opened.clear();
    });
  }

  async isReady(): Promise<boolean> {
    const model = await this.load();
    return model !== null && !this.destroyed && (await model.isReady());
  }

  async openSession(profile: ClassmateModelProfile): Promise<ClassmateModelSession> {
    const model = await this.load();
    if (!model || this.destroyed) throw new Error('The on-device model is not there');
    const session = await model.openSession(profile);
    if (this.destroyed) {
      session.destroy();
      throw new Error('The game is gone');
    }
    this.opened.add(session);
    return {
      decide: (card, signal) => session.decide(card, signal),
      destroy: () => {
        this.opened.delete(session);
        session.destroy();
      },
    };
  }

  private load(): Promise<OnDeviceClassmateModel | null> {
    const api = this.api;
    if (!api) return Promise.resolve(null);
    this.loading ??= import('./on-device-model').then(
      ({ OnDeviceClassmateModel }) => new OnDeviceClassmateModel(api),
      () => null,
    );
    return this.loading;
  }
}
