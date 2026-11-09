# SCIP Phase 2 — Backend & Frontend Integration Audit

**Audit date:** 2026-11-07  
**Scope:** Began with a read-only source review. After the audit, the user approved a narrowly scoped security-containment change (Phase 2.1), which was implemented and unit-tested without MongoDB access. No `.env` contents, credentials, or personal data were read or included.

## Executive result

**End-to-end operation is not verified and the current root application still has blocking production risks.** The README and root startup describe a MongoDB-backed integrated service, but the root route handlers use a separate process-memory `SCIPDatabase`. The root startup connects to MongoDB, but active API operations do not use the Mongo adapter. Mongo initialization no longer seeds or clears data automatically; fixture seeding is now a separate, explicitly gated development operation. Reports, users, incidents, notifications, and audit records created through the root API remain volatile and are reset to in-memory fixtures on process restart.

The read-only pass found critical registration and password-verification risks. After explicit approval, Phase 2.1 fixed public signup to citizen-only, removed the fixed-password fallback, and restricted demo/reset routes to explicitly enabled development requests from loopback. Focused non-database tests passed for those controls. Logout still has no server-side token revocation, and seeded demo accounts/default development JWT configuration remain risks to address.

## Phase 2.1 approved security containment

Implemented after the read-only investigation:

- Registration validation permits only the `citizen` role, the route assigns `citizen` regardless of request content, and the signup form no longer offers privileged role selection.
- Login now accepts only bcrypt verification against the stored password hash.
- `/api/auth/demo-login` and `/api/tests/run` are guarded by middleware requiring `NODE_ENV=development`, `ENABLE_DEV_ENDPOINTS=true`, and a loopback client address.
- Added `backend/tests/security_controls.test.ts` for citizen-only registration schema, bcrypt match/mismatch, and endpoint-gate behavior.

The focused unit tests and targeted type-check passed. The endpoint handlers were not exercised over HTTP, and no DB-backed tests were run. These changes do not resolve persistence, seed data, token revocation, or full application integration.

Modified files for the approved Phase 2.1 work:

- `src/server/middleware/security.ts`
- `src/server/routes/authRoutes.ts`
- `src/server/routes/miscRoutes.ts`
- `src/server/auth/password.ts`
- `frontend/src/components/views/AuthModal.tsx`
- `backend/tests/security_controls.test.ts`
- `docs/PHASE2_INTEGRATION_AUDIT.md`

## Phase 2.2A MongoDB initialization safety

Implemented and verified without connecting to MongoDB, including the Phase 2.2A.1 follow-up:

- `MongoDatabase.connect()` only connects; it no longer checks for a missing user collection or invokes fixture seeding.
- Removed the seed-on-empty path and the collection-wide `deleteMany({})` calls from the Mongo adapter.
- Mongo fixtures can be seeded only by an explicit `seedDatabase()` invocation when the actual `process.env.NODE_ENV` is exactly `development` and `process.env.ENABLE_DEV_FIXTURE_SEEDING` is exactly `true`. Missing, empty, production, and other values reject before connecting; authorization values cannot be supplied by callers.
- Seeding is add-only: it checks fixture IDs, inserts missing records, skips only a duplicate-key race matching the configured fixture identifier field and value, and reports other duplicate-key conflicts with their conflicting unique fields. Existing AI analyses are preserved; fixture analysis uses insert-only creation, while normal reanalysis retains its existing upsert behavior.
- Fixture repository dependencies are injectable for database-free tests; the production adapter still binds them to the Mongoose models. Per-instance calls are serialized, and unique indexes protect cross-process insertion races.
- Mongo connection failure propagates without seed/reset fallback.
- The root `SCIPDatabase` still seeds its separate in-memory store on construction. That is not MongoDB initialization or persistent database seeding and remains a separate data/architecture issue.

Database-free checks:

