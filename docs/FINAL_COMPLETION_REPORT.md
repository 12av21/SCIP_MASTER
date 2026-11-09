# SCIP Phase 1 — MongoDB Persistence Completion Report

**Status:** Root API persistence migration implemented and build-verified. No application server was started and no MongoDB instance was contacted.

## Summary

The active root Express routes now use `ScipRepository`, backed by `MongoDatabase` and the existing Mongoose models. The root startup requires `MONGODB_URI`, verifies the connection and health check before listening, and fails closed on connection errors. There is no implicit local URI or fallback to `SCIPDatabase`.

No production data was accessed, migrated, imported, deleted, or overwritten. Startup does not seed data. Mongoose indexes are declared in model schemas and initialized without `syncIndexes()` or destructive schema reconciliation.

## Entity mapping

| Entity | Persistent model / collection | State |
|---|---|---|
| Users/accounts | `User` / `users` | Persisted; bcrypt hashes excluded from normal reads and API output |
| Roles/permissions | `User.role` / application permission matrix | Roles persist; permissions remain server-controlled |
| Community reports | `Report` / `reports` | Persisted; filtered/paginated reads, creation, and allow-listed updates |
| AI analysis | `AIAnalysis` / `aianalyses` | Persisted by report ID; analysis corpus loads from MongoDB at startup |
| Incidents | `Incident` / `incidents` | Persisted; linked report IDs and workflow fields use the active root data shape |
| Departments | `Department` / `departments` | Persisted reference data |
| Notifications | `Notification` / `notifications` | Persisted; reads and read-state updates are owner-scoped |
| Feedback | `Feedback` / `feedbacks` | Persisted with report/incident reference checks |
| Audit logs | `AuditLog` / `auditlogs` | Append/read only through active application flows |
| Assignments | `Assignment` / `assignments` | Mongoose-backed repository operations and reference checks; no active root route currently exposes assignment management |
| Resolutions | `Resolution` / `resolutions` | Persisted by incident; created by incident resolution workflow |
| Risk scores | `RiskScore` / `riskscores` | Mongoose-backed storage/query operations; no active root route currently exposes risk-score management |
| Spatio-temporal clusters | Computed from reports | Transient analysis result; not an existing persisted entity |

## Root routes migrated

- `/api/auth/*`: persistent user lookup/registration and audit events
- `/api/reports/*`: persistent listing, detail, creation, update, and re-analysis
- `/api/incidents/*`: persistent listing/detail, cluster creation, review, and resolution
- `/api/intelligence/*`: Mongo-backed report/incident snapshots for analyses
- `/api/admin/*`: persistent user, department, audit, and record-count reads
- `/api/notifications/*`, `/api/feedback`, `/api/health`: persistent operations and database health reporting

Authorization checks remain in the active middleware and handlers. Citizen report visibility and incident linked-report filtering are preserved. The old `/api/tests/run` implementation reset database state; it now returns HTTP 410 after its local-development, opt-in, authentication, and admin gates.

The legacy in-memory `SCIPDatabase` file remains for compatibility with the isolated authorization tests. No active root route or authentication middleware imports or calls it.

## Files created or modified

- Added `src/database/repositories/ScipRepository.ts`
- Updated `src/database/initMongo.ts` and `src/database/mongoDatabase.ts`
- Updated Mongoose entity schemas in `src/models/`
- Added `src/server/middleware/asyncHandler.ts` and `src/server/services/reportService.ts`
- Migrated root route handlers and auth middleware under `src/server/`
- Updated `.env.example` with blank connection/signing-secret placeholders
- Added `tests/reportService.test.ts` and `tests/persistenceConfiguration.test.ts`
- Added `docs/PERSISTENCE_ARCHITECTURE.md`; updated this report

## Verification

All commands were database-free; the server and external services were not started.

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `cd frontend; npx tsc --noEmit` | Passed |
| Frontend production build to `.phase1-frontend-build` | Passed; existing CSS at-rule and large-chunk warnings |
| Root production build to `.phase1-root-build` | Passed; large-chunk warning |
| Root authorization + mocked persistence + Mongo initialization safety tests | 32 passed, 0 failed |
| `git diff --check` | Passed; only existing line-ending warnings |
| Active root route scan for `SCIPDatabase`/singleton calls | No matches |

The two temporary build output directories were removed after verification. The test process used an ephemeral, process-local JWT test value; no secret was written to a file.

## Security and remaining limitations

- Connection failures abort startup and are not logged with a URI or credentials. Unexpected API errors return generic responses; duplicate-key conflicts and Mongoose validation failures map to 409 and 400.
- Roles are reloaded from MongoDB for authenticated requests. Password hashes are selected only for credential verification. Audit logs have no active update/delete route. Citizen notification updates include the authenticated user ID.
- Existing MongoDB records were not inspected. Legacy incident documents may not match the current root incident model and require a separately reviewed, non-destructive migration if such records exist.
- The new mocked tests do not validate live Mongoose queries. An isolated disposable MongoDB integration setup is documented in `docs/PERSISTENCE_ARCHITECTURE.md` but was not started or exercised.
- Multi-document workflows use application-level reference checks but are not yet wrapped in MongoDB transactions. A transient failure between writes may leave a partially completed workflow; transaction boundaries and replica-set integration tests remain follow-up work.
- Assignment and risk-score persistence exists at the repository/model layer but is not exposed by the active root API.

## Exact next phase

**Phase 2: isolated MongoDB integration and workflow reliability.** Independently verify a disposable, loopback-only MongoDB target; add and run integration tests for writes, referential integrity, uniqueness/index behavior, rollback/partial-failure handling, and persistence across restart. Assess existing collection shape only on that disposable target. Do not point Phase 2 at production or an unknown database.
