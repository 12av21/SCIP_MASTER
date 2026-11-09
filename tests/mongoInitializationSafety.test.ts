import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MongoDatabase,
  type FixtureSeedCollection,
  type MongoFixtureSeedAdapter
} from '../src/database/mongoDatabase.ts';
import { initializeMongoDatabase } from '../src/database/initMongo.ts';
import type { AIAnalysis, Report } from '../src/types/scip.ts';

const authorizedEnvironment = {
  NODE_ENV: 'development',
  ENABLE_DEV_FIXTURE_SEEDING: 'true'
};

async function withEnvironment<T>(
  environment: { NODE_ENV?: string; ENABLE_DEV_FIXTURE_SEEDING?: string },
  operation: () => Promise<T>
): Promise<T> {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_DEV_FIXTURE_SEEDING: process.env.ENABLE_DEV_FIXTURE_SEEDING
  };
  if (environment.NODE_ENV === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = environment.NODE_ENV;
  if (environment.ENABLE_DEV_FIXTURE_SEEDING === undefined) {
    delete process.env.ENABLE_DEV_FIXTURE_SEEDING;
  } else {
    process.env.ENABLE_DEV_FIXTURE_SEEDING = environment.ENABLE_DEV_FIXTURE_SEEDING;
  }

  try {
    return await operation();
  } finally {
    if (previous.NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous.NODE_ENV;
    if (previous.ENABLE_DEV_FIXTURE_SEEDING === undefined) {
      delete process.env.ENABLE_DEV_FIXTURE_SEEDING;
    } else {
      process.env.ENABLE_DEV_FIXTURE_SEEDING = previous.ENABLE_DEV_FIXTURE_SEEDING;
    }
  }
}

function makeReport(id = 'fixture-report'): Report {
  return {
    id,
    title: 'Fixture report',
    description: 'Report used by a database-free safety test',
    category: 'Roads & Traffic',
    locationName: 'Test location',
    latitude: 0,
    longitude: 0,
    citizenId: 'fixture-citizen',
    citizenName: 'Fixture citizen',
    citizenEmail: 'fixture@example.invalid',
    status: 'analyzed',
    urgency: 'low',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  };
}

function makeAnalysis(reportId: string, categoryPredicted: AIAnalysis['categoryPredicted'] = 'Roads & Traffic'): AIAnalysis {
  return {
    reportId,
    categoryPredicted,
    categoryConfidence: 0.5,
    keywords: [],
    entities: { locations: [], infrastructure: [], hazards: [], temporal: [] },
    sentiment: 'neutral',
    duplicateProbability: 0,
    topSimilarReports: [],
    possibleIncident: false,
    severityIndicator: 'low',
    riskScore: 0,
    evidence: [],
    confidence: 0.5,
    processedAt: '2026-01-01T00:00:00.000Z'
  };
}

function makeDatabase(
  adapter: MongoFixtureSeedAdapter,
  onConnect: () => Promise<void> = async () => {}
): MongoDatabase {
  const database = new MongoDatabase(
    { uri: 'mongodb://127.0.0.1:27017/unused-test-target', dbName: 'unused-test-target' },
    adapter
  );
  database.connect = onConnect;
  return database;
}

function makeAdapter(options: {
  collections?: readonly FixtureSeedCollection<{ id: string }>[];
  reports?: Report[];
  analyses?: AIAnalysis[];
  findAnalysis?: (reportId: string) => Promise<boolean>;
  onAnalysisInsert?: (analysis: AIAnalysis) => Promise<void>;
} = {}): MongoFixtureSeedAdapter {
  const existingAnalyses = options.analyses ?? [];
  return {
    collections: options.collections ?? [],
    getReports: async () => options.reports ?? [],
    buildAnalysis: async report => makeAnalysis(report.id),
    findAnalysis: options.findAnalysis ?? (async reportId =>
      existingAnalyses.some(analysis => analysis.reportId === reportId)),
    insertAnalysis: async analysis => {
      if (options.onAnalysisInsert) {
        await options.onAnalysisInsert(analysis);
        return;
      }
      existingAnalyses.push(analysis);
    }
  };
}

function fixtureCollection(
  name: string,
  record: { id: string },
  options: {
    duplicateKeyField?: string;
    findExisting?: (id: string) => Promise<boolean>;
    insert?: (value: { id: string }) => Promise<void>;
  } = {}
): FixtureSeedCollection<{ id: string }> {
  return {
    name,
    records: [record],
    getId: value => value.id,
    duplicateKeyField: options.duplicateKeyField ?? 'id',
    findExisting: options.findExisting ?? (async () => false),
    insert: options.insert ?? (async () => {})
  };
}

function duplicateKeyError(
  field: string,
  value: string
): Error & { code: number; keyPattern: Record<string, number>; keyValue: Record<string, string> } {
  return Object.assign(new Error(`duplicate key on ${field}`), {
    code: 11000,
    keyPattern: { [field]: 1 },
    keyValue: { [field]: value }
  });
}

test('production initialization connects and checks health without seeding', async () => {
  let seedCalls = 0;
  const database = {
    async connect() {},
    async healthCheck() {
      return { status: 'ok', database: 'fake', collections: 0 };
    },
    async seedDatabase() {
      seedCalls += 1;
    }
  };

  await withEnvironment({ NODE_ENV: 'production' }, async () => {
    await initializeMongoDatabase(database);
    assert.equal(seedCalls, 0);
  });
});

test('development initialization does not automatically seed', async () => {
  let seedCalls = 0;
  const database = {
    async connect() {},
    async healthCheck() {
      return { status: 'ok', database: 'fake', collections: 0 };
    },
    async seedDatabase() {
      seedCalls += 1;
    }
  };

  await withEnvironment(authorizedEnvironment, async () => {
    await initializeMongoDatabase(database);
    assert.equal(seedCalls, 0);
  });
});

test('missing NODE_ENV with fixture opt-in rejects before connection or writes', async () => {
  let writes = 0;
  let connections = 0;
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    insert: async () => { writes += 1; }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }), async () => {
    connections += 1;
  });

  await withEnvironment({ ENABLE_DEV_FIXTURE_SEEDING: 'true' }, async () => {
    await assert.rejects(database.seedDatabase(), /Fixture seeding requires/);
    assert.equal(connections, 0);
    assert.equal(writes, 0);
  });
});

