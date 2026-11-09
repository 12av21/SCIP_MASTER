# Backend Deployment Architecture Assessment

## Scope and method

This document is limited to source inspection and configuration review. No application server, database, or deployment target was started or connected; the assessment is based on the checked-in startup scripts, route wiring, and CI/CD configuration.

## Evidence reviewed

- Root entrypoint: [server.ts](../server.ts)
- Root app bootstrap: [src/server/app.ts](../src/server/app.ts)
- Root package manifest: [package.json](../package.json)
- Alternate backend entrypoint: [backend/src/server.ts](../backend/src/server.ts)
- Alternate backend app bootstrap: [backend/src/app.ts](../backend/src/app.ts)
- Alternate backend package manifest: [backend/package.json](../backend/package.json)
- GitHub Pages deployment workflow: [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml)
- Root environment template: [.env.example](../.env.example)
- Alternate backend environment template: [backend/.env.example](../backend/.env.example)
- Project docs: [README.md](../README.md)

## 1. Deployment architecture findings

### A. Root backend is the active app entrypoint in the repository

Evidence:

- [server.ts](../server.ts) is the repository root startup script and it imports the root app via `startServer()` from [src/server/app.ts](../src/server/app.ts).
- [package.json](../package.json) declares:
  - `dev`: `tsx server.ts`
  - `start`: `node server.ts`
  - `build`: `vite build`
- [README.md](../README.md) documents the root app as the full-stack server: “Starts full-stack Express server with integrated Vite middleware on port 3000”.
- [src/server/app.ts](../src/server/app.ts) mounts the active route tree under `/api/auth`, `/api/reports`, `/api/incidents`, `/api/intelligence`, `/api/admin`, and `/api` for the root service.

Conclusion: The repository’s current source-authoritative app boot path is the root service.

### B. The alternate backend is a separate application, not the current repository deployment target

Evidence:

- [backend/package.json](../backend/package.json) declares its own independent scripts:
  - `dev`: `tsx watch src/server.ts`
  - `start`: `node dist/server.js`
  - `build`: `tsc`
- [backend/src/server.ts](../backend/src/server.ts) starts a separate Express app and connects to its own MongoDB configuration via `connectDatabase()`.
- [backend/src/app.ts](../backend/src/app.ts) exposes a separate route tree: `/api/auth`, `/api/incidents`, `/api/reports`, `/api/notifications`.

Conclusion: The alternate backend is a second, independently bootable code path. It is not the same service as the root application and does not appear to be wired into the repository’s checked-in deployment workflow.

### C. No hosting configuration was found for either backend

Evidence reviewed:

- No `Dockerfile`, `docker-compose.yml`, `render.yaml`, `vercel.json`, `netlify.toml`, `Procfile`, or other deployment manifests were found in the repository root or the backend directory.
- The only deployment workflow present is [.github/workflows/deploy-pages.yml](../.github/workflows/deploy-pages.yml), which deploys the built frontend static asset output to GitHub Pages.

Conclusion: There is no checked-in evidence that either backend is currently deployed to Render, Vercel, Netlify, Docker, or another external platform. The deployment target is therefore not confirmed beyond the GitHub Pages static frontend build.

### D. Production-authoritative backend decision

Decision: ROOT backend.

Reasoning:

1. It is the source-authoritative entrypoint in the repo.
2. It is the only backend wired to the root application startup and route tree.
3. The root app and documentation describe a single full-stack platform, while the alternate backend remains a separate code path.
4. No checked-in deployment configuration proves the alternate backend is live in production.

Important nuance: the production deployment itself is not proven by repository config. The best evidence indicates the repository’s authoritative app is the root backend, while the actual remote deployment target remains UNKNOWN. The code path is root, but the platform hosting is not explicitly configured in-source.

## 2. Security finding reassessment

### Finding 1: Citizen access to linked incident reports

Affected routes:

- Root: `GET /api/incidents/:id` in [src/server/routes/incidentRoutes.ts](../src/server/routes/incidentRoutes.ts)
- Alternate: `getIncident()` in [backend/src/controllers/incidents.ts](../backend/src/controllers/incidents.ts)

Authentication requirements:

- Both routes require `authenticate` middleware.

Authorization requirements:

- Root route does not require a role gate for general listing, while the detail route performs no citizen ownership check before returning `linkedReports`.
- Alternate route does a citizen-only ownership check for the incident itself, but then returns linked reports without re-checking the requesting citizen’s report ownership.

Ownership check status:

- Root: no ownership check before returning linked reports.
- Alternate: partial incident ownership check, not full linked-report ownership scoping.

Confirming the issue:

- Root: confirmed by source inspection. The detail handler loads `linkedReports` from all reports for the incident and returns them without filtering by citizen ownership.
- Alternate: confirmed by source inspection. The controller loads related reports after the incident ownership gate and does not restrict the report set to the citizen’s own reports.

Reachability in intended deployment:

- Root: reachable in the active root app if the route is live.
- Alternate: likely reachable if that backend is used, but the checked-in deployment config does not show it is in production.

Runtime verification required:

- Yes. The exact data retrieved and the live permission matrix must be verified in a running environment.

### Finding 2: Citizen-driven report status mutation

Affected routes:

- Root: `PUT /api/reports/:id` in [src/server/routes/reportRoutes.ts](../src/server/routes/reportRoutes.ts)
- Alternate: `updateReport()` in [backend/src/controllers/reports.ts](../backend/src/controllers/reports.ts)

Authentication requirements:

- Both routes require authenticated user access.

Authorization requirements:

- Root: explicit citizen denial: `if (user.role === 'citizen' && Object.prototype.hasOwnProperty.call(req.body, 'status')) { ... 403 ... }`.
- Alternate: no equivalent denied transition check; if the report belongs to the citizen, status is accepted and persisted.

Ownership check status:

- Root: yes, owner-only update is enforced for citizens and the status field is explicitly blocked.
- Alternate: owner-only update is permitted but workflow status is not restricted.

Citizen can change privileged workflow fields?

- Root: no.
- Alternate: yes, confirmed by source inspection.

Reachability in intended deployment:

- Root: currently protected in the root app.
- Alternate: reachable if the alternate backend is used; no deployment config confirms its production use.

Runtime verification required:

- Yes, to confirm the deployed workflow policy and the exact allowed state transitions.

### Finding 3: Development test route and in-memory reset behavior

Affected route:

- Root: `POST /api/tests/run` in [src/server/routes/miscRoutes.ts](../src/server/routes/miscRoutes.ts)

Authentication requirements:

- The route does not require authentication.
- It calls `requireLocalDevelopmentEndpoint`, which is intended to restrict it to development-only loopback requests.

Authorization requirement:

- It is not role-based; it is environment-gated, not user-authorized.

Risk:

- `db.seedDatabase()` is invoked before the test suite runs. This resets in-memory state and is a destructive operational action from a developer route.
- The route is not a production-safe path and should not be reachable beyond local development.

Equivalent issue in alternate backend:

- Not identified in the checked-in alternate app route set reviewed here.

Reachability in intended deployment:

- Root: only reachable if the app is running in a development configuration and the request originates from a loopback address with the required env flags.

Status:

- Confirmed as a development-only operational risk. Not a production-critical vulnerability, but it must remain hard-gated and should be removed or made strictly explicit if retained.

## 3. Remediation matrix

### A. Production-critical issues

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P0 | Incident-linked report ownership leak | ROOT + ALTERNATE | [src/server/routes/incidentRoutes.ts](../src/server/routes/incidentRoutes.ts), [backend/src/controllers/incidents.ts](../backend/src/controllers/incidents.ts) | Apply ownership checks to linked report data and filter to the caller’s own report set or a non-sensitive summary for citizens. | Auth + ownership regression tests for citizen access to incident detail and linked reports. |
| P0 | Citizen workflow-state mutation | ALTERNATE | [backend/src/controllers/reports.ts](../backend/src/controllers/reports.ts) | Restrict `status` transitions to authorized roles and a valid workflow state machine; reject state changes from citizens. | Role-based update tests covering allowed and disallowed transitions. |