- `node --import tsx --test tests/mongoInitializationSafety.test.ts` — **13 top-level tests, 15 total tests passed, 0 failed**.
- `node_modules\.bin\tsc.cmd --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution bundler --strict --skipLibCheck --esModuleInterop --allowImportingTsExtensions --types node src\database\mongoDatabase.ts src\database\initMongo.ts tests\mongoInitializationSafety.test.ts` — **passed**.
- The complete runtime eval plan was **NOT TESTED** in this phase because it starts a Vite server, which the approved safety scope prohibits.

No MongoDB process, database, seed operation, migration, or database-backed test was run.

## Status definitions

- **VERIFIED** — executed and observed.
- **STATICALLY VERIFIED** — inspected in source; not executed against the live service.
- **NOT TESTED** — not executed.
- **BLOCKED** — not tested because safe isolation could not be established.
- **FAILED** — executed and failed.

## A. Application architecture and startup

| Item | Finding | Status |
|---|---|---|
| Intended integrated development command | Root `npm run dev` invokes `tsx server.ts`. The root README describes this as the integrated app. | STATICALLY VERIFIED |
| Root entry point | `server.ts` respawns itself with `node --import tsx`, then imports `startServer` from `src/server/app.ts`. | STATICALLY VERIFIED |
| Root listening port | `PORT`, if supplied; otherwise `3000`. It listens on `0.0.0.0`. | STATICALLY VERIFIED |
| Frontend dev server/proxy | `frontend/vite.config.ts` runs on `5173` and proxies `/api` to `http://localhost:3000`, which matches the root service, not the alternate backend. | STATICALLY VERIFIED |
| Root database initialization | `src/server/app.ts` calls `initDatabase()` before listening. `src/database/initMongo.ts` connects Mongoose to `MONGODB_URI` or a local fallback. | STATICALLY VERIFIED |
| Actual API data store | Root route modules import `src/database/scipDatabase.ts`, whose exported singleton holds Maps and arrays and seeds itself in its constructor. Routes do not use `getDb()` or `MongoDatabase`. | STATICALLY VERIFIED |
| Mongo dependency behavior | The root server refuses to start if MongoDB initialization fails, although route handlers use the separate in-memory store. | STATICALLY VERIFIED |
| Alternate backend | `backend/package.json` starts a separate Express 5 service from `backend/src/server.ts`, default port `5000`, with Mongoose models. Its app mounts auth, reports, incidents, notifications, and health only. It is not the target of the current Vite proxy and does not expose the root intelligence/admin/feedback routes. Its deployment status is not established by this repository review. | STATICALLY VERIFIED |
| Root env-file loading | Root `server.ts` and `src/server/app.ts` do not call `dotenv.config()` or use a Node `--env-file` option. A local `.env` file exists, but was intentionally not read. Root startup therefore depends on inherited environment values or code defaults; the README instruction to copy `.env` does not itself load that file in the root startup path. | STATICALLY VERIFIED |
| Root `npm start` / production build | Root `start` runs `node server.ts`, which still respawns through `tsx`; `tsx` is a root dev dependency. Root `build` only runs Vite and does not compile a backend artifact. | STATICALLY VERIFIED |
| Alternate backend startup | `cd backend; npm run dev` runs `tsx watch src/server.ts`; `npm start` expects `dist/server.js`, produced by its TypeScript build. It defaults to port `5000`. | STATICALLY VERIFIED |

### Environment variable names

Names only; no values are included.

- Root service: `PORT`, `NODE_ENV`, `JWT_SECRET`, `MONGODB_URI`, `CORS_ORIGINS`, `TRUST_PROXY`, and `ENABLE_DEV_ENDPOINTS`.
- Root `.env.example` also declares `FRONTEND_URL`, `JWT_EXPIRES_IN`, refresh-token settings, `VITE_API_BASE`, and optional service keys. The API client uses relative `/api/...` URLs and Vite's fixed proxy; `VITE_API_BASE` is not used by that client.
- Alternate backend: `MONGODB_URI`, `JWT_SECRET`, and optional `PORT`; its server calls `dotenv.config()`.
- Root startup falls back to local MongoDB and a development JWT secret when the corresponding variables are absent outside production. Production startup requires a non-default JWT secret of at least 32 characters.

