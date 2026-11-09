# Root Application MongoDB Persistence

## Scope and boundaries

This design applies to the active root TypeScript/Express application (`server.ts` and `src/server`). It does not change the separate `backend/` application. Root API handlers use the persistent `ScipRepository` contract returned by `getDb()`; `MongoDatabase` implements that contract with Mongoose models. `ReportService` owns report listing, visibility checks, and report workflow delegation. The legacy `SCIPDatabase` implementation remains only for existing isolated tests and is not imported by the active server routes or middleware.

No production data was migrated, imported, or read as part of this work. There is no startup seed, schema synchronization, destructive migration, or in-memory fallback.

## Entity and collection mapping

| Existing entity | Previous in-memory storage | Mongoose model / collection | Repository responsibility |
|---|---|---|---|
| Users and accounts | `users: Map<string, User>` | `User` / `users` | `ScipRepository`: lookup by ID/email, paginated listing, registration, role updates. Password hashes are selected only for verification and removed from serialized users. |
| User roles and permissions | `User.role`; permission matrix in auth middleware | `User` / `users`; permission matrix remains application code | `ScipRepository`: persist current role while existing server-side permission checks remain authoritative. |
| Community reports | `reports: Map<string, Report>` | `Report` / `reports` | `ScipRepository`: filtered/paginated reads, ownership queries, create/update, and application-level reference checks. |
| AI analysis results | `analyses: Map<string, AIAnalysis>` | `AIAnalysis` / `aianalyses` | `ScipRepository`: read by report ID and upsert analysis; recompute from persisted reports at runtime. |
| Incidents | `incidents: Map<string, Incident>` | `Incident` / `incidents` | `ScipRepository`: filtered/paginated reads, cluster creation, human review, resolution, linked-report updates. |
| Departments | `departments: Map<string, Department>` | `Department` / `departments` | `ScipRepository`: paginated reference reads and lookup for incident assignment/review. |
| Notifications | `notifications: Notification[]` | `Notification` / `notifications` | `ScipRepository`: per-user pagination, unread counts, create, and owner-scoped read-state updates. |
| Feedback | `feedbacks: Feedback[]` | `Feedback` / `feedbacks` | `ScipRepository`: validate report/incident references and persist feedback. |
| Audit logs | `auditLogs: AuditLog[]` | `AuditLog` / `auditlogs` | `ScipRepository`: append and filtered/paginated reads; no active update/delete operation. |
| Assignments | `assignments: Map<string, Assignment>` | `Assignment` / `assignments` | `MongoDatabase`: persist assignment records and validate incident, staff, and department references. |
| Resolutions | `resolutions: Map<string, Resolution>` | `Resolution` / `resolutions` | `ScipRepository`: persist resolution records with incident linkage. |
| Risk scores | `riskScores: Map<string, RiskScore>` | `RiskScore` / `riskscores` | `MongoDatabase`: persist/query scores with a unique entity-type/entity-ID key. |
| Spatio-temporal clusters | Computed output; not retained as a database entity | No collection | Recomputed from persisted reports by the intelligence pipeline. |

Collection names above were verified from Mongoose model metadata and follow its default model-name pluralization. Schema indexes declare uniqueness and the query paths used by active routes. Existing collections are not renamed or synchronized automatically.

## Repository and service responsibilities

- `ScipRepository` is the typed persistence contract shared by root route handlers.
- `MongoDatabase` implements that contract using Mongoose models, maps Mongoose documents to API types, caps page size at 100, and performs persistence operations.
- `ReportService` coordinates report pagination and enforces citizen ownership before returning report details.
- `asyncHandler` forwards asynchronous route failures to the centralized Express error handler.
- `SCIPDatabase` remains available for legacy test-only imports, but no root server route or auth middleware imports it.

The repository validates referential data before incident creation, review, resolution, feedback, and assignment. Report update inputs are allow-listed; route schemas strip/reject unexpected fields and validate request shapes.

## Connection lifecycle and environment

The root application uses `MONGODB_URI`, the existing project connection-string variable. It is required and must use `mongodb://` or `mongodb+srv://`. The database name is read from the URI path unless an explicit initializer option is supplied. There is no local default URI.

