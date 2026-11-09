import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { verifyPassword } from '../../src/server/auth/password.ts';
import { registerSchema, requireLocalDevelopmentEndpoint } from '../../src/server/middleware/security.ts';

test('public registration accepts only the citizen role', () => {
  const account = {
    name: 'Test Citizen',
    email: 'citizen@example.test',
    password: 'valid-test-password',
  };

  assert.equal(registerSchema.safeParse(account).success, true);
  assert.equal(registerSchema.safeParse({ ...account, role: 'citizen' }).success, true);
  assert.equal(registerSchema.safeParse({ ...account, role: 'admin' }).success, false);
  assert.equal(registerSchema.safeParse({ ...account, role: 'officer' }).success, false);
  assert.equal(registerSchema.safeParse({ ...account, role: 'authority' }).success, false);
});

test('password verification accepts only the password matching the stored hash', async () => {
  const hash = await bcrypt.hash('correct-test-password', 4);

  assert.equal(await verifyPassword('correct-test-password', hash), true);
  assert.equal(await verifyPassword('incorrect-test-password', hash), false);
});

test('development-only endpoints require explicit opt-in and a loopback client', () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDevEndpoints = process.env.ENABLE_DEV_ENDPOINTS;
  const previousTrustProxy = process.env.TRUST_PROXY;
  const attempts = [
    { nodeEnv: 'production', enabled: 'true', trustProxy: undefined, ip: '127.0.0.1', remoteAddress: '127.0.0.1', expectedNext: false },
    { nodeEnv: 'development', enabled: undefined, trustProxy: undefined, ip: '127.0.0.1', remoteAddress: '127.0.0.1', expectedNext: false },
    { nodeEnv: 'development', enabled: 'true', trustProxy: undefined, ip: '127.0.0.1', remoteAddress: '192.0.2.10', expectedNext: false },
    { nodeEnv: 'development', enabled: 'true', trustProxy: undefined, ip: '192.0.2.10', remoteAddress: '127.0.0.1', expectedNext: true },
    { nodeEnv: 'development', enabled: 'true', trustProxy: undefined, ip: '::1', remoteAddress: '::1', expectedNext: true },
    { nodeEnv: 'development', enabled: 'true', trustProxy: 'true', ip: '127.0.0.1', remoteAddress: '127.0.0.1', expectedNext: false },
  ];

  try {
    for (const attempt of attempts) {
      process.env.NODE_ENV = attempt.nodeEnv;
      if (attempt.enabled === undefined) delete process.env.ENABLE_DEV_ENDPOINTS;
      else process.env.ENABLE_DEV_ENDPOINTS = attempt.enabled;
      if (attempt.trustProxy === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = attempt.trustProxy;

      let nextCalled = false;
      let statusCode = 0;
      const req = {
        ip: attempt.ip,
        socket: { remoteAddress: attempt.remoteAddress },
      } as unknown as Parameters<typeof requireLocalDevelopmentEndpoint>[0];
      const res = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json() {
          return this;
        },
      } as unknown as Parameters<typeof requireLocalDevelopmentEndpoint>[1];

      requireLocalDevelopmentEndpoint(req, res, () => {
        nextCalled = true;
      });

      assert.equal(nextCalled, attempt.expectedNext);
      if (!attempt.expectedNext) assert.equal(statusCode, 404);
    }
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDevEndpoints === undefined) delete process.env.ENABLE_DEV_ENDPOINTS;
    else process.env.ENABLE_DEV_ENDPOINTS = previousDevEndpoints;
    if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousTrustProxy;
  }
});

test('JWT authentication refuses missing or weak secrets and accepts a configured strong secret', () => {
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
  const importAuth = "await import('./src/server/middleware/auth.ts')";
  const runImport = (jwtSecret: string | undefined) => {
    const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: 'test' };
    if (jwtSecret === undefined) delete env.JWT_SECRET;
    else env.JWT_SECRET = jwtSecret;

    return spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', importAuth],
      { cwd: projectRoot, env, encoding: 'utf8' },
    );
  };

  for (const nodeEnv of ['development', 'production']) {
    const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: nodeEnv };
    delete env.JWT_SECRET;
    const missingSecret = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', importAuth],
      { cwd: projectRoot, env, encoding: 'utf8' },
    );
    assert.notEqual(missingSecret.status, 0);
    assert.match(missingSecret.stderr, /JWT_SECRET must be configured/);
  }

  for (const invalidSecret of ['short-secret', 'scip-master-secure-jwt-secret-key-2026']) {
    const invalidSecretResult = runImport(invalidSecret);
    assert.notEqual(invalidSecretResult.status, 0);
    assert.match(invalidSecretResult.stderr, /JWT_SECRET must be configured/);
  }

  const strongSecret = runImport('test-only-secret-that-is-at-least-32-bytes-long');
  assert.equal(strongSecret.status, 0, strongSecret.stderr);
});

test('citizens cannot change report workflow status through the root API', async () => {
  const previousJwtSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-bytes-long';
  try {
    const { default: reportRoutes } = await import('../../src/server/routes/reportRoutes.ts');
    const { db } = await import('../../src/database/scipDatabase.ts');
    const originalGetReportById = db.getReportById;
    const originalUpdateReport = db.updateReport;
    const router = reportRoutes as unknown as {
      stack: Array<{
        route?: {
          path?: string;
          methods?: { put?: boolean };
          stack?: Array<{ handle: (req: unknown, res: unknown) => void }>;
        };
      }>;
    };
    const putRoute = router.stack.find(layer => layer.route?.path === '/:id' && layer.route.methods?.put)?.route;
    const handler = putRoute?.stack?.at(-1)?.handle;
    assert.ok(handler, 'PUT /:id handler should be registered');

    try {
      let updateCalled = false;
      (db as any).getReportById = () => ({ id: 'report-1', citizenId: 'citizen-1' });
      (db as any).updateReport = () => {
        updateCalled = true;
        return {};
      };

      let statusCode = 200;
      let responseBody: unknown;
      const response = {
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: unknown) {
          responseBody = body;
          return this;
        },
      };

      handler({
        user: { id: 'citizen-1', role: 'citizen' },
        params: { id: 'report-1' },
        body: { status: 'resolved' },
      }, response);

      assert.equal(statusCode, 403);
      assert.equal(updateCalled, false);
      assert.deepEqual(responseBody, {
        success: false,
        message: 'Forbidden: Citizens cannot change report workflow status.',
        errors: ['Insufficient permissions to modify report status.'],
      });
    } finally {
      (db as any).getReportById = originalGetReportById;
      (db as any).updateReport = originalUpdateReport;
    }
  } finally {
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
  }
});