### Active root routes

`src/server/app.ts` mounts `/api/auth`, `/api/reports`, `/api/incidents`, `/api/intelligence`, `/api/admin`, and `/api` (misc routes). Although those route modules exist and are mounted, their data source is the process-local singleton, not the connected Mongo database.

## B. Frontend-to-backend endpoint verification

All rows below refer to the **active root route tree**, unless explicitly marked for the alternate service. “Verified” execution was limited to the isolated test described in Section F; it does not mean full user workflow coverage.

| Frontend capability / endpoint | Root contract and authorization | Status |
|---|---|---|
| `POST /api/auth/register` | Returns `{ data: { user, token } }`; schema and handler now permit/assign only `citizen`, and the signup form sends no role. | Schema VERIFIED by focused unit test; route-level request NOT TESTED |
| `POST /api/auth/login` | Returns `{ data: { user, token } }`; login verifies only the stored bcrypt hash. | Password helper VERIFIED by focused unit test; successful login endpoint NOT TESTED |
| `GET /api/auth/me` | Protected by JWT middleware; user is looked up from the server-side in-memory store. | VERIFIED for malformed, expired, and wrong-signature tokens; missing-token and valid-token cases NOT TESTED |
| `POST /api/auth/logout` | Authenticated route writes an audit log but does not revoke server-side JWTs. | STATICALLY VERIFIED; the apparent test assertion returned early because its expected test account was absent |
| `GET /api/reports` | Authenticated; citizens are constrained to their own reports; supports category/status/urgency/`myOnly`, no pagination. | STATICALLY VERIFIED |
| `POST /api/reports` | Authenticated, `report.create`, Zod validation; creates a record, runs local analysis, returns `{ data: { report, analysis } }`. | Invalid-body test was skipped due to missing expected test account; successful creation/persistence NOT TESTED |
| `GET /api/reports/:id`, `PUT /api/reports/:id` | Authenticated; citizens are ownership-checked; detail returns `{ report, analysis }`. | STATICALLY VERIFIED |
| `POST /api/reports/:id/reanalyze` | Requires `intelligence.read`; response `data` is an `AIAnalysis` directly. | STATICALLY VERIFIED |
| `GET /api/incidents`, `GET /api/incidents/:id` | Authenticated; filters are status/category/priority; detail returns `{ incident, linkedReports }`. | STATICALLY VERIFIED |
| `POST /api/incidents/from-cluster` | Requires `incident.create`; creates from supplied cluster data. | STATICALLY VERIFIED |
| `POST /api/incidents/:id/review` | Restricted to authority/admin; action and notes are checked in route code. | STATICALLY VERIFIED; denial/success NOT TESTED |
| `POST /api/incidents/:id/resolve` | Restricted to officer/authority/admin. | STATICALLY VERIFIED; denial/success NOT TESTED |
| `POST /api/intelligence/agent`, `GET /api/intelligence/clusters`, `/hotspots`, `/trends` | Agent/clusters/hotspots require `intelligence.read`; trends requires `analytics.read`. All use process-memory data. | STATICALLY VERIFIED |
| `GET /api/admin/users` | Requires `user.read`; user listing strips password hashes in the root store. | STATICALLY VERIFIED |
| `PUT /api/admin/users/:id/role` | Requires `admin.manage`; request body has no role enum validation at the route. | STATICALLY VERIFIED |
| `GET /api/admin/departments` | Requires authentication, but no admin-only permission. | STATICALLY VERIFIED |
| `GET /api/admin/audit-logs` | Requires `audit.read`. | STATICALLY VERIFIED |
| `GET /api/admin/system-stats` | Requires authority/admin role; reports memory-store counts with status string `CONNECTED_IN_MEMORY_PERSISTED`. | STATICALLY VERIFIED; status wording is misleading |
| `GET /api/notifications`, `PUT /api/notifications/:id/read`, `POST /api/notifications/read-all` | Authenticated; list and mutation methods filter by authenticated user ID. | STATICALLY VERIFIED |
| `POST /api/feedback` | Authenticated; validates rating and requires report or incident ID. | Invalid-body test was skipped due to missing expected test account; successful submission NOT TESTED |
| `POST /api/tests/run` | Resets the in-memory singleton via `seedDatabase()`, but now requires explicit development mode, `ENABLE_DEV_ENDPOINTS=true`, and loopback. | Gate VERIFIED by focused unit test; route NOT TESTED |
| `POST /api/auth/demo-login` | Issues a selected role token, but now requires explicit development mode, `ENABLE_DEV_ENDPOINTS=true`, and loopback. | Gate VERIFIED by focused unit test; route NOT TESTED |

