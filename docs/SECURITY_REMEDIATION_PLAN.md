# Security Remediation Plan

## Executive summary

The repository contains two distinct backend code paths:

- The root application: [server.ts](../server.ts) → [src/server/app.ts](../src/server/app.ts)
- The alternate backend: [backend/src/server.ts](../backend/src/server.ts) → [backend/src/app.ts](../backend/src/app.ts)

The source-authoritative app is the root backend. The alternate backend is separate and not proven to be live in the current deployment config. The highest-priority remediation is to close ownership leaks in the incident detail route and ensure report workflow transitions remain role-restricted. Development-only reset routes must remain isolated from production and must fail closed.

## 1. Prioritized remediation matrix

### Production-critical issues

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P0 | Citizen can access linked incident reports beyond their own ownership | ROOT + ALTERNATE | [src/server/routes/incidentRoutes.ts](../src/server/routes/incidentRoutes.ts), [backend/src/controllers/incidents.ts](../backend/src/controllers/incidents.ts) | Filter linked report data by the user’s allowed ownership and role before returning it; for citizens return only their own reports or a sanitized summary. | Unit/integration tests for citizen access to incident detail and linked report payload filtering. |
| P0 | Citizen can update workflow status through report mutation | ALTERNATE | [backend/src/controllers/reports.ts](../backend/src/controllers/reports.ts) | Enforce a role-scoped and state-machine-based update policy; reject any `status` mutation from `citizen` users. | Tests covering statuses by role and legal/illegal transitions. |

### Alternate-backend-only issues

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P1 | Department/ownership scoping not consistently enforced for officer queries | ALTERNATE | [backend/src/controllers/reports.ts](../backend/src/controllers/reports.ts), [backend/src/controllers/incidents.ts](../backend/src/controllers/incidents.ts) | Make access scope and search filters compositional instead of mutually exclusive; fail closed when department membership is missing. | Officer scoping tests with and without department assignment and search criteria. |

### Development-only risks

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P2 | `/api/tests/run` resets in-memory data | ROOT | [src/server/routes/miscRoutes.ts](../src/server/routes/miscRoutes.ts) | Restrict to loopback-only development environment, require explicit opt-in, and do not expose a reset path to the live app. | Guard tests verifying environment gating and fail-closed behavior. |
| P2 | Demo login path must remain local-only | ROOT | [src/server/routes/authRoutes.ts](../src/server/routes/authRoutes.ts) | Keep behind local development checks and never allow it to operate in production or under proxy trust. | Enforced local-only routing tests. |

### Architecture and persistence risks

| Priority | Finding | Backend | Affected files | Proposed fix | Required tests |
|---|---|---|---|---|---|
| P1 | Active routes still depend on in-memory persistence | ROOT | [src/database/scipDatabase.ts](../src/database/scipDatabase.ts), [src/server/app.ts](../src/server/app.ts), [src/server/routes](../src/server/routes) | Convert selected domains to repository-backed storage one slice at a time, while keeping the route contract stable. | Repository payload tests for a trusted isolated Mongo environment. |
| P1 | Dual-backend architecture creates deployment ambiguity | ROOT + ALTERNATE | [server.ts](../server.ts), [backend/src/server.ts](../backend/src/server.ts), [README.md](../README.md) | Choose and document one production backend; keep the alternate backend explicitly non-authoritative unless adopted. | CI/deployment contract review and documentation checks. |

## 2. Safe remediation sequence

1. Confirm the deployment target and authoritative backend.
   - Lock the root backend as the source-authoritative path.
   - Treat the alternate backend as separate and non-authoritative unless a deployment host or CI path explicitly adopts it.

2. Remediate the production-authoritative root app.
   - Fix the citizen-linked-report ownership leak in the incident detail route.
   - Recheck the report update route to preserve the citizen status block.

3. Remediate the alternate backend if retained.
   - Apply the same ownership filtering to incident details.
   - Block workflow-state mutations by citizens.
   - Intersect department scoping with searches rather than broadening access.

4. Add regression tests before broadening change scope.
   - Citizen cannot view other users’ linked reports.
   - Citizen cannot alter status fields.
   - Officer role filters interact correctly with search and department assignment.
   - Development-only guard routes fail closed outside local development.

5. Harden development endpoints.
   - Keep `POST /api/tests/run` local-only.
   - Remove or isolate any reset/seed path from non-dev environments.
   - Review demo-role login for loopback-only restrictions in production.

6. Prepare an isolated test environment.
   - Use a disposable Mongo database, not a shared dev database.
   - Validate route behavior in a non-production environment before any broader adoption.

7. Advance to repository design review only after the auth/security patch is stable.
   - Do not combine security hardening and Mongo migration in the same implementation phase.

## 3. Required validation gates

- Route/authorization tests for citizens, officers, and admins.
- Dev-only guard regression tests for env and local-IP conditions.
- Isolated database-backed verification in a disposable environment only.
- No broad migration work until the security fixes are merged and verified.

## 4. Recommended implementation phase

The next implementation phase should be:

- Security remediation for the authoritative backend
- Equivalent hardening for the alternate backend if retained
- Authorization regression tests
- Development endpoint hardening

The MongoDB migration and repository design work should follow only after these protections are complete and validated.

## 5. Safety restrictions

This plan intentionally excludes implementation and therefore does not start the backend, connect to MongoDB, or make code changes.
