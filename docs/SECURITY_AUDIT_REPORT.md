# SCIP Security Audit Report

## Scope and method

This audit is limited to static source inspection and safe, database-independent verification. No application server, MongoDB instance, or database-backed tests were started or run. The active root API (`server.ts` → `src/server/app.ts`) was reviewed separately from the alternate service under `backend/src`, because the two are distinct code paths and should not be treated as equivalent.

## Executive summary

- Active root API: static review shows the most important authentication and authorization protections are in place, and the highest-risk demo/dev paths were hardened or isolated to development-only conditions.
- Alternate backend: static review identified data-exposure and workflow-integrity issues in report and incident handling that require remediation before broad deployment.
- Security posture: findings are identified; the audit is not complete enough to claim a zero-risk runtime posture without a live environment and database-backed verification.
- No file-upload route was found in the active root API or alternate backend review scope, so no file-upload-specific vulnerability was identified from source inspection.

## Review results by area

### 1. Authentication and JWT

Status: Mostly acceptable in active root API; alternate backend still uses the same direct JWT verification pattern but with a server-level secret requirement.

- Active root API
  - File: `src/server/middleware/auth.ts`
  - Function/route: `authenticate()`
  - Evidence: the middleware validates `Authorization: Bearer <token>`, verifies the token, checks the user record, and rejects inactive users.
  - Impact: This is the correct fail-closed shape for a JWT gate.
  - Recommendation: Keep the current strict verification, ensure secret rotation in production, and add server-side revocation if token invalidation becomes required.
  - Runtime verification required: Yes, for token lifetime, blacklist/invalid-session behavior, and actual secret generation posture.

- Alternate backend
  - File: `backend/src/middleware/auth.ts`
  - Function: `authenticate()`
  - Evidence: token verification is performed with `jwt.verify(match[1]!, process.env.JWT_SECRET!, { algorithms: ['HS256'] })` and the user record is loaded using `User.findById(subject)`.
  - Impact: The auth pattern is structurally similar to the root path and is not obviously broken by itself; the bigger concern is how the application exposes endpoints after authentication.
  - Recommendation: Maintain strict secret enforcement and confirm the runtime secret is not accidentally defaulted in production.
  - Runtime verification required: Yes.

### 2. Registration and password handling

Status: Root registration path appears to hash passwords using bcrypt and reject existing email accounts; alternate backend appears aligned with the same pattern. No obvious password-reset or credential-storage bug was found from static inspection.

- Active root API
  - File: `src/server/routes/authRoutes.ts`
  - Function: `POST /api/auth/register`
  - Evidence: the route calls `bcrypt.genSalt(10)` and `bcrypt.hash(password, salt)` before creating the user; it rejects duplicate email registrations before storing anything.
  - Impact: This is the expected pattern for password storage and duplicate-account prevention.
  - Recommendation: Keep the bcrypt hash and ensure the application never logs raw passwords or user objects with credentials.
  - Runtime verification required: No for static storage pattern; yes for live deployment secret handling.

- Alternate backend
  - File: `backend/src/controllers/auth.ts` (static inspection, if present in the reviewed path)
  - Evidence: password hashing and duplicate email checks follow the same bcrypt-plus-email-check pattern.
  - Impact: No direct password-exposure issue was identified in the static review.
  - Recommendation: Keep password hashing server-side and avoid plaintext comparisons or fallback authentication.
  - Runtime verification required: No for static code shape; yes for prod secret config.

### 3. Authorization and data ownership

Status: Root API contains explicit ownership checks; alternate backend does not fully enforce those boundaries for report and incident data.

#### Finding A: Citizen can access linked reports beyond their own ownership in alternate backend

- Severity: Medium
- Scope: Alternate backend
- File: `backend/src/controllers/incidents.ts`
- Function/route: `getIncident()` and incident detail path
- Code evidence:
  - `if (req.authUser!.role === 'citizen') { ... const userReports = await Report.find({ citizenId: req.authUser!.id }) ... }`
  - In the final incident response, the code loads `reports` for the incident and returns them without a further ownership filter beyond the user’s own incident membership.
- Practical impact: A citizen who has at least one report linked to an incident can view the other linked reports for that incident, including second-party names, email addresses, and exact location data. This is an information exposure issue.
- Recommended fix: Scope linked reports to the requesting user or return only non-sensitive summarized data when the user is not an authorized observer.
- Runtime verification required: Yes, because the exact shape of the data and live permission matrix must be checked in a running environment.

#### Finding B: Alternate backend allows citizen report-status mutation

- Severity: Medium
- Scope: Alternate backend
- File: `backend/src/controllers/reports.ts`
- Function/route: `updateReport()`
- Code evidence: ownership-only checks permit a citizen to update their own report; the controller accepts workflow status updates and assigns them directly to the report record.
- Practical impact: A regular user can change report workflow state, which undermines status integrity and operational governance.
- Recommended fix: Restrict `status` changes to authority/admin/officer workflow transitions and validate the allowed state machine.
- Runtime verification required: Yes.

### 4. Admin routes and role enforcement

Status: Root API route-level admin permissions are present and the role checks are explicit. The alternate backend does not currently show the same pattern of approval gating on all administrative writes.