The alternate `backend/src/app.ts` does not mount the root intelligence, admin, feedback, or `/api/tests/run` endpoints. It also has different reports/incidents response envelopes and pagination behavior. Its tests and contracts must not be used as evidence that the root frontend integration works.

## C. Authentication and authorization findings

### Confirmed controls

- Root JWT verification restricts the algorithm to HS256 and loads the current user from the server-side store instead of trusting the JWT role claim.
- Root middleware returns 401 for missing/malformed/expired/wrong-signature tokens. The isolated test run exercised malformed, expired, and wrong-signature cases; missing-token rejection is static-only.
- Root admin user listing, role updates, audit logs, and system statistics have server-side permission/role checks. Incident review and resolution also have route-level role checks.
- Notification listing and mark-read logic scope records by the authenticated user ID.
- The frontend stores the bearer token and cached user in `localStorage`, sends the token in `Authorization`, and clears local state on 401.
- Public registration now assigns only citizen access; focused tests verified the schema rejects privileged roles.
- Login now accepts only bcrypt verification against the stored password hash; focused tests verified match and mismatch behavior.
- Demo-login and test-reset routes require explicit development configuration and a loopback client address; focused tests covered denied and allowed gate cases.

### Confirmed risks and gaps

1. **HIGH — documented seed accounts may remain usable.** The root singleton seeds fixture users on startup, and the repository README advertises preconfigured accounts. The fixed-password fallback is removed, but fixture hashes and production seed policy were not verified. Disable demo users in production and rotate any credentials that may have been exposed. Files: `src/database/scipDatabase.ts`, `src/database/seedData.ts`, `README.md`.
2. **HIGH — known development JWT fallback if production is not explicitly selected.** `src/server/middleware/auth.ts` uses a fixed development fallback when no secret is configured and `NODE_ENV` is not exactly `production`; root startup does not load `.env`. Production must explicitly set `NODE_ENV=production` and a unique strong `JWT_SECRET` through process environment.
3. **HIGH — logout does not invalidate server tokens.** The logout route only logs an event and the JWT middleware has no revocation state. The apparent test returned early because its expected user was absent, so this is static-only. Tokens remain valid until expiry or account state changes.
4. **HIGH — root API writes are volatile and can be lost.** See persistence findings in Section D.
5. **HIGH — Mongo seed-on-empty can clear every modeled collection when the user count is zero.** See database safety findings in Section E.
6. **MEDIUM — client startup trusts cached identity.** `AuthContext` restores the cached user/token without calling `/api/auth/me`; the API client has no `/me` method. Tampering with local storage can misrepresent client-side role/UI until a protected API request rejects the token. Server-side authorization remains authoritative.
7. **MEDIUM — admin role-change body has no server schema validation.** The endpoint is permission-protected, but it accepts any truthy `role` value and passes it to the store. Validate against `UserRole` and reject invalid values.

## D. Report persistence, incidents, and intelligence

### Report flow

The report form's fields align with the root Zod schema: title (5–200 chars), description (10–5,000), category enum, optional subcategory, location name, latitude/longitude bounded to geographic ranges, and optional urgency. The frontend validates these values before calling `api.createReport()`. The root response contains `data.report.id`, which is what the frontend requires before confirming creation.

However, the root route imports `db` from `src/database/scipDatabase.ts`. That singleton stores reports in a `Map`; it does not use Mongoose. `createReport()` adds the record to the Map before synchronous TF-IDF/classification/analysis. Thus:

- The successful workflow and My Reports were **NOT TESTED** end-to-end.
- Data created through the root API is lost when that process exits; Mongo connection does not make these route writes durable.
- If synchronous analysis throws after the Map insertion, the route can return 500 even though the report remains in the current process. The UI then displays an error, and a user retry can create another report. There is no idempotency key or rollback.
- The client prevents duplicate concurrent submissions in the same component, but that does not make server retries idempotent.
- `GET /api/reports?myOnly=true` filters to the authenticated citizen ID, and the frontend's `getMyReports()` uses this supported filter. This is correct statically, but uses the same volatile store.

### Incidents and intelligence

- Incident list/detail/review/resolve routes and frontend mappings match the root route shapes on static inspection. Successful creation, review, and resolution were not exercised.
- Clusters, hotspots, trends, and agent data are computed from the process-memory seeded reports/incidents, not Mongo documents. The `SCIPDatabase` constructor seeds fixture users/reports/incidents on import, so the ordinary root API does not expose a genuinely empty database state. No seed/demo marker is visible in the frontend response contracts.
- Trend totals and count maps are calculated from the current in-memory collections. SLA, weekly velocity, and lifecycle charts are not in the trend response and are not displayed by the frontend.
- The local AI/ML code does include evidence strings, tool results, and a human-review disclaimer. It is deterministic TypeScript logic, not evidence of a connected external AI service.
- The agent briefing reports a fixed `confidence: 0.88` irrespective of tool results (`src/ai/scipAgent.ts`). The geospatial agent tool uses fixed coordinates rather than resolving a location from the query. These values should not be presented as calibrated or query-specific confidence/location estimates.
- Report risk analysis sets the recurrent-hotspot input from whether a location name contains `"sector 4"` (`src/database/scipDatabase.ts`), which is a fixed name-based heuristic, not verified historical recurrence.

## E. Admin, notifications, and database safety

- Admin routes have route-level permission checks for users, role changes, and audit logs; system stats restricts to authority/admin. Departments are readable by any authenticated user. Department management/write endpoints are absent.
- Notification list/read/all-read methods scope by authenticated user ID in the root store. Persistence across restart is not provided by the active routes.
- Feedback is validated and tied to the authenticated user in the route. Successful submission was not executed.
- Root startup initializes MongoDB, but route data remains in memory. Mongo initialization now performs no seeding or collection deletion. Explicit fixture seeding is gated to development plus `ENABLE_DEV_FIXTURE_SEEDING=true`, checks for existing fixture IDs, and only inserts missing fixture records.
- The separate root in-memory `SCIPDatabase` still seeds fixture data on import; it does not persist to Mongo and is not changed by Phase 2.2A.
- A local `.env` exists, but its contents were not read. The effective database selected by the current process environment cannot be proven safe from source alone. Root startup was therefore not run.

## F. Runtime and automated test results

### Executed

Command run from `backend/`: `..\node_modules\.bin\tsx.cmd --test tests/security.test.ts`

This test imports the active root `createApp()` and tests its in-memory singleton; it does not call `startServer()` or initialize MongoDB.

- **VERIFIED:** Malformed, expired, and wrong-signature tokens were rejected with 401.
- **VERIFIED:** Registration body validation rejected invalid registration data; ordinary valid registrations returned 201 before the rate-limit assertion failed.
- **NOT TESTED:** The report/feedback body-validation, incident denial, and logout test cases returned early because their conditional logins referenced fixture accounts not present in the active in-memory seed.
- **STATICALLY VERIFIED:** The logout handler has no token revocation mechanism.
- **FAILED:** Two rate-limit test assertions expected production limits while `NODE_ENV=test` selects non-production limits: login expected 429 but received 401 at the test's eleventh request; registration expected 429 but received 201 at its sixth request. The configured non-production limits are higher than those asserted.
- **FAILED / incomplete process teardown:** TAP displayed 10 passing cases and 2 failing cases. Five of those “passing” cases returned early without making the intended protected API request; only five passing cases contained assertions that executed. The process remained alive after test output and was stopped. The test calls `createApp()` (which creates Vite middleware) but its teardown closes only the Express listener.

