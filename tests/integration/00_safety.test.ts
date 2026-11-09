// SCIP Phase 2 — Safety & URI verification tests
//
// These tests run BEFORE any database write. They assert that the test harness
// refuses to connect to any URI other than the approved disposable target and
// that no competing environment variable can leak in. They intentionally do
// NOT require a running MongoDB.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TEST_MONGODB_URI,
  TEST_DB_NAME,
  TEST_PORT,
  TEST_BIND_ADDRESS,
  assertApprovedTestUri,
  assertNoLeakedUri,
  maskUri,
} from './mongoHarness.js';

test('approved test URI matches the exact disposable target', () => {
  assert.equal(TEST_MONGODB_URI, 'mongodb://127.0.0.1:27018/scip_phase2_test');
  assert.equal(TEST_DB_NAME, 'scip_phase2_test');
  assert.equal(TEST_PORT, 27018);
  assert.equal(TEST_BIND_ADDRESS, '127.0.0.1');
});

test('approved URI is not localhost, not Atlas, not srv, and has no auth', () => {
  const uri = TEST_MONGODB_URI;
  assert.ok(!uri.includes('localhost'), 'URI must not use localhost');
  assert.ok(!uri.includes('+srv'), 'URI must not use mongodb+srv (Atlas)');
  assert.ok(!uri.includes('mongodb.net'), 'URI must not point at Atlas');
  assert.ok(!uri.includes('@'), 'URI must not contain credentials');
  assert.ok(uri.startsWith('mongodb://'), 'URI must use the mongodb:// scheme');
});

test('assertApprovedTestUri rejects a different database name', () => {
  assert.throws(() => assertApprovedTestUri('mongodb://127.0.0.1:27018/scip'), /non-approved URI/);
});

test('assertApprovedTestUri rejects a different port', () => {
  assert.throws(() => assertApprovedTestUri('mongodb://127.0.0.1:27017/scip_phase2_test'), /non-approved URI/);
});

test('assertApprovedTestUri rejects an Atlas URI', () => {
  assert.throws(
    () => assertApprovedTestUri('mongodb+srv://user:pass@cluster.mongodb.net/scip_phase2_test'),
    /non-approved URI/
  );
});

test('assertApprovedTestUri rejects a URI with credentials', () => {
  assert.throws(
    () => assertApprovedTestUri('mongodb://user:pass@127.0.0.1:27018/scip_phase2_test'),
    /non-approved URI/
  );
});

test('assertNoLeakedUri passes when MONGODB_URI is unset', async () => {
  const previous = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    assertNoLeakedUri();
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});

test('assertNoLeakedUri passes when MONGODB_URI equals the approved test URI', async () => {
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = TEST_MONGODB_URI;
  try {
    assertNoLeakedUri();
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});

test('assertNoLeakedUri rejects a competing application URI', async () => {
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/scip';
  try {
    assert.throws(assertNoLeakedUri, /process.env.MONGODB_URI is set to a non-test value/);
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});

test('maskUri hides credentials but keeps host/port/path', () => {
  const masked = maskUri('mongodb://user:secret@127.0.0.1:27018/scip_phase2_test');
  assert.ok(!masked.includes('user'), 'username must be masked');
  assert.ok(!masked.includes('secret'), 'password must be masked');
  assert.ok(masked.includes('127.0.0.1'), 'host must remain');
  assert.ok(masked.includes('27018'), 'port must remain');
  assert.ok(masked.includes('scip_phase2_test'), 'database name must remain');
});

test('the harness constructor rejects a non-approved URI at construction time', async () => {
  const { MongoTestHarness } = await import('./mongoHarness.js');
  assert.throws(
    () => new MongoTestHarness({ uri: 'mongodb://127.0.0.1:27017/scip' }),
    /non-approved URI/
  );
});