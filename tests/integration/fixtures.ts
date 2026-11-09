// SCIP Phase 2 — Shared test fixtures
//
// Every fixture carries a unique, run-scoped identifier so tests can run in
// parallel without colliding. No production seed data is used here.

import { randomUUID } from 'node:crypto';
import type {
  User,
  Department,
  Report,
  Resolution,
  SpatioTemporalCluster,
} from '../../src/types/scip.js';

let counter = 0;
export function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`;
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: uniqueId('USR'),
    name: 'Test Citizen',
    email: `citizen-${uniqueId('email')}@example.invalid`,
    role: 'citizen',
    status: 'active',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  };
}

export function makeOfficer(overrides: Partial<User> = {}): User {
  return {
    id: uniqueId('USR'),
    name: 'Test Officer',
    email: `officer-${uniqueId('email')}@example.invalid`,
    role: 'officer',
    status: 'active',
    departmentId: uniqueId('DEPT'),
    departmentName: 'Public Works',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  };
}

export function makeAuthority(overrides: Partial<User> = {}): User {
  return {
    id: uniqueId('USR'),
    name: 'Test Authority',
    email: `authority-${uniqueId('email')}@example.invalid`,
    role: 'authority',
    status: 'active',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  };
}

export function makeAdmin(overrides: Partial<User> = {}): User {
  return {
    id: uniqueId('USR'),
    name: 'Test Admin',
    email: `admin-${uniqueId('email')}@example.invalid`,
    role: 'admin',
    status: 'active',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  };
}

export function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: uniqueId('DEPT'),
    code: uniqueId('CODE').toUpperCase(),
    name: 'Test Department',
    description: 'Fixture department for integration tests',
    headName: 'Head',
    email: 'dept@example.invalid',
    phone: '000-000-0000',
    activeIncidentsCount: 0,
    createdAt: isoNow(),
    ...overrides,
  };
}

export function makeReport(citizen: User, overrides: Partial<Report> = {}): Report {
  return {
    id: uniqueId('REP'),
    title: 'Pothole on Test Street',
    description: 'A pothole approximately two meters wide blocks traffic on the test street.',
    category: 'Roads & Traffic',
    locationName: 'Test Street, Sector 4',
    latitude: 40.7128,
    longitude: -74.006,
    citizenId: citizen.id,
    citizenName: citizen.name,
    citizenEmail: citizen.email,
    status: 'analyzed',
    urgency: 'medium',
    createdAt: isoNow(),
    updatedAt: isoNow(),
    ...overrides,
  };
}

export function makeSpatioTemporalCluster(reportIds: string[]): SpatioTemporalCluster {
  return {
    clusterId: uniqueId('CLUSTER'),
    category: 'Roads & Traffic',
    centroid: { latitude: 40.7128, longitude: -74.006 },
    radiusMeters: 250,
    reportIds,
    reportCount: reportIds.length,
    suggestedTitle: 'Test cluster',
    severity: 'medium',
    priority: 'P3_MEDIUM',
    confidence: 0.85,
    evidence: ['evidence-1', 'evidence-2'],
    timeSpanHours: 2,
  };
}

export function makeResolution(overrides: Partial<Resolution> = {}): Resolution {
  return {
    id: uniqueId('RES'),
    incidentId: overrides.incidentId ?? uniqueId('INC'),
    resolvedBy: 'Test Officer',
    actionTaken: 'Repaired the pothole and repaved the segment.',
    preventiveMeasures: 'Added inspection schedule.',
    costEstimate: 1250,
    citizenVerified: false,
    resolvedAt: isoNow(),
    ...overrides,
  };
}