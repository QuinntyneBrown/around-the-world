import { InjectionToken, type Signal } from '@angular/core';

/** Whether the device has a network (L2-022 criterion 6). */
export interface Network {
  readonly online: Signal<boolean>;
}

export const NETWORK = new InjectionToken<Network>('NETWORK');
