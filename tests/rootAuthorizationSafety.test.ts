import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NextFunction, Request, Response } from 'express';
import { db } from '../src/database/scipDatabase.ts';
import { createIncidentDetailResponse, filterCitizenVisibleIncidents } from '../src/server/routes/incidentRoutes.ts';
import miscRoutes from '../src/server/routes/miscRoutes.ts';

const reports = [
  { id: 'report-citizen-a', citizenId: 'citizen-a', title: 'Owned report' },
  { id: 'report-citizen-b', citizenId: 'citizen-b', title: 'Private report' },
  { id: 'unlinked-report', citizenId: 'citizen-a', title: 'Unlinked report' }
];
const incident = { id: 'incident-1', reportIds: ['report-citizen-a', 'report-citizen-b'], status: 'potential' };

test('citizens receive only their own linked reports in incident details', () => {
  const response = createIncidentDetailResponse(incident, reports, { id: 'citizen-a', role: 'citizen' });

  assert.equal(response.status, 200);
  assert.ok('data' in response.body);
  assert.ok(response.body.data);
  assert.deepEqual(response.body.data.incident.reportIds, ['report-citizen-a']);
  assert.deepEqual(response.body.data.linkedReports.map(report => report.id), ['report-citizen-a']);
});

test('citizens without an owned linked report receive no incident details', () => {
  const response = createIncidentDetailResponse(incident, reports, { id: 'citizen-c', role: 'citizen' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal('data' in response.body, false);
});

test('authorized staff retain all linked reports in incident details', () => {
  const response = createIncidentDetailResponse(incident, reports, { id: 'admin-1', role: 'admin' });

  assert.equal(response.status, 200);
  assert.ok('data' in response.body);
  assert.ok(response.body.data);
  assert.deepEqual(response.body.data.linkedReports.map(report => report.id), incident.reportIds);
});

test('citizen incident listings omit incidents without owned reports and hide other linked report IDs', () => {
  const visible = filterCitizenVisibleIncidents(
    [incident, { id: 'incident-2', reportIds: ['report-citizen-b'] }],
    'citizen-a',
    new Set(['report-citizen-a'])
  );

  assert.equal(visible.length, 1);
  assert.deepEqual(visible[0].reportIds, ['report-citizen-a']);
});

function withEnvironment<T>(values: Record<string, string | undefined>, action: () => T): T {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_DEV_ENDPOINTS: process.env.ENABLE_DEV_ENDPOINTS,
    ENABLE_DEV_FIXTURE_SEEDING: process.env.ENABLE_DEV_FIXTURE_SEEDING,
    TRUST_PROXY: process.env.TRUST_PROXY
  };
  for (const key of Object.keys(previous)) {
    const value = values[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return action();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function responseRecorder() {
  const state: { statusCode: number; body?: unknown } = { statusCode: 200 };
  const response = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: unknown) {
      state.body = body;
      return this;
    }
  } as unknown as Response;
  return { response, state };
}

function getDevelopmentTestRoute() {
  const router = miscRoutes as unknown as {
    stack: Array<{ route?: { path: string; stack: Array<{ handle: (req: Request, res: Response, next: NextFunction) => void }> } }>
  };
  const route = router.stack.find(layer => layer.route?.path === '/tests/run')?.route;
  assert.ok(route, 'development test route should be registered');
  assert.equal(route.stack.length, 5, 'route must include local-only, explicit opt-in, authentication, admin, and handler layers');
  return route;
}

test('development test route requires explicit local opt-in and authentication before any seed callback', () => {
  const route = getDevelopmentTestRoute();

  const originalSeedDatabase = db.seedDatabase;
  let seedCalls = 0;
  db.seedDatabase = (() => {
    seedCalls += 1;
  }) as typeof db.seedDatabase;

  try {
    withEnvironment({
      NODE_ENV: 'development',
      ENABLE_DEV_ENDPOINTS: 'true',
      ENABLE_DEV_FIXTURE_SEEDING: 'true',
      TRUST_PROXY: undefined
    }, () => {
      const request = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: {}
      } as unknown as Request;
      const { response, state } = responseRecorder();
      let handlerIndex = 0;
      const next: NextFunction = () => {
        const handler = route.stack[handlerIndex++];
        handler?.handle(request, response, next);
      };

      next();
      assert.equal(state.statusCode, 401);
      assert.equal(handlerIndex, 3, 'unauthenticated requests must stop before the admin gate and route handler');
      assert.equal(seedCalls, 0);
    });
  } finally {
    db.seedDatabase = originalSeedDatabase;
  }
});

test('development test route middleware fails closed for missing, production, and incomplete environment settings', () => {
  const route = getDevelopmentTestRoute();
  const request = { socket: { remoteAddress: '127.0.0.1' }, headers: {} } as unknown as Request;

  for (const environment of [
    { NODE_ENV: undefined, ENABLE_DEV_ENDPOINTS: 'true', ENABLE_DEV_FIXTURE_SEEDING: 'true', TRUST_PROXY: undefined },
    { NODE_ENV: 'production', ENABLE_DEV_ENDPOINTS: 'true', ENABLE_DEV_FIXTURE_SEEDING: 'true', TRUST_PROXY: undefined },
    { NODE_ENV: 'development', ENABLE_DEV_ENDPOINTS: 'true', ENABLE_DEV_FIXTURE_SEEDING: undefined, TRUST_PROXY: undefined }
  ]) {
    withEnvironment(environment, () => {
      const { response, state } = responseRecorder();
      let nextCalled = false;
      route.stack[1].handle(request, response, () => { nextCalled = true; });
      assert.equal(state.statusCode, 404);
      assert.equal(nextCalled, false);
    });
  }

  withEnvironment({
    NODE_ENV: 'development',
    ENABLE_DEV_ENDPOINTS: 'true',
    ENABLE_DEV_FIXTURE_SEEDING: 'true',
    TRUST_PROXY: undefined
  }, () => {
    const { response, state } = responseRecorder();
    let nextCalled = false;
    route.stack[1].handle(request, response, () => { nextCalled = true; });
    assert.equal(state.body, undefined);
    assert.equal(nextCalled, true);
  });
});

test('development test route admin middleware rejects citizen actors', () => {
  const route = getDevelopmentTestRoute();
  const request = { user: { id: 'citizen-a', role: 'citizen' } } as unknown as Request;
  const { response, state } = responseRecorder();
  let nextCalled = false;
  route.stack[3].handle(request, response, () => { nextCalled = true; });

  assert.equal(state.statusCode, 403);
  assert.equal(nextCalled, false);
});
