# Backend authentication

## Configuration and startup

The backend requires `PORT`, `MONGODB_URI`, and `JWT_SECRET`. Keep `.env` local; `.env.example` contains placeholders only. Generate a signing secret locally with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Put the output in `JWT_SECRET` in `backend/.env`. The server rejects missing secrets or secrets shorter than 32 UTF-8 bytes. The configured local development MongoDB URI is `mongodb://127.0.0.1:27017/scip`.

Start local MongoDB, then run `npm run dev` from `backend/`. Run `npm run typecheck`, `npm run build`, and `npm test` for checks. The integration suite uses only `mongodb://127.0.0.1:27017/scip_auth_test` and removes its uniquely named test records afterward; it never uses the development `scip` database.

## Endpoints

All responses use `{ "success": true, "data": ... }` on success. Registration and login accept only the fields shown; registration always creates a citizen account.

```http
POST /api/auth/register
Content-Type: application/json
{"name":"Asha Rao","email":"asha@example.com","password":"choose-a-long-password"}
```

Returns `201` with `{ "user": { "id": "...", "name": "...", "email": "...", "role": "citizen", "createdAt": "..." }, "token": "<token>" }`. Duplicate email returns `409`; malformed input returns `400`.

```http
POST /api/auth/login
Content-Type: application/json
{"email":"asha@example.com","password":"choose-a-long-password"}
```

Successful login returns the same safe user and a JWT. Incorrect credentials return a generic `401`.

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Returns the current safe user profile. Tokens use HS256 and expire after one hour. Roles are `citizen`, `officer`, and `admin`; `requireRole(...)` authorizes from the current database record. No public privileged-account creation exists.

## Limitations and production hardening

No login rate limiter is installed; add a distributed rate limiter before exposing the service publicly. Also configure a restrictive CORS origin policy, TLS, secret rotation, monitoring, and a dedicated isolated test database. The current repository has no test runner or MongoDB test fixture, so integration tests require deliberate test infrastructure before they can safely run.
