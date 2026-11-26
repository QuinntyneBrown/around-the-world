import { Injectable } from '@angular/core';
import { type PictureArrival, type PictureLoader } from '@atw/api';

/**
 * `PictureLoader` in the browser (docs/adr/0013-pictures-arriving-and-failing.md): it decodes
 * each picture with an `Image`, and when the signal aborts it drops every source, so a screen
 * that is left releases what it started.
 */
@Injectable()
export class BrowserPictureLoader implements PictureLoader {
  preload(urls: readonly string[], signal: AbortSignal): Promise<PictureArrival> {
    return new Promise((resolve) => {
      if (signal.aborted) return;
      const images = urls.map((url) => {
        const image = new Image();
        image.src = url;
        return image;
      });
      const drop = () => {
        for (const image of images) image.src = '';
      };
      signal.addEventListener('abort', drop, { once: true });
      const settle = (arrival: PictureArrival) => {
        signal.removeEventListener('abort', drop);
        if (!signal.aborted) resolve(arrival);
      };
      Promise.all(images.map((image) => image.decode())).then(
        () => settle('loaded'),
        () => settle('failed'),
      );
    });
  }
}