test('production with fixture opt-in rejects before connection or writes', async () => {
  let writes = 0;
  let connections = 0;
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    insert: async () => { writes += 1; }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }), async () => {
    connections += 1;
  });

  await withEnvironment({ NODE_ENV: 'production', ENABLE_DEV_FIXTURE_SEEDING: 'true' }, async () => {
    await assert.rejects(database.seedDatabase(), /Fixture seeding requires/);
    assert.equal(connections, 0);
    assert.equal(writes, 0);
  });
});

test('development without fixture opt-in rejects before connection or writes', async () => {
  let writes = 0;
  let connections = 0;
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    insert: async () => { writes += 1; }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }), async () => {
    connections += 1;
  });

  await withEnvironment({ NODE_ENV: 'development' }, async () => {
    await assert.rejects(database.seedDatabase(), /Fixture seeding requires/);
    assert.equal(connections, 0);
    assert.equal(writes, 0);
  });
});

test('empty environment values fail closed', async () => {
  const database = makeDatabase(makeAdapter());
  await withEnvironment({ NODE_ENV: '', ENABLE_DEV_FIXTURE_SEEDING: 'true' }, async () => {
    await assert.rejects(database.seedDatabase(), /Fixture seeding requires/);
  });
  await withEnvironment({ NODE_ENV: 'development', ENABLE_DEV_FIXTURE_SEEDING: '' }, async () => {
    await assert.rejects(database.seedDatabase(), /Fixture seeding requires/);
  });
});

test('development with both required variables permits explicit fixture seeding', async () => {
  const inserted: string[] = [];
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    insert: async value => { inserted.push(value.id); }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }));

  await withEnvironment(authorizedEnvironment, async () => {
    const summaries = await database.seedDatabase();
    assert.deepEqual(inserted, ['fixture-user']);
    assert.deepEqual(summaries[0].insertedIds, ['fixture-user']);
  });
});

