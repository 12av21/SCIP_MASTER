import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIncidents } from '../src/controllers/incidents.ts';
import { getReports } from '../src/controllers/reports.ts';
import { Incident } from '../src/models/incident.ts';
import { Report } from '../src/models/report.ts';
import { User } from '../src/models/user.ts';

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}

function createListQuery() {
  return {
    sort() { return this; },
    skip() { return this; },
    limit() { return this; },
    lean: async () => [],
  };
}

test('officer report listing fails closed when the officer has no department', async () => {
  const originalFindById = User.findById;
  const originalReportFind = Report.find;
  const originalCountDocuments = Report.countDocuments;
  let reportQueryCount = 0;
  let userLookupId = '';

  (User as any).findById = (id: string) => {
    userLookupId = id;
    return { lean: async () => undefined };
  };
  (Report as any).find = () => {
    reportQueryCount += 1;
    return createListQuery();
  };
  (Report as any).countDocuments = async () => 0;

  try {
    const response = createResponse();
    await getReports({
      query: {},
      authUser: { id: 'officer-1', role: 'officer' },
    } as any, response as any);

    assert.equal(userLookupId, 'officer-1');
    assert.equal(response.statusCode, 403);
    assert.equal(reportQueryCount, 0);
    assert.deepEqual(response.body, {
      success: false,
      error: 'Officer has no assigned department',
    });
  } finally {
    (User as any).findById = originalFindById;
    (Report as any).find = originalReportFind;
    (Report as any).countDocuments = originalCountDocuments;
  }
});

test('officer report listing scopes results to the officer department', async () => {
  const originalFindById = User.findById;
  const originalReportFind = Report.find;
  const originalCountDocuments = Report.countDocuments;
  let reportQuery: Record<string, unknown> | undefined;

  (User as any).findById = () => ({
    lean: async () => ({ departmentId: 'department-a' }),
  });
  (Report as any).find = (query: Record<string, unknown>) => {
    reportQuery = query;
    return createListQuery();
  };
  (Report as any).countDocuments = async () => 0;

  try {
    const response = createResponse();
    await getReports({
      query: {},
      authUser: { id: 'officer-1', role: 'officer' },
    } as any, response as any);

    assert.equal(reportQuery?.departmentId, 'department-a');
    assert.equal(response.statusCode, 200);
  } finally {
    (User as any).findById = originalFindById;
    (Report as any).find = originalReportFind;
    (Report as any).countDocuments = originalCountDocuments;
  }
});

test('incident search is combined with, rather than replaces, officer access scope', async () => {
  const originalIncidentFind = Incident.find;
  const originalCountDocuments = Incident.countDocuments;
  let incidentQuery: Record<string, unknown> | undefined;

  (Incident as any).find = (query: Record<string, unknown>) => {
    incidentQuery = query;
    return createListQuery();
  };
  (Incident as any).countDocuments = async () => 0;

  try {
    const response = createResponse();
    await getIncidents({
      query: { search: 'fire' },
      authUser: { id: 'officer-1', role: 'officer', departmentId: 'department-a' },
    } as any, response as any);

    assert.equal(response.statusCode, 200);
    assert.equal(incidentQuery?.$or, undefined);
    assert.deepEqual(incidentQuery?.$and, [
      { $or: [{ departmentId: 'department-a' }, { assignedOfficerId: 'officer-1' }] },
      {
        $or: [
          { title: { $regex: 'fire', $options: 'i' } },
          { description: { $regex: 'fire', $options: 'i' } },
          { departmentName: { $regex: 'fire', $options: 'i' } },
        ],
      },
    ]);
  } finally {
    (Incident as any).find = originalIncidentFind;
    (Incident as any).countDocuments = originalCountDocuments;
  }
});
