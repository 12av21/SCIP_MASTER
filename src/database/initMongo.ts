// MongoDB Database Initialization for SCIP
import { createMongoDatabase, MongoDatabase } from './mongoDatabase.js';
import type { ScipRepository } from './repositories/ScipRepository.js';

let _db: MongoDatabase | null = null;

export interface MongoDatabaseInitializer {
  connect(): Promise<void>;
  healthCheck(): Promise<{ status: string; database: string; collections: number }>;
}

export async function initializeMongoDatabase<T extends MongoDatabaseInitializer>(
  database: T
): Promise<T> {
  await database.connect();
  const health = await database.healthCheck();
  console.log(`[SCIP] Database ready: status=${health.status}, name=${health.database}, collections=${health.collections}`);
  return database;
}

export function getDb(): ScipRepository {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

export async function initDatabase(config?: { uri?: string; dbName?: string }): Promise<MongoDatabase> {
  const uri = config?.uri || process.env.MONGODB_URI;
  if (!uri || uri.trim().length === 0) {
    throw new Error('[SCIP] MONGODB_URI is required; server startup is aborted.');
  }
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error('[SCIP] MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.');
  }
  let uriDatabaseName: string | undefined;
  try {
    uriDatabaseName = new URL(uri).pathname.replace(/^\/+/, '').split('/')[0] || undefined;
  } catch {
    throw new Error('[SCIP] MONGODB_URI is malformed; server startup is aborted.');
  }
  const dbName = config?.dbName || uriDatabaseName || 'scip';
  const database = createMongoDatabase({ uri, dbName });

  // Test connection
  try {
    await initializeMongoDatabase(database);
    _db = database;
    console.log('[SCIP] MongoDB connected and initialized');
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error(`[SCIP] MongoDB connection failed (${errorName}); check MONGODB_URI and database availability.`);
    _db = null;
    throw error;
  }

  return database;
}

export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.disconnect();
    _db = null;
    console.log('[SCIP] MongoDB disconnected');
  }
}