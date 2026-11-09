// SCIP Phase 2 — Shared integration test harness
//
// This module owns the ONLY MongoDB connection configuration used by the
// integration suite. It deliberately does NOT read process.env.MONGODB_URI
// so that a stray production/test value in the environment can never leak in.
//
// Target (hard-coded, process-local, disposable):
//   bind address : 127.0.0.1
//   port         : 27018
//   database     : scip_phase2_test
//   URI          : mongodb://127.0.0.1:27018/scip_phase2_test
//   no auth, no Atlas, no srv, no existing application database.

import mongoose from 'mongoose';
import { createMongoDatabase, type MongoDatabase } from '../../src/database/mongoDatabase.js';

export const TEST_DB_NAME = 'scip_phase2_test' as const;
export const TEST_PORT = 27018;
export const TEST_BIND_ADDRESS = '127.0.0.1';
export const TEST_MONGODB_URI = `mongodb://${TEST_BIND_ADDRESS}:${TEST_PORT}/${TEST_DB_NAME}` as const;

export const ALL_MODEL_NAMES = [
  'User',
  'Department',
  'Report',
  'Incident',
  'AIAnalysis',
  'Assignment',
  'Resolution',
  'Notification',
  'Feedback',
  'AuditLog',
  'RiskScore',
] as const;

export interface HarnessOptions {
  /** Override the hard-coded URI only for safety/inspection tests. */
  uri?: string;
  dbName?: string;
}

/**
 * Mask a URI so credentials are never written to logs or test output.
 */
export function maskUri(uri: string): string {
  try {
    const u = new URL(uri);
    const userinfo = u.username || u.password ? '***@' : '';
    return `${u.protocol}//${userinfo}${u.hostname}${u.port ? ':' + u.port : ''}${u.pathname}`;
  } catch {
    return '<malformed-uri>';
  }
}

/**
 * Assert the active URI is exactly the approved disposable target.
 * Throws a hard error if any other value is detected so a misconfigured run
 * aborts before touching a database.
 */
export function assertApprovedTestUri(uri: string): void {
  if (uri !== TEST_MONGODB_URI) {
    throw new Error(
      `[SCIP Phase 2 SAFETY] Refusing to use non-approved URI: ${maskUri(uri)}. ` +
      `Expected exactly: ${maskUri(TEST_MONGODB_URI)}`
    );
  }
}

/**
 * Verify the environment has not smuggled in a competing MONGODB_URI.
 */
export function assertNoLeakedUri(): void {
  const leaked = process.env.MONGODB_URI;
  if (leaked && leaked.trim().length > 0 && leaked !== TEST_MONGODB_URI) {
    throw new Error(
      `[SCIP Phase 2 SAFETY] process.env.MONGODB_URI is set to a non-test value: ${maskUri(leaked)}. ` +
      `Integration tests must run with MONGODB_URI unset or exactly the approved test URI.`
    );
  }
}

export class MongoTestHarness {
  readonly db: MongoDatabase;
  readonly dbName: string;
  readonly uri: string;
  private connected = false;
  private dbDropped = false;

  constructor(options: HarnessOptions = {}) {
    this.uri = options.uri ?? TEST_MONGODB_URI;
    this.dbName = options.dbName ?? TEST_DB_NAME;
    assertApprovedTestUri(this.uri);
    this.db = createMongoDatabase({ uri: this.uri, dbName: this.dbName });
  }

  async setup(): Promise<void> {
    assertNoLeakedUri();
    if (this.connected) return;
    await this.db.connect();
    // One-time clean slate for this test file. We drop the *test* database
    // only, never the application database, and only on this dedicated target.
    const adminDb = mongoose.connection.db;
    if (adminDb) {
      await adminDb.dropDatabase();
      this.dbDropped = true;
    }
    this.connected = true;
  }

  /**
   * Purge document content between tests while preserving declared indexes.
   * Using deleteMany (not dropCollection) keeps index builds cached so the
   * first write of every test re-uses already-initialized indexes.
   */
  async purgeCollections(): Promise<void> {
    const models = await import('../../src/models/index.js');
    await Promise.all(
      Object.values(models)
        .filter((m: any) => m && m.deleteMany)
        .map((m: any) => m.deleteMany({}))
    );
  }

  async teardown(): Promise<void> {
    if (!this.connected) return;
    try {
      const adminDb = mongoose.connection.db;
      if (adminDb) {
        await adminDb.dropDatabase();
        this.dbDropped = true;
      }
    } catch {
      // Best-effort: the disposable instance is discarded after the run.
    }
    await this.db.disconnect();
    this.connected = false;
  }

  /**
   * Inspect the actual persisted indexes for a collection.
   */
  async indexes(collection: string): Promise<Record<string, any>[]> {
    const adminDb = mongoose.connection.db;
    if (!adminDb) throw new Error('Database connection not established');
    return adminDb.collection(collection).indexes();
  }

  /**
   * Run an explain plan for a find query on a collection.
   */
  async explainFind(collection: string, filter: Record<string, any> = {}): Promise<Record<string, any>> {
    const adminDb = mongoose.connection.db;
    if (!adminDb) throw new Error('Database connection not established');
    return adminDb.collection(collection).find(filter).explain('executionStats');
  }
}

/**
 * Create a harness bound to the approved disposable target.
 */
export function createHarness(): MongoTestHarness {
  return new MongoTestHarness();
}