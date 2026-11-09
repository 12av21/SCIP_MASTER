import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initDatabase } from '../src/database/initMongo.ts';

async function withoutMongoUri(operation: () => Promise<void>): Promise<void> {
  const previous = process.env.MONGODB_URI;
  delete process.env.MONGODB_URI;
  try {
    await operation();
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
}

test('database initialization requires MONGODB_URI before attempting a connection', async () => {
  await withoutMongoUri(async () => {
    await assert.rejects(initDatabase(), /MONGODB_URI is required/);
  });
});

test('database initialization rejects unsupported connection schemes before attempting a connection', async () => {
  const previous = process.env.MONGODB_URI;
  process.env.MONGODB_URI = 'http://localhost/not-a-database';
  try {
    await assert.rejects(initDatabase(), /must use the mongodb/);
  } finally {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  }
});
