import { type ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withAutoCleanupInjectors, withRouterConfig } from '@angular/router';
import { DEVICE_STORAGE, PICTURE_LOADER, PLAYER_CHOICES, PLAYER_STORAGE, VISIT } from '@atw/api';
import {
  deviceStorage,
  LocalPlayerStorage,
  NicknameGenerator,
  StoredPlayerChoices,
} from '@atw/domain';
import { routes } from './app.routes';
import { BrowserPictureLoader } from './pictures/browser-picture-loader';
import { VisitState } from './visit/visit-state';

/**
 * The composition root: it binds every token, except those a lazy route brings, which that
 * route binds so their code stays out of the initial bundle (AGENTS.md, Frontend).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Leaving a route group destroys what it provided, such as a game (docs/adr/0016). A Back
    // refused during a game leaves the browser's history as it was (docs/adr/0027).
    provideRouter(
      routes,
      withAutoCleanupInjectors(),
      withRouterConfig({ canceledNavigationResolution: 'computed' }),
    ),
    { provide: NicknameGenerator, useFactory: () => new NicknameGenerator() },
    { provide: DEVICE_STORAGE, useFactory: deviceStorage },
    { provide: PLAYER_STORAGE, useClass: LocalPlayerStorage },
    { provide: PLAYER_CHOICES, useClass: StoredPlayerChoices },
    { provide: PICTURE_LOADER, useClass: BrowserPictureLoader },
    { provide: VISIT, useClass: VisitState },
  ],
};
