import { type ErrorHandler, inject, Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';

/** The address of Something Went Wrong. */
export const ERROR_PATH = '/error';

/**
 * Catches a failure of the game itself (L2-054 criterion 4, docs/adr/0027). It logs it to the
 * browser's console, as Angular's own handler does, and opens Something Went Wrong without
 * changing the address, so "Try again" can load the game afresh where it broke. It opens it
 * once: a failure while it opens, or on it, is only logged. Nothing of the failure is shown.
 */
@Injectable()
export class GameErrorHandler implements ErrorHandler {
  // The router is read when a failure comes, not when the handler is made, which is before it.
  private readonly injector = inject(Injector);
  private opening = false;

  handleError(error: unknown): void {
    console.error('ERROR', error);
    const router = this.injector.get(Router);
    if (this.opening || router.url === ERROR_PATH) return;
    this.opening = true;
    router.navigateByUrl(ERROR_PATH, { skipLocationChange: true }).then(
      () => (this.opening = false),
      // Something Went Wrong itself cannot open: the failure stays logged, and nothing more.
      () => undefined,
    );
  }
}
