import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { type Network } from '@atw/api';

/**
 * `Network` from the browser: `navigator.onLine` and its `online` and `offline` events. The
 * route that needs it provides it, and it stops listening when that route goes (AGENTS.md,
 * Lazy loading and memory; docs/adr/0031-making-a-room.md).
 */
@Injectable()
export class BrowserNetwork implements Network {
  private readonly state = signal(navigator.onLine);
  readonly online = this.state.asReadonly();

  constructor() {
    const listening = new AbortController();
    const update = () => this.state.set(navigator.onLine);
    window.addEventListener('online', update, { signal: listening.signal });
    window.addEventListener('offline', update, { signal: listening.signal });
    inject(DestroyRef).onDestroy(() => listening.abort());
  }
}