After the approved Phase 2.1 changes:

- **VERIFIED:** `node_modules\.bin\tsx.cmd --test backend\tests\security_controls.test.ts` passed all 3 focused, database-free tests for citizen-only registration, bcrypt password comparison, and development endpoint gating.
- **VERIFIED:** Targeted TypeScript checking of the changed security modules and focused test passed.
- **VERIFIED:** From `frontend/`, `npm run build` and `npx tsc --noEmit` passed. The build emitted existing CSS keyframe and large-chunk warnings.
- **VERIFIED:** Standalone eval-plan replay passed root build, frontend typecheck, focused security tests, and an HTTP 200 from the frontend Vite home route. The test output showed 3 passed and 0 failed, although the validator did not parse Node's TAP counts and used its exit-code fallback.
- **FAILED:** Root `npm run typecheck` reports workspace errors in the root `TopBar.tsx` imports, alternate-backend test types, and Vite plugin configuration. The changed security modules had no remaining errors in the targeted check.

### Not executed / blocked

- Root server startup, MongoDB connection, report creation/persistence, successful report listing/details, registration against durable storage, incident success paths, populated intelligence, notifications, admin workflows, and feedback success: **BLOCKED** until the database target is proven isolated and disposable.
- Alternate-backend MongoDB tests: **BLOCKED**. They connect to named local test databases and perform writes; some teardown operations broadly delete AIAnalysis/RiskScore collections. The presence of test names alone is not proof those databases contain no valuable records.
- `/api/tests/run`: **NOT TESTED**; code inspection showed it re-seeds the active process database. The new guard was unit-tested, but the route was not invoked.
- Browser console/network inspection, responsive layout, and frontend API-failure/retry flows: **BLOCKED** because the safe full-stack service was not started. The frontend-only Vite home route returned HTTP 200; this does not verify its `/api` proxy or backend workflows.
- Frontend `npm test`: the configured script is a placeholder that exits with “no test specified.”
- Phase 2.2A database-free Mongo initialization safety suite: **VERIFIED**, 8 tests passed; targeted TypeScript check **VERIFIED**. Neither check connected to MongoDB.

No browser console or network logs were collected.

## G. Security and reliability issue register

| Severity | Status | Confirmed issue | Exact files |
|---|---|---|---|
| HIGH | STATICALLY VERIFIED | Root fixture users are seeded on startup while the README advertises preconfigured accounts; their password hashes and production seed policy were not verified. | `src/database/scipDatabase.ts`; `src/database/seedData.ts`; `README.md` |
| HIGH | STATICALLY VERIFIED | A known development JWT fallback is used if no secret is configured and `NODE_ENV` is not exactly `production`; root startup does not load `.env`. | `src/server/middleware/auth.ts`; `server.ts`; `src/server/app.ts` |
| LOW | VERIFIED (gate unit test) | Demo-login and test-reset routes remain capable of role issuance/reset only when explicitly enabled in development on loopback; HTTP route behavior was not tested. | `src/server/middleware/security.ts`; `src/server/routes/authRoutes.ts`; `src/server/routes/miscRoutes.ts` |
| HIGH | STATICALLY VERIFIED | Root route writes are process-memory-only despite Mongo connection; all submitted records disappear on process restart. | `src/server/app.ts`; `src/server/routes/authRoutes.ts`; `src/server/routes/reportRoutes.ts`; `src/server/routes/incidentRoutes.ts`; `src/server/routes/intelligenceRoutes.ts`; `src/server/routes/adminRoutes.ts`; `src/server/routes/miscRoutes.ts`; `src/database/scipDatabase.ts`; unused adapter `src/database/mongoDatabase.ts` |
| LOW | VERIFIED (database-free tests) | Explicit development fixture seeding remains available behind an opt-in and adds missing fixtures only; it is not part of Mongo connection initialization. | `src/database/mongoDatabase.ts`; `src/database/initMongo.ts`; `tests/mongoInitializationSafety.test.ts` |
| HIGH | STATICALLY VERIFIED | Logout does not revoke a token; the same token remains valid until expiry. The prior test case did not execute its assertion. | `src/server/routes/authRoutes.ts`; test harness `backend/tests/security.test.ts`; frontend local logout `frontend/src/context/AuthContext.tsx` |
| MEDIUM | STATICALLY VERIFIED | Agent briefing has a fixed confidence value; geospatial analysis is anchored to fixed coordinates; report recurrence uses a hardcoded location-name heuristic. | `src/ai/scipAgent.ts`; `src/database/scipDatabase.ts` |
| MEDIUM | STATICALLY VERIFIED | Admin role-change endpoint does not validate the requested role value against the role enum. | `src/server/routes/adminRoutes.ts`; `src/database/scipDatabase.ts` |
| MEDIUM | STATICALLY VERIFIED | Client hydrates auth state from local storage without verifying `/api/auth/me`; no frontend `/me` API method. | `frontend/src/context/AuthContext.tsx`; `frontend/src/services/apiClient.ts` |
| LOW | FAILED | The active-server rate-limit test expects production thresholds while running in test mode; test teardown leaves Vite resources alive. | `backend/tests/security.test.ts`; `src/server/middleware/security.ts`; `src/server/app.ts` |

