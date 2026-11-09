# SCIP Project Completion Baseline

Baseline captured before application implementation work on 2026-11-07. Findings below are based on static source inspection unless a command result is explicitly stated.

## Repository protection

- Repository: `E:\projects\SCIP_MASTER`
- Branch: `main`
- HEAD: `8ebb8a28bd556cb991b07bfadfe73175d9b44976`
- Initial worktree status: 15 modified tracked files, no staged changes, and 225 untracked paths.
- Modified tracked paths: `.env.example`, `backend/.env.example`, `backend/package.json`, `backend/src/server.ts`, `backend/tsconfig.json`, `frontend/package-lock.json`, `frontend/package.json`, `package.json`, `src/server/app.ts`, `src/server/middleware/auth.ts`, and the root auth, incident, intelligence, miscellaneous, and report route modules.
- Untracked paths include frontend and backend source, tests, audit/completion documents, scripts and probe outputs, generated assets, and `data/db` files. The untracked `data/db` directory contains 81 WiredTiger/database files. These files are existing user data and were not opened, modified, or used.
- `.kilo/worktrees/fluff-earth` exists on branch `audit-scip-application-security` at the same commit as the main worktree; it has no tracked diff and one untracked file, `docs/security-report.md`. It was not modified. A second linked worktree branch, `vine-redcurrant`, is present.
- An `origin` remote and remote `origin/main` ref exist. No independent backup was verified; a Git remote or linked worktree is not treated as a backup.
- `.env` and `backend/.env` are ignored files. Their contents were not read. No environment values or secrets are recorded here.

The existing work is preserved as found; this baseline does not imply ownership of, or permission to replace, any pre-existing modifications or untracked files.

## Existing application and architecture

The active root application is `server.ts` → `src/server/app.ts` → root API route modules. Startup calls `initDatabase()` from `src/database/initMongo.ts`, which connects to MongoDB and checks health before listening. The root route handlers and authentication middleware still import the `db` singleton from `src/database/scipDatabase.ts`; its users, reports, incidents, analyses, notifications, feedback, and audit records are held in process memory. Consequently, successful Mongo startup does not mean root API records are persisted, and root API in-memory state is not durable across process restarts.

Mongo fixture initialization is separate from connection. Static inspection of the current Mongo adapter and its database-free test suite confirms the connection path does not seed or clear Mongo collections. Explicit fixture seeding is gated by the runtime development environment and explicit opt-in. The in-memory store has its own fixture initialization, and `/api/tests/run` calls its in-memory seed/reset routine behind development endpoint guards; that is separate from Mongo collection initialization.

`backend/src` is a separate Express/Mongoose service. Its auth and runtime integration tests connect to a local test MongoDB URI; its runtime integration test includes collection-wide cleanup operations. Neither the alternate service nor those database-backed tests were started or run.

The frontend is a React/Vite application with authentication, report, incident, intelligence, geospatial, notification, and administration views. The existing frontend completion report records API-backed trend data, report submission, and loading/error/empty states, but does not establish end-to-end behavior. The root and frontend manifests currently declare React 19, not the React 18 version stated in the project brief.

## Known issues and blockers

- Root API persistence remains volatile and route code is coupled to the synchronous in-memory singleton.
- Root startup requires MongoDB even though active API routes use in-memory storage.
- The root startup path does not load `.env` itself; it depends on environment variables already present in the process environment.
- The root API test endpoint resets in-memory fixtures when invoked; it was not invoked.
- The root API has no idempotency key for report creation and no persisted server-side token revocation path, according to the existing integration audit.
- Existing model/adapter parity gaps noted in the integration audit include password-hash projection for login, notification ownership filtering, and incident/assignment/resolution field mismatches.
- `README.md` contains default development credential material and preconfigured test-account details; values are intentionally not repeated here. This documentation should be reviewed before deployment.
- The root typecheck traverses files across project areas and currently fails. The frontend test script is a placeholder rather than a test suite. The alternate backend test script includes database-backed tests that are unsafe to run without a verified disposable database.
- The existing `dist` directories were present before validation. Standard build scripts that emit into those directories were not run to avoid overwriting pre-existing outputs.
- MongoDB data/index state, live route behavior, external deployment configuration, and full user journeys have not been verified.

## Baseline validation

Executed without starting an application server or connecting to MongoDB:

| Command | Result |
|---|---|
| `node --import tsx --test tests/mongoInitializationSafety.test.ts` (repository root) | Passed: 13 top-level tests, 15 total, 0 failed. Tests use controlled fakes; no MongoDB connection occurred. |
| `Set-Location backend; node --import tsx --test --test-reporter=spec tests/security_controls.test.ts` | Passed: 3 tests, 0 failed. |
| `Set-Location frontend; .\node_modules\.bin\tsc.cmd --noEmit` | Passed. |
| `Set-Location backend; npm run typecheck` | Passed (`tsc --noEmit`). |
| `npm run typecheck` (repository root) | Failed. Errors include unresolved imports in untracked root `TopBar.tsx`, Mongoose typing errors in alternate-backend test files, and Vite config/plugin type errors. No files were changed to work around these errors. |
| `Set-Location frontend; .\node_modules\.bin\vite.cmd build --outDir <unique system-temp directory>` | Passed. Existing `frontend/dist` was not overwritten. Vite emitted a CSS at-rule warning and a bundle-size warning. The temporary output directory was removed after the build. |

The root `npm run build` and alternate-backend `npm run build` were not run because their configured output directories already exist. The full alternate-backend test script was not run: it includes tests that connect to MongoDB and perform collection cleanup. No frontend browser/E2E tests were run. The prior frontend completion report records a build and typecheck, but those are not treated as fresh baseline executions.

## Database safety

- `data/db` exists as untracked user data; it was not read, opened, connected to, or modified.
- No MongoDB server, root server, or alternate backend was started.
- No migration, seed command, database-backed test, or collection operation was executed.
- The current root Mongo initialization path is statically separate from fixture seeding. Real database behavior and deployed indexes remain unverified.

## Recommended implementation sequence

1. Establish isolated disposable MongoDB test infrastructure and repository contracts without referencing `data/db`; do not connect until isolation and URI are independently verified.
2. Resolve schema/domain parity and migrate a small authentication/user slice behind injected asynchronous repositories, preserving routes and frontend contracts.
3. Migrate departments and audit logging, then reports and AI analyses, followed by notifications, incidents, assignments, resolutions, and feedback in dependency order.
4. Add repository, route, authorization, idempotency, and failure-path tests using fakes first; run Mongo integration tests only against a verified disposable database.
5. Re-verify frontend contracts, security controls, typechecks/builds, and deployment documentation. Do not remove the in-memory store until migrated workflows have passed their acceptance tests.

No application code was changed as part of this baseline.
