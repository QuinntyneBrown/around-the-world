import { InjectionToken } from '@angular/core';

/** Whether every picture arrived, or one could not load. */
export type PictureArrival = 'loaded' | 'failed';

/** Preloads the pictures a screen shows (docs/adr/0013-pictures-arriving-and-failing.md). */
export interface PictureLoader {
  /**
   * Resolves `loaded` once every picture has arrived and `failed` when one cannot load. When
   * the signal aborts, the pictures still arriving are dropped and the promise never settles.
   */
  preload(urls: readonly string[], signal: AbortSignal): Promise<PictureArrival>;
}

export const PICTURE_LOADER = new InjectionToken<PictureLoader>('PICTURE_LOADER');