### B. Alternate-backend-only issues

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P1 | Alternate backend role-scoping inconsistency | ALTERNATE | [backend/src/controllers/reports.ts](../backend/src/controllers/reports.ts), [backend/src/controllers/incidents.ts](../backend/src/controllers/incidents.ts) | Centralize role and department scoping; intersect access scope with search filters rather than replacing one with the other. | Officer department scoping + search filter integration tests. |

### C. Development-only risks

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P2 | In-memory reset via `/api/tests/run` | ROOT | [src/server/routes/miscRoutes.ts](../src/server/routes/miscRoutes.ts) | Keep the endpoint development-only, require explicit opt-in, and remove or isolate any reset/seed operation from live APIs. | Guard tests verifying environment gating and reset refusal outside dev. |
| P2 | Demo login path | ROOT | [src/server/routes/authRoutes.ts](../src/server/routes/authRoutes.ts) | Keep behind local-only dev gate, and do not allow it to bypass normal auth or role checks in production. | Route guard tests for env and loopback enforcement. |

### D. Architecture and persistence risks

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P1 | Active routes still depend on in-memory persistence | ROOT | [src/database/scipDatabase.ts](../src/database/scipDatabase.ts), [src/server/app.ts](../src/server/app.ts), [src/server/routes/*.ts](../src/server/routes) | Keep MongoDB initialization separate from repository migration, then convert one domain at a time to repository-backed storage with validation. | Repository integration tests in isolated Mongo environment. |
| P1 | Dual-backend architecture creates deployment ambiguity | ROOT + ALTERNATE | [server.ts](../server.ts), [backend/src/server.ts](../backend/src/server.ts), [README.md](../README.md) | Document a single deployment target and freeze the alternate backend as non-production unless it is explicitly adopted. | Deployment documentation and CI contract checks. |

## 4. Recommended safe implementation sequence

1. Confirm the deployment target and authoritative backend.
   - Use the source evidence above to lock the root app as the repository’s runtime target.
   - Treat the alternate backend as an optional secondary service unless it is explicitly adopted.

2. Fix access-control issues in the production-authoritative backend first.
   - Resolve the linked-report ownership leak in the root incident detail route.
   - Verify the root report update route remains strict for citizen workflow edits.

3. Fix equivalent protections in the alternate backend if it remains in use.
   - Apply the same ownership and workflow protections to the alternate report/incident controllers.
   - Keep the fix scoped to route authorization; do not refactor the unrelated architecture while doing this.

4. Add authorization and ownership regression tests.
   - Citizen cannot view another citizen’s linked reports.
   - Citizen cannot change report status.
   - Officer scopes intersect with search conditions without accidental broad reads.

5. Harden development-only endpoints.
   - Keep `POST /api/tests/run` behind local-only, environment-checked, explicit dev gating.
   - Review demo auth routes and ensure they cannot be used in production or behind proxy trust settings.

6. Prepare isolated test infrastructure.
   - Use a disposable MongoDB environment and a non-production database name.
   - Validate the root app and the repository boundary without touching live data.

7. Perform MongoDB repository design review only after the security gate is closed.
   - Do not combine remediation with repository migration.
   - Keep the migration incremental and domain-by-domain.

## 5. Final decision

### Production-authoritative backend

ROOT

### Deployment evidence

- The repository root app is the runtime-authoritative app entrypoint.
- The GitHub Pages workflow deploys the static frontend bundle only.
- No checked-in Render/Vercel/Netlify/Docker config proves any live backend deployment.
- The alternate backend is a second project and should not be treated as the production target without explicit deployment evidence.

### Confirmed security findings

- Citizen-linked incident report access is a confirmed issue in both the root app and alternate backend.
- Citizen report status mutation is a confirmed issue in the alternate backend; the root app already blocks this.
- Development test route reset behavior is a confirmed development-only risk in the root app.

### Findings requiring runtime verification

- The exact exposure of linked incident report payloads in a running environment.
- The exact allowed report workflow transitions in the deployed production policy.
- Whether any external domain is currently serving the alternate backend.

### Recommended next implementation phase

Security remediation of the authoritative backend and the alternate backend if retained, followed by isolated authorization tests. Do not begin the MongoDB migration in the same phase.

## 6. Safety note

No source files were modified for this assessment, and no server, database, or deployment target was started.
