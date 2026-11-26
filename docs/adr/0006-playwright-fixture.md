# 0006. The shape of the shared Playwright fixture

- **Status:** Accepted
- **Date:** 2026-11-26

## Context

The behaviour specs use no real microphone, on-device model, backend, database or network
beyond localhost, and fail on an unexpected microphone call, an unanswered request, a request
off localhost or a page error (`AGENTS.md`, E2E).

## Decision

- `frontend/e2e/fixtures/test.ts` extends Playwright's `test`; every spec imports `test` and
  `expect` from it. Page objects in `e2e/pages/` own every selector; specs are in `e2e/specs/`.
- An init script (`e2e/fixtures/fakes/browser-fakes.ts`) runs before the game's code and
  replaces `SpeechRecognition`/`webkitSpeechRecognition`, `navigator.mediaDevices.getUserMedia`,
  the microphone's permission query and Chrome's `LanguageModel`. The spec drives them through
  the fixtures `voice` (`say`, `unsupported`), `microphone` (`grant`, `deny`) and `model`
  (`answers`, `downloadable`, `sessions`). By default the microphone is not expected and the
  model is unavailable, so a classmate plays from its profile.
- The overridden `page` fixture routes every request: off localhost is refused, `/api/` and
  `/hubs/` are answered only from the `backend` fixture (`answer`, `hub`), and any other
  localhost request (the build, its fonts, the classroom's assets) goes through.
- A problem is collected, not thrown, and the fixture fails the spec at its end with the list:
  an unexpected microphone call, an unanswered request or WebSocket, a request off localhost, a
  page error, or a console error (Angular's global error listeners log uncaught errors rather
  than letting them reach the browser as page errors).
- The specs run against the production build in `dist/game/browser`, served on localhost by
  `e2e/support/serve.mjs`, on Chromium only, with traces off.

## Consequences

A spec that needs the backend names each answer it expects. Visual, responsive and
accessibility sweeps get their own Playwright projects when first written, and run only when a
person asks.
