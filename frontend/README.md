# Around the World: frontend

The Angular 22 workspace that is the game. Run every command from this folder.

| Project               | Import            | Holds                                                                                                  |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `projects/game`       | (the application) | The shell, the routes, the composition root and the global foundations                                 |
| `projects/components` | `@atw/components` | One presentation component per design-system page ([README](projects/components/README.md))            |
| `projects/domain`     | `@atw/domain`     | The game and its rules: `questions/`, `tour/`, `classmates/`, `voice/`, `storage/`, `cast/`            |
| `projects/api`        | `@atw/api`        | Contracts, tokens, and the HTTP and SignalR clients for the backend                                    |
| `projects/world`      | `@atw/world`      | The 3D classroom's renderer (Three.js), imported dynamically only ([README](projects/world/README.md)) |

| Task                                    | Command                                                          |
| --------------------------------------- | ---------------------------------------------------------------- |
| Serve on http://localhost:4200          | `npm start`                                                      |
| Production build with budgets           | `npm run build`                                                  |
| Unit tests (Vitest)                     | `npm test`                                                       |
| Lint and format                         | `npm run lint`, `npm run format:check` (`npm run format` to fix) |
| Behaviour specs (Playwright, Chromium)  | `npm run build && npm run e2e`                                   |
| End-to-end type check                   | `npm run e2e:typecheck`                                          |
| Heap and frame-rate checks (on request) | `npm run build && npm run e2e:measure` (docs/adr/0038)           |
| Rebuild the classroom's stand-in scenes | `npm run classroom:stand-in` (docs/adr/0028)                     |

The behaviour specs import `test` and `expect` from `e2e/fixtures/test.ts`, keep every
selector in a page object in `e2e/pages/`, and run against `dist/game/browser` served on
localhost. The fixture's `device` seeds and reads what the game keeps on the device, and its
`pictures` holds back or refuses pictures; its `classroom` holds back or refuses the 3D
classroom's scenes, takes WebGL away and counts the WebGL contexts still open. CI runs only the specs tagged `@critical`
(`npm run e2e -- --grep @critical`); run them all before pushing. See `docs/adr/` for the
decisions behind the workspace.