Startup sequence:

1. `startServer()` calls `initDatabase()` before constructing/listening on the HTTP server.
2. The initializer validates `MONGODB_URI`, connects through Mongoose, loads persisted report text for the in-process analysis vectorizer, and runs a health check.
3. Only a successful connection and health check set the active repository.
4. A failure is reported without logging the URI or credentials, then startup aborts. Requests never switch to the in-memory implementation.
5. SIGINT/SIGTERM close the Mongo connection during graceful shutdown.

`.env.example` contains blank connection and signing-secret values. Keep development, disposable-test, and production values in separate untracked environment files or secret stores. Do not copy a production URI into a local file.

## Error behavior and API protection

- Duplicate-key conflicts are reported as HTTP 409; Mongoose validation/cast failures are HTTP 400.
- Unexpected persistence failures return a generic HTTP 500 response. Logs include the route and error class, not database error messages, connection strings, or document content.
- Invalid/missing JWTs retain the existing HS256 verification behavior. The user record is loaded from MongoDB on every authenticated request, so role and suspension changes take effect without trusting token role claims.
- Existing permission/role checks remain in place. Citizen report reads and linked incident visibility remain owner-filtered; notification updates are scoped by both notification ID and authenticated user ID.
- Passwords are bcrypt-hashed before user creation. The Mongoose password-hash field is excluded from normal reads and API serialization.
- Audit records are only appended by application flows; no active endpoint permits modifying or deleting them.

## Index and pagination strategy

Models define unique indexes for IDs and account email, plus indexes for report owner/category/status/time, incident status/category/priority/report references, user role/department, notification owner/read/time, audit user/module/action/time, and supporting assignment/resolution/feedback/risk queries. No `syncIndexes()` or destructive index reconciliation is called.

Collection endpoints accept `page` and `pageSize` where applicable. Defaults are 25; the maximum is 100. MongoDB applies `skip`, `limit`, and stable sort order. Analytical operations that need a full report/incident set retrieve it in bounded pages rather than using an API page limit.

## Test approach

Database-free checks use mocked `ScipRepository` implementations for report service reads/writes, authorization, missing records, duplicate/database error propagation, pagination, request validation, and serialization. Root auth/incident visibility regression tests are also isolated. These checks do not start the app and do not call `mongoose.connect`.

Safe unit-test command:

```powershell
$env:JWT_SECRET = 'isolated-tests-only-32-byte-secret-value'
node --import tsx --test tests\rootAuthorizationSafety.test.ts tests\reportService.test.ts tests\persistenceConfiguration.test.ts tests\mongoInitializationSafety.test.ts
```

The secret above is process-local test data, not a production credential.

### Optional isolated MongoDB integration setup

Integration tests are not run by Phase 1. If a later phase adds them, use a disposable, local-only MongoDB instance with no bind-mounted data directory, for example a temporary container bound only to `127.0.0.1:27018`. Use a database name reserved for tests such as `scip_phase1_test` and set `MONGODB_URI=mongodb://127.0.0.1:27018/scip_phase1_test`. Before running any integration test, independently verify the container identity, loopback host, port, and database name; confirm the URI is not an Atlas/production URI and is not using `data/db`. Stop and discard only that explicitly identified disposable container after the test. Phase 1 did not start a container or connect to a database.

## Known limitations

- Existing MongoDB records are not migrated. Documents created against a different legacy incident shape may need a separately reviewed, non-destructive migration before production use.
- Multi-document workflows perform application-level reference checks but are not yet wrapped in MongoDB transactions; transient failure between related writes can leave a partially completed workflow. A transaction design and replica-set integration tests are a follow-up.
- The database-free tests verify the repository contract and service behavior, not live Mongoose query behavior. Integration tests require the independently verified disposable database described above.
- The legacy in-memory singleton still exists for test compatibility, but no active root business route or auth middleware depends on it.
- The development-only `/api/tests/run` route is disabled with HTTP 410 after its existing local/opt-in/auth/admin gates because its former implementation reset application data.
