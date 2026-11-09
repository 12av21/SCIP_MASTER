# Known Limitations

## Persistence and runtime

- The root API initializes MongoDB, but active business routes still use the in-memory `SCIPDatabase`. In-memory changes are lost when the process exits.
- No server or database was started for this task. Live authentication, report submission, incident management, notifications, and admin workflows remain unverified.
- Do not use the development test endpoint on shared data. It resets and seeds the in-memory store and now requires local-development conditions, explicit fixture-seeding opt-in, authentication, and an admin role.

## Security verification

- Fixture-based tests confirm citizen incident linked-report filtering and test-route middleware protections. They do not prove all authorization behavior in a running server.
- Route-level checks do not replace a broader authorized/unauthorized integration suite.
- No production security certification or live deployment verification was performed.

## TypeScript and build checks

- The `frontend/` package TypeScript check and production build passed. The active root app production build also passed to a temporary output directory. Build output included CSS/keyframes (frontend package) and large JavaScript chunk warnings.
- Root `npm run typecheck` still fails on the root-level untracked `TopBar.tsx`, alternate-backend test typing issues, and `frontend/vite.config.ts` plugin/config typing. These errors are outside the frontend-only typecheck.
- The alternate `backend/` application is separate from the active root API and was not changed or runtime-tested as part of this final verification.

## Deployment and demonstration

- No deployment was performed. A live local demonstration is blocked until an isolated disposable MongoDB target is explicitly approved and configured.
- The root `npm run dev` command starts the API and triggers database initialization; it must not be used with an existing or production database.
- Do not assume demo credentials, fixture accounts, or role impersonation are available.

## Next safe steps

1. Provide an approved disposable database environment and confirm its target independently.
2. Resolve the root TypeScript blockers, beginning with the stray root `TopBar.tsx` and the existing alternate-backend/Vite configuration diagnostics.
3. Add isolated API integration tests for registration/login, report ownership and status permissions, incident visibility, notifications, and admin restrictions.
4. Validate the existing in-memory versus Mongo persistence architecture as a separate approved migration phase; do not combine it with security fixes.
5. Only then perform a live demonstration using synthetic users and data.