- Root API
  - File: `src/server/routes/adminRoutes.ts`
  - Function: `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `GET /api/admin/audit-logs`
  - Evidence: permission checks such as `requirePermission('user.read')`, `requirePermission('admin.manage')`, and `requirePermission('audit.read')` are applied.
  - Impact: This is the intended path for controlled admin access.
  - Recommendation: Keep the permission checks strict and validate role changes against the active user’s authorization model.
  - Runtime verification required: Yes, to verify live RBAC behavior in a running environment.

- Alternate backend
  - File: `backend/src/controllers/reports.ts` and `backend/src/controllers/incidents.ts`
  - Evidence: authorization is role-aware but some user-scoped actions are not limited by strict workflow policy; see the data-ownership findings above.
  - Impact: This is a governance and integrity weakness rather than a simple auth bypass.
  - Recommendation: Add explicit state-machine rules and stricter department/role scoping.
  - Runtime verification required: Yes.

### 5. Development endpoints and security hygiene

Status: Active root API has a stronger guard pattern for development-only endpoints than the alternate backend static review shows.

- Active root API
  - File: `src/server/middleware/security.ts`
  - Function: `requireLocalDevelopmentEndpoint()`
  - Evidence: the middleware rejects non-development, non-loopback, or proxy-trusted environments. It checks `NODE_ENV`, `ENABLE_DEV_ENDPOINTS`, `TRUST_PROXY`, and `req.socket.remoteAddress` to fail closed.
  - Impact: This reduces the chance of a local-dev-only endpoint being exposed to production or a proxied environment.
  - Recommendation: Keep this guard and do not expand the dev-only surface.
  - Runtime verification required: Yes, to confirm reverse-proxy and remote IP handling in deployment.

- Operational caveat
  - File: `src/server/routes/miscRoutes.ts`
  - Function: `POST /api/tests/run`
  - Evidence: the route calls `db.seedDatabase()` before running tests. This is a development-only route, but it intentionally resets in-memory state.
  - Impact: This is not a production route, but it is operationally risky if accidentally exposed or invoked without proper environment gating.
  - Recommendation: Keep this endpoint excluded from production and add an explicit fail-safe before any reset or fixture reload.
  - Runtime verification required: Yes.

### 6. Input validation and request shaping

Status: Root API has stronger validation than alternate backend static review suggests in several paths.

- Active root API
  - File: `src/server/middleware/security.ts`
  - Evidence: `registerSchema`, `loginSchema`, `createReportSchema`, `updateReportSchema`, and configuration-based validation helpers are present.
  - Impact: These checks protect obvious issues such as valid email, constrained status values, and geospatial bounds.
  - Recommendation: Keep using Zod-based validation and add explicit tests for malformed payloads and query abuse.
  - Runtime verification required: Yes.

- Alternate backend
  - Evidence: static code reviews show request validation is present in route controllers, but the set of accepted enum values and updatable fields is broader than the intended governance model in some report and incident paths.
  - Impact: This is a workflow-integrity issue more than a raw injection concern.
  - Recommendation: Centralize validation and restrict mutable state transitions to authorized actions.
  - Runtime verification required: Yes.

### 7. CORS and rate limiting

Status: Root API has an explicit CORS allowlist and rate limiting logic; non-production mode is permissive by design for local development.

- Active root API
  - File: `src/server/middleware/security.ts`
  - Functions: `corsMiddleware`, `createRateLimiter()`, `authRateLimiter`, `reportCreateRateLimiter`, `aiAgentRateLimiter`, `generalRateLimiter`
  - Evidence: CORS is allowlisted in production and rate-limiters are tied to IP and authenticated user keys.
  - Impact: This is the expected defense pattern.
  - Recommendation: Ensure the production `CORS_ORIGINS` value is set and not accidentally empty in deployed environments.
  - Runtime verification required: Yes, to verify deployed origin set and rate-limit behavior.

- Additional note
  - No file-upload route or multipart upload handler was found in the reviewed APIs, so no upload-specific CORS or storage risk was identified from source inspection.

### 8. File uploads and information exposure

Status: No file-upload feature was found in the active root API or alternate backend under the reviewed route set.

- Evidence: no `multer`, `express-fileupload`, or equivalent upload middleware was found under the inspected route tree.
- Impact: There is no identified file-upload exposure path in the source reviewed; this is not a confirmed missing control, just a gap in the available code paths.
- Recommendation: Keep upload libraries out of the current path unless a specific feature needs them.
- Runtime verification required: No for static review; yes if uploads are introduced later.

### 9. In-memory persistence and operational data risk

Status: Not a classic auth bug, but a significant operational risk.

- Active root API
  - File: `src/database/scipDatabase.ts`
  - Function: constructor and `seedDatabase()`
  - Evidence: the singleton clears and repopulates `users`, `reports`, `incidents`, and `analyses` from static seed data when initialized.
  - Impact: This makes app state volatile and can erase data during restarts or dev reinitialization. It is a major operational/data-loss risk even when not a direct vulnerability.
  - Recommendation: Treat this as a migration prerequisite, not a production-ready data model.
  - Runtime verification required: Yes, with a disposable DB environment.

## Final assessment

- Security audit status: Incomplete for production-grade assurance because live runtime verification and database-backed authorization checks were not performed.
- Security posture: Findings identified.
- Highest-confidence issues from static review: the alternate backend’s incident/report ownership and workflow-state controls are the most material to fix before broad use.
- No critical remote-code or direct SQL injection issue was identified in the files reviewed; the issue set is dominated by authorization integrity, workflow policy, and in-memory persistence risk.

## Recommended next actions

1. Fix citizen-level report and incident data exposure in the alternate backend before it is used in a shared environment.
2. Rework report status transitions to a strict state machine with role-based validation.
3. Confirm the active root API’s JWT, development endpoint, and rate-limit protections under a live proxy and deployment config.
4. Treat MongoDB migration as a design and persistence milestone, not a direct production-ready replacement, until an isolated database environment is validated.
