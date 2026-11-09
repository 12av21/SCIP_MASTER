# Final Demo Guide

## Current demonstration status

A live application demo is **not currently safe or validated**. The root `npm run dev` command starts `server.ts`, and the active app initializes MongoDB at startup. Do not run it against an existing, shared, or production database. No backend server or database was started during this task.

The verified demonstration available now is a static frontend build:

```powershell
Set-Location frontend
npx tsc --noEmit
npm run build -- --outDir ..\.tmp-scip-frontend-build
```

Both commands passed during this task. They validate the separate `frontend/` package, not the root app entry point. The build is not an end-to-end application demo: API-backed actions cannot be represented as working without a running backend.

The active root app also built successfully without starting a server:

```powershell
npm run build -- --outDir .tmp-scip-root-build
```

That command was run after confirming the temporary destination did not exist. Select a fresh, empty temporary output directory if repeating it.

## Requirements before a live demo

Obtain approval for an isolated, disposable MongoDB instance and verify that the connection target is not an existing or production database. The root API currently uses in-memory storage for business operations, so its mutations are not durable even though MongoDB initialization runs.

After that approval:

1. Install root dependencies from the repository lockfile.
2. Create a private, ignored root environment file based on the root environment example. Set a strong private JWT secret and the verified disposable database URI. Never paste secret values into this guide, source control, or screenshots.
3. Keep fixture-seeding disabled by default.
4. Start the root application with `npm run dev` only after independently verifying the disposable database target. This command initializes the configured database.
5. Open the local URL printed by the server.
6. Register a synthetic citizen account; do not use demo accounts, real names, real contact details, or actual incident locations.
7. Demonstrate the citizen flow: logout/login, submit a synthetic report, view its report listing, and inspect notifications if returned by the API.
8. Demonstrate incident visibility with the citizen's own synthetic report only. The app should not expose unrelated linked reports.
9. Demonstrate staff-only intelligence, incident review, and administration only with separately authorized synthetic staff accounts in the isolated environment. Do not promote accounts or bypass server authorization for the demonstration.
10. Stop the application and handle disposal of the database through the approved environment owner. Do not use `/api/tests/run`; it resets in-memory data and is restricted to opted-in local development admins.

## Do not claim

- that the live user journeys are tested based on the successful static build
- that data persists after restart
- that seeded/demo accounts are available
- that the app is production-ready

If an isolated disposable database and authorized synthetic staff accounts are unavailable, limit the demonstration to the recorded TypeScript/build results and source review.