## H. Missing functionality / contract gaps

1. Durable persistence is missing from the active root route implementation despite a Mongoose adapter being initialized.
2. The alternate `backend/src/app.ts` lacks intelligence, admin, feedback, and automated-test endpoints used by the full frontend. It is not the Vite proxy target.
3. Department write/management endpoints are not implemented.
4. No frontend or backend idempotency mechanism exists for report creation.
5. Auth token revocation/session invalidation is not implemented.
6. No calibrated agent confidence derivation is implemented; the current briefing value is fixed.
7. Current root in-memory store seeding makes a true empty API-store experience unavailable without changing `SCIPDatabase` initialization; Mongo itself is no longer automatically seeded.

## I. Recommended fixes, in priority order

1. **Close remaining authentication exposure:** remove or explicitly gate fixture users in production, rotate any documented test credentials, require explicit production configuration and a unique JWT secret, and implement server-side logout/revocation. Citizen-only signup, bcrypt-only password verification, and the development endpoint gate are already implemented and unit-tested.
2. **Resolve the active data architecture:** make every root route and auth middleware use one selected database adapter. Ensure normal API reads/writes are durable and that API-reported database health reflects the actual backing store.
3. **Mongo initialization safety is addressed in Phase 2.2A:** do not restore automatic seeding or reset behavior. Any future fixture seeding must remain explicit, development-only, opt-in, and add-only.
4. **Add reliable report submission semantics:** persist the report before optional analysis, return an unambiguous creation result if analysis fails, add idempotency/request deduplication, and test that retry does not duplicate records.
5. **Validate authorization request bodies:** enforce role enums on admin role changes; verify sensitive account creation is approval-controlled.
6. **Improve analytical honesty:** derive or omit agent confidence, resolve geospatial queries from user input or label fixed-area results, and remove/validate name-based recurrence heuristics. Clearly mark seed/demo records in data and UI.
7. **Separate and document the alternate backend contract:** decide whether it is maintained/deployed; align its endpoints/response shapes or stop presenting it as the full frontend backend.
8. **Repair the safe test harness:** align rate-limit assertions with test configuration, close the Vite server during teardown, and add tests around logout invalidation, report idempotency, and in-memory-vs-Mongo persistence.
9. **Only then run full integration/browser checks** against a dedicated disposable MongoDB instance/database with no production credentials/data. Include successful CRUD, role matrix, empty/populated data, browser network/console checks, and responsive layout checks.

Phase 2.1 security containment and Phase 2.2A Mongo initialization safety were implemented within their respective approved scopes. MongoDB persistence integration, route rewrites, migrations, and database-backed integration tests remain unstarted and require explicit approval plus a confirmed isolated database strategy.
