# Around the World: frontend

The Angular 22 workspace that is the game. Run every command from this folder.

| Project               | Import            | Holds                                                                                       |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `projects/game`       | (the application) | The shell, the routes, the composition root and the global foundations                      |
| `projects/components` | `@atw/components` | One presentation component per design-system page ([README](projects/components/README.md)) |
| `projects/domain`     | `@atw/domain`     | The game and its rules: `questions/`, `tour/`, `classmates/`, `voice/`, `storage/`          |
| `projects/api`        | `@atw/api`        | Contracts, tokens, and the HTTP and SignalR clients for the backend                         |

| Task                                   | Command                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| Serve on http://localhost:4200         | `npm start`                                                      |
| Production build with budgets          | `npm run build`                                                  |
| Unit tests (Vitest)                    | `npm test`                                                       |
| Lint and format                        | `npm run lint`, `npm run format:check` (`npm run format` to fix) |
| Behaviour specs (Playwright, Chromium) | `npm run build && npm run e2e`                                   |
| End-to-end type check                  | `npm run e2e:typecheck`                                          |

The behaviour specs import `test` and `expect` from `e2e/fixtures/test.ts`, keep every
selector in a page object in `e2e/pages/`, and run against `dist/game/browser` served on
localhost. See `docs/adr/` for the decisions behind the workspace.