test('existing AI-analysis records are preserved during fixture seeding', async () => {
  const existingAnalysis = makeAnalysis('fixture-report', 'Public Health');
  const database = makeDatabase(makeAdapter({
    reports: [makeReport()],
    analyses: [existingAnalysis]
  }));

  await withEnvironment(authorizedEnvironment, async () => {
    const summaries = await database.seedDatabase();
    assert.deepEqual(summaries.find(summary => summary.collection === 'aiAnalyses')?.skippedExistingIds, [
      'fixture-report'
    ]);
  });
  assert.equal(existingAnalysis.categoryPredicted, 'Public Health');
});

test('concurrent AI-analysis insertion conflict skips without overwriting existing data', async () => {
  const existingAnalysis = makeAnalysis('fixture-report', 'Public Health');
  const analysisStore = [existingAnalysis];
  let findCompleted = false;
  const database = makeDatabase(makeAdapter({
    reports: [makeReport()],
    findAnalysis: async () => {
      findCompleted = true;
      return false;
    },
    onAnalysisInsert: async analysis => {
      assert.equal(findCompleted, true);
      if (analysisStore.some(existing => existing.reportId === analysis.reportId)) {
        throw duplicateKeyError('reportId', analysis.reportId);
      }
      analysisStore.push(analysis);
    }
  }));
  const before = structuredClone(analysisStore);

  await withEnvironment(authorizedEnvironment, async () => {
    const summaries = await database.seedDatabase();
    assert.deepEqual(summaries.find(summary => summary.collection === 'aiAnalyses')?.skippedExistingIds, [
      'fixture-report'
    ]);
  });
  assert.deepEqual(analysisStore, before);
});

test('duplicate fixture ID race is reported as an existing fixture', async () => {
  const existingRecord = { id: 'fixture-user', name: 'Existing user data' };
  const records: Array<{ id: string }> = [existingRecord];
  const before = structuredClone(records);
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    findExisting: async () => false,
    insert: async value => {
      if (records.some(existing => existing.id === value.id)) {
        throw duplicateKeyError('id', value.id);
      }
      records.push(value);
    }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }));

  await withEnvironment(authorizedEnvironment, async () => {
    const summaries = await database.seedDatabase();
    assert.deepEqual(summaries[0].insertedIds, []);
    assert.deepEqual(summaries[0].skippedExistingIds, ['fixture-user'    ]);
  });
  assert.deepEqual(records, before);
});

test('email and department-code uniqueness conflicts are surfaced, not skipped', async t => {
  for (const [collectionName, field, value] of [
    ['users', 'email', 'existing@example.invalid'],
    ['departments', 'code', 'EXISTING']
  ]) {
    await t.test(`${collectionName} ${field} conflict`, async () => {
      const collection = fixtureCollection(collectionName, { id: 'fixture-id' }, {
        insert: async () => { throw duplicateKeyError(field, value); }
      });
      const database = makeDatabase(makeAdapter({ collections: [collection] }));

      await withEnvironment(authorizedEnvironment, async () => {
        await assert.rejects(
          database.seedDatabase(),
          new RegExp(`Unexpected duplicate-key conflict while seeding ${collectionName} fixture fixture-id.*${field}`)
        );
      });
    });
  }
});

test('Mongo initialization connects and checks health without seeding or clearing', async () => {
  let connections = 0;
  let writes = 0;
  const collection = fixtureCollection('users', { id: 'fixture-user' }, {
    insert: async () => { writes += 1; }
  });
  const database = makeDatabase(makeAdapter({ collections: [collection] }), async () => {
    connections += 1;
  });
  database.healthCheck = async () => ({ status: 'ok', database: 'fake', collections: 2 });

  await withEnvironment(authorizedEnvironment, async () => {
    await initializeMongoDatabase(database);
  });
  assert.equal(connections, 1);
  assert.equal(writes, 0);
});

test('connection failure does not invoke seeding or clearing fallbacks', async () => {
  let seedCalls = 0;
  let clearCalls = 0;
  const database = {
    async connect() {
      throw new Error('simulated connection failure');
    },
    async healthCheck() {
      return { status: 'ok', database: 'fake', collections: 0 };
    },
    async seedDatabase() {
      seedCalls += 1;
    },
    clearCollections() {
      clearCalls += 1;
    }
  };

  await assert.rejects(initializeMongoDatabase(database), /simulated connection failure/);
  assert.equal(seedCalls, 0);
  assert.equal(clearCalls, 0);
});
