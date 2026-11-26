import { Injectable, signal } from '@angular/core';
import { type Visit } from '@atw/api';

/** `Visit` held in memory for this visit only; it is never written to the device. */
@Injectable()
export class VisitState implements Visit {
  private readonly finished = signal(false);
  readonly tourFinished = this.finished.asReadonly();

  finishTour(): void {
    this.finished.set(true);
  }
}
