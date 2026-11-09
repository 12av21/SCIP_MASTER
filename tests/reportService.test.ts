import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ReportService } from '../src/server/services/reportService.ts';
import { ReportAccessDeniedError } from '../src/server/services/reportService.ts';
import { createReportSchema } from '../src/server/middleware/security.ts';
import { serializeMongoDocument } from '../src/database/mongoDatabase.ts';
import type { Report, User } from '../src/types/scip.ts';

const report: Report = {
  id: 'report-1',
  title: 'Blocked drainage channel',
  description: 'Water is collecting near the public walkway.',
  category: 'Water & Drainage',
  locationName: 'North Avenue',
  latitude: 28.6,
  longitude: 77.2,
  citizenId: 'citizen-1',
  citizenName: 'Test Citizen',
  citizenEmail: 'citizen@example.test',
  status: 'analyzed',
  urgency: 'medium',
  createdAt: '2026-11-09T00:00:00.000Z',
  updatedAt: '2026-11-09T00:00:00.000Z'
};

function createRepository(overrides: Partial<{
  getReports: (filter?: { citizenId?: string; category?: string; status?: string; urgency?: string }, pagination?: { limit?: number; skip?: number }) => Promise<Report[]>;
  countReports: (filter?: { citizenId?: string; category?: string; status?: string; urgency?: string }) => Promise<number>;
  getReportById: (id: string) => Promise<Report | undefined>;
  getAIAnalysisForReport: (id: string) => Promise<undefined>;
  createReport: (input: Omit<Report, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<{ report: Report; analysis: never }>;
  updateReport: (id: string, updates: Partial<Report>, user: User) => Promise<Report>;
}> = {}) {
  return {
    getReports: overrides.getReports ?? (async () => [report]),
    countReports: overrides.countReports ?? (async () => 1),
    getReportById: overrides.getReportById ?? (async id => id === report.id ? report : undefined),
    getAIAnalysisForReport: overrides.getAIAnalysisForReport ?? (async () => undefined),
    createReport: overrides.createReport ?? (async input => ({
      report: { ...report, ...input },
      analysis: undefined as never
    })),
    updateReport: overrides.updateReport ?? (async (_id, updates) => ({ ...report, ...updates }))
  };
}

const citizen: Pick<User, 'id' | 'role'> = { id: 'citizen-1', role: 'citizen' };

test('report service paginates through the repository and returns total independently of page size', async () => {
  const service = new ReportService(createRepository({
    getReports: async (_filter, pagination) => {
      assert.deepEqual(pagination, { skip: 25, limit: 25 });
      return [];
    },
    countReports: async () => 61
  }));

  assert.deepEqual(await service.listReports({}, { skip: 25, limit: 25 }), { reports: [], total: 61 });
});

test('report service allows citizens to read only their own report and omits internal persistence fields', async () => {
  const storedReport = { ...report } as Report & { _id?: string; __v?: number };
  storedReport._id = 'internal-id';
  storedReport.__v = 1;
  const serializedReport = serializeMongoDocument(storedReport)!;
  const service = new ReportService(createRepository({ getReportById: async () => serializedReport }));

  const details = await service.getReportDetails(report.id, citizen);
  assert.ok(details);
  assert.equal(details.report.citizenId, citizen.id);
  assert.equal('_id' in details.report, false);
  assert.equal('__v' in details.report, false);
});

test('report service denies citizens access to another citizen report', async () => {
  const service = new ReportService(createRepository());
  await assert.rejects(service.getReportDetails(report.id, { id: 'citizen-2', role: 'citizen' }), ReportAccessDeniedError);
});

test('report service returns missing records without fabricating data', async () => {
  const service = new ReportService(createRepository({ getReportById: async () => undefined }));
  assert.equal(await service.getReportDetails('missing', citizen), undefined);
});

test('report create and update operations delegate to the persistent repository', async () => {
  let created = false;
  let updated = false;
  const service = new ReportService(createRepository({
    createReport: async input => {
      created = true;
      return { report: { ...report, ...input }, analysis: undefined as never };
    },
    updateReport: async (_id, updates) => {
      updated = true;
      return { ...report, ...updates };
    }
  }));

  await service.createReport({
    title: report.title,
    description: report.description,
    category: report.category,
    locationName: report.locationName,
    latitude: report.latitude,
    longitude: report.longitude,
    citizenId: report.citizenId,
    citizenName: report.citizenName,
    citizenEmail: report.citizenEmail,
    urgency: report.urgency
  });
  const updatedBy: User = {
    id: 'admin-1',
    name: 'Test Admin',
    email: 'admin@example.test',
    role: 'admin',
    status: 'active',
    createdAt: report.createdAt,
    updatedAt: report.updatedAt
  };
  await service.updateReport(report.id, { title: 'Updated drainage report' }, updatedBy);
  assert.equal(created, true);
  assert.equal(updated, true);
});

test('report service does not hide duplicate or database failures', async () => {
  const duplicateService = new ReportService(createRepository({
    createReport: async () => { throw new Error('DUPLICATE_REPORT'); }
  }));
  const databaseService = new ReportService(createRepository({
    getReports: async () => { throw new Error('database unavailable'); }
  }));
  const input = {
    title: report.title,
    description: report.description,
    category: report.category,
    locationName: report.locationName,
    latitude: report.latitude,
    longitude: report.longitude,
    citizenId: report.citizenId,
    citizenName: report.citizenName,
    citizenEmail: report.citizenEmail,
    urgency: report.urgency
  };

  await assert.rejects(duplicateService.createReport(input), /DUPLICATE_REPORT/);
  await assert.rejects(databaseService.listReports({}, { skip: 0, limit: 25 }), /database unavailable/);
});

test('report request validation rejects missing required fields', () => {
  const result = createReportSchema.safeParse({ title: 'tiny' });
  assert.equal(result.success, false);
});

test('Mongo serialization strips internal identifiers without mutating the source', () => {
  const source = { id: report.id, _id: 'internal-id', __v: 2 };
  const serialized = serializeMongoDocument(source);
  assert.deepEqual(serialized, { id: report.id });
  assert.equal(source._id, 'internal-id');
});
