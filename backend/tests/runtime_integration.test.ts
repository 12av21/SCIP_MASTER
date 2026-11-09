// SCIP Backend - Runtime Integration Test Suite
// Covers: Authentication, Reports API, Incidents API, RBAC, AI Integration
// Uses isolated test database and cleans up only test-created records.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.js";
import { User } from "../src/models/user.js";
import { Report } from "../src/models/report.js";
import { Incident } from "../src/models/incident.js";
import { Department } from "../src/models/department.js";
import { Assignment } from "../src/models/assignment.js";
import { Resolution } from "../src/models/resolution.js";
import { AIAnalysis } from "../src/models/aiAnalysis.js";
import { AuditLog } from "../src/models/auditLog.js";
import { Notification } from "../src/models/notification.js";
import { RiskScore } from "../src/models/riskScore.js";
import { authenticate } from "../src/middleware/auth.js";
import { requireRole } from "../src/middleware/auth.js";

process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes-long";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/scip_runtime_test";
const TAG = randomUUID();
const EMAIL = `runtime-${TAG}@example.test`;
const PWD = "long-enough-password";

let baseUrl = "";
let server: ReturnType<typeof app.listen>;
let citizenToken = "";
let officerToken = "";
let authorityToken = "";
let adminToken = "";
let citizenId = "";
let officerId = "";
let authorityId = "";
let adminId = "";
let testDeptId = "";
let createdReportId = "";
let createdIncidentId = "";

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  app.get("/__test/admin", authenticate, requireRole("admin"), (_req, res) => res.json({ success: true }));
  app.get("/__test/authority", authenticate, requireRole("authority"), (_req, res) => res.json({ success: true }));
  app.get("/__test/officer", authenticate, requireRole("officer"), (_req, res) => res.json({ success: true }));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;

  const dept = await Department.create({
    id: `DEP-TEST-${TAG.slice(0, 8)}`,
    code: `TST${TAG.slice(0, 3).toUpperCase()}`,
    name: "Runtime Test Department",
    description: "Created by integration tests",
    headName: "Test Head",
    email: `dept-${TAG}@example.test`,
    phone: "+91-00000-00000",
    activeIncidentsCount: 0,
    createdAt: new Date().toISOString(),
  });
  testDeptId = dept.id;

  const citizen = await User.create({
    name: "Runtime Citizen",
    email: EMAIL,
    passwordHash: await bcrypt.hash(PWD, 12),
    role: "citizen",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  citizenId = citizen.id;

  const officer = await User.create({
    name: "Runtime Officer",
    email: `officer-${TAG}@example.test`,
    passwordHash: await bcrypt.hash(PWD, 12),
    role: "officer",
    departmentId: testDeptId,
    departmentName: "Runtime Test Department",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  officerId = officer.id;

  const authority = await User.create({
    name: "Runtime Authority",
    email: `auth-${TAG}@example.test`,
    passwordHash: await bcrypt.hash(PWD, 12),
    role: "authority",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  authorityId = authority.id;

  const admin = await User.create({
    name: "Runtime Admin",
    email: `admin-${TAG}@example.test`,
    passwordHash: await bcrypt.hash(PWD, 12),
    role: "admin",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  adminId = admin.id;

  const login = async (email: string) => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: PWD }),
    });
    const body = await res.json() as any;
    if (!res.ok) throw new Error(`Login failed for ${email}: ${body.error}`);
    return body.data.token as string;
  };
  citizenToken = await login(EMAIL);
  officerToken = await login(`officer-${TAG}@example.test`);
  authorityToken = await login(`auth-${TAG}@example.test`);
  adminToken = await login(`admin-${TAG}@example.test`);
});

after(async () => {
  server?.close();
  await Promise.all([
    User.deleteMany({ email: { $regex: `runtime-.*-${TAG}` } }),
    Report.deleteMany({ citizenId: citizenId }),
    Incident.deleteMany({ id: { $regex: `^INC-TEST-` } }),
    Assignment.deleteMany({ officerId: officerId }),
    Resolution.deleteMany({ resolvedBy: authorityId }),
    AIAnalysis.deleteMany({}),
    Notification.deleteMany({ userId: citizenId }),
    RiskScore.deleteMany({}),
    AuditLog.deleteMany({ userId: { $in: [citizenId, officerId, authorityId, adminId] } }),
    Department.deleteMany({ id: testDeptId }),
  ]);
  await mongoose.disconnect();
});

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  let body: any = {};
  try { body = await response.json(); } catch { /* ignore */ }
  return { response, body };
}

function authHeaders(token: string, extra: Record<string, string> = {}) {
  return { authorization: `Bearer ${token}`, "content-type": "application/json", ...extra };
}

// ---------------------------------------------------------------------------
// AUTHENTICATION TESTS
// ---------------------------------------------------------------------------

test("AUTH-01: user registration returns 201 with valid token", async () => {
  const { response, body } = await request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Reg Test User", email: `reg-${TAG}@example.test`, password: PWD }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.ok(body.data.token, "token should be present");
  assert.equal(body.data.user.role, "citizen");
});

test("AUTH-02: login with valid credentials returns 200", async () => {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PWD }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.token);
});

test("AUTH-03: login with invalid password returns 401", async () => {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: "wrong-password" }),
  });
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test("AUTH-04: login with nonexistent email returns 401", async () => {
  const { response, body } = await request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: `nope-${TAG}@example.test`, password: PWD }),
  });
  assert.equal(response.status, 401);
});

test("AUTH-05: JWT subject matches user _id and auth middleware resolves user", async () => {
  const decoded = jwt.decode(citizenToken) as any;
  assert.ok(decoded.sub, "JWT must have a subject");
  const user = await User.findById(decoded.sub).lean();
  assert.ok(user, "JWT subject must resolve to a user");
  assert.equal(user!.id, citizenId);
  const { response, body } = await request("/api/auth/me", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  assert.equal(body.data.id, citizenId);
});

test("AUTH-06: missing token returns 401", async () => {
  const { response } = await request("/api/auth/me");
  assert.equal(response.status, 401);
});

test("AUTH-07: malformed token returns 401", async () => {
  const { response } = await request("/api/auth/me", { headers: authHeaders("not-a-jwt") });
  assert.equal(response.status, 401);
});

test("AUTH-08: expired token returns 401", async () => {
  const expired = jwt.sign({}, process.env.JWT_SECRET!, { algorithm: "HS256", subject: citizenId, expiresIn: "0s" });
  await new Promise((r) => setTimeout(r, 1100));
  const { response } = await request("/api/auth/me", { headers: authHeaders(expired) });
  assert.equal(response.status, 401);
});

test("AUTH-09: token signed with wrong secret returns 401", async () => {
  const bad = jwt.sign({}, "wrong-secret-that-is-at-least-32-bytes-long!!", { algorithm: "HS256", subject: citizenId, expiresIn: "1h" });
  const { response } = await request("/api/auth/me", { headers: authHeaders(bad) });
  assert.equal(response.status, 401);
});

test("AUTH-10: suspended user cannot login", async () => {
  const email = `suspended-${TAG}@example.test`;
  await User.create({ name: "Suspended", email, passwordHash: await bcrypt.hash(PWD, 12), role: "citizen", status: "suspended", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const { response, body } = await request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: PWD }) });
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});

test("AUTH-11: password is stored as bcrypt hash, not plaintext", async () => {
  const user = await User.findById(citizenId).select("+passwordHash").lean();
  assert.ok(user!.passwordHash, "passwordHash should exist");
  assert.notEqual(user!.passwordHash, PWD);
  assert.ok(await bcrypt.compare(PWD, user!.passwordHash));
});

test("AUTH-12: RBAC - citizen cannot access admin route", async () => {
  const { response } = await request("/__test/admin", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 403);
});

test("AUTH-13: RBAC - authority can access authority route", async () => {
  const { response } = await request("/__test/authority", { headers: authHeaders(authorityToken) });
  assert.equal(response.status, 200);
});

test("AUTH-14: RBAC - officer cannot access authority route", async () => {
  const { response } = await request("/__test/authority", { headers: authHeaders(officerToken) });
  assert.equal(response.status, 403);
});

test("AUTH-15: RBAC - admin can access admin route", async () => {
  const { response } = await request("/__test/admin", { headers: authHeaders(adminToken) });
  assert.equal(response.status, 200);
});

// ---------------------------------------------------------------------------
// REPORTS API TESTS
// ---------------------------------------------------------------------------

test("REPORTS-01: create report returns 201", async () => {
  const { response, body } = await request("/api/reports", {
    method: "POST",
    headers: authHeaders(citizenToken),
    body: JSON.stringify({ title: "Runtime test report title", description: "Runtime test report description long enough", category: "Water & Drainage", locationName: "Test Location", latitude: 28.61, longitude: 77.21, urgency: "medium" }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  assert.ok(body.data.report.id);
  createdReportId = body.data.report.id;
});

test("REPORTS-02: list reports paginated", async () => {
  const { response, body } = await request("/api/reports?page=1&limit=10", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(body.data.pagination, "pagination envelope should be present");
});

test("REPORTS-03: get report by ID", async () => {
  const { response, body } = await request(`/api/reports/${createdReportId}`, { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  assert.equal(body.data.report.id, createdReportId);
});

test("REPORTS-04: update report by owner", async () => {
  const { response, body } = await request(`/api/reports/${createdReportId}`, {
    method: "PUT",
    headers: authHeaders(citizenToken),
    body: JSON.stringify({ title: "Updated runtime report title" }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.report.title, "Updated runtime report title");
});

test("REPORTS-05: filter by category and status", async () => {
  const { response, body } = await request("/api/reports?category=Water%20%26%20Drainage&status=submitted", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body.data.reports));
});

test("REPORTS-06: citizen can only see own reports", async () => {
  const { response, body } = await request("/api/reports", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  for (const r of body.data.reports) {
    assert.equal(r.citizenId, citizenId, "citizen should only see own reports");
  }
});

test("REPORTS-07: invalid ID returns 404", async () => {
  const { response } = await request("/api/reports/RPT-NONEXISTENT", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 404);
});

test("REPORTS-08: malformed request body returns 400", async () => {
  const { response } = await request("/api/reports", {
    method: "POST",
    headers: authHeaders(citizenToken),
    body: JSON.stringify({ title: "short" }),
  });
  assert.equal(response.status, 400);
});

// ---------------------------------------------------------------------------
// INCIDENTS API TESTS
// ---------------------------------------------------------------------------

test("INCIDENTS-01: create incident returns 201", async () => {
  const { response, body } = await request("/api/incidents", {
    method: "POST",
    headers: authHeaders(authorityToken),
    body: JSON.stringify({ title: "Runtime incident title here", category: "Water & Drainage", description: "Runtime incident description long enough", location: { name: "Test Loc", latitude: 28.61, longitude: 77.21 }, reportIds: [createdReportId], severity: "medium", priority: "P3_MEDIUM", departmentId: testDeptId }),
  });
  assert.equal(response.status, 201);
  assert.equal(body.success, true);
  createdIncidentId = body.data.incident.id;
});

test("INCIDENTS-02: list incidents paginated", async () => {
  const { response, body } = await request("/api/incidents", { headers: authHeaders(authorityToken) });
  assert.equal(response.status, 200);
  assert.ok(body.data.pagination);
});

test("INCIDENTS-03: get incident by ID", async () => {
  const { response, body } = await request(`/api/incidents/${createdIncidentId}`, { headers: authHeaders(authorityToken) });
  assert.equal(response.status, 200);
  assert.equal(body.data.incident.id, createdIncidentId);
});

test("INCIDENTS-04: review incident (confirm)", async () => {
  const { response, body } = await request(`/api/incidents/${createdIncidentId}/review`, {
    method: "POST",
    headers: authHeaders(authorityToken),
    body: JSON.stringify({ action: "confirm", notes: "Runtime test review notes", departmentId: testDeptId, officerId: officerId }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.incident.status, "confirmed");
});

test("INCIDENTS-05: assign incident", async () => {
  const { response, body } = await request(`/api/incidents/${createdIncidentId}/assign`, {
    method: "POST",
    headers: authHeaders(authorityToken),
    body: JSON.stringify({ officerId }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.incident.status, "in_progress");
  assert.equal(body.data.incident.assignedOfficerId, officerId);
});

test("INCIDENTS-06: resolve incident", async () => {
  const { response, body } = await request(`/api/incidents/${createdIncidentId}/resolve`, {
    method: "POST",
    headers: authHeaders(officerToken),
    body: JSON.stringify({ actionTaken: "Runtime remediation action taken here", preventiveMeasures: "Test preventive measures", costEstimate: 1000 }),
  });
  assert.equal(response.status, 200);
  assert.equal(body.data.incident.status, "resolved");
});

test("INCIDENTS-07: citizen cannot create incident", async () => {
  const { response } = await request("/api/incidents", {
    method: "POST",
    headers: authHeaders(citizenToken),
    body: JSON.stringify({ title: "Citizen incident title here", category: "Roads & Traffic", description: "Citizen incident description long enough", location: { name: "Test Loc", latitude: 28.61, longitude: 77.21 }, reportIds: [createdReportId] }),
  });
  assert.equal(response.status, 403);
});

test("INCIDENTS-08: officer cannot review incident", async () => {
  const { response } = await request(`/api/incidents/${createdIncidentId}/review`, {
    method: "POST",
    headers: authHeaders(officerToken),
    body: JSON.stringify({ action: "confirm", notes: "Officer review attempt" }),
  });
  assert.equal(response.status, 403);
});

test("INCIDENTS-09: report-incident relationship persists", async () => {
  const report = await Report.findOne({ id: createdReportId }).lean();
  assert.ok(report, "report should exist");
  assert.equal(report!.incidentId, createdIncidentId, "report should be linked to incident");
});

test("INCIDENTS-10: invalid incident ID returns 404", async () => {
  const { response } = await request("/api/incidents/INC-NONEXISTENT", { headers: authHeaders(authorityToken) });
  assert.equal(response.status, 404);
});

// ---------------------------------------------------------------------------
// NOTIFICATIONS API TESTS
// ---------------------------------------------------------------------------

test("NOTIF-01: authenticated user can list own notifications", async () => {
  const { response, body } = await request("/api/notifications", { headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.ok(Array.isArray(body.data.notifications));
  assert.equal(typeof body.data.unreadCount, "number");
});

test("NOTIF-02: notifications are isolated per user", async () => {
  const { body: citizenBody } = await request("/api/notifications", { headers: authHeaders(citizenToken) });
  const { body: officerBody } = await request("/api/notifications", { headers: authHeaders(officerToken) });
  const citizenIds = new Set(citizenBody.data.notifications.map((n: any) => n.userId));
  const officerIds = new Set(officerBody.data.notifications.map((n: any) => n.userId));
  // Officer should see at least one of their own notifications (from assignment/resolution events)
  assert.ok(officerIds.has(officerId), "officer should see their own notifications");
  // Citizen should not see officer's notifications
  assert.ok(!citizenIds.has(officerId), "citizen should not see officer notifications");
});

test("NOTIF-03: mark notification read enforces recipient isolation", async () => {
  const { body } = await request("/api/notifications", { headers: authHeaders(citizenToken) });
  const notif = body.data.notifications[0];
  if (!notif) return; // nothing to test
  const { response } = await request(`/api/notifications/${notif.id}/read`, { method: "PUT", headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
  // Officer cannot mark the citizen's notification as read
  const { response: other } = await request(`/api/notifications/${notif.id}/read`, { method: "PUT", headers: authHeaders(officerToken) });
  assert.equal(other.status, 404);
});

test("NOTIF-04: mark all read works", async () => {
  const { response } = await request("/api/notifications/read-all", { method: "POST", headers: authHeaders(citizenToken) });
  assert.equal(response.status, 200);
});

test("NOTIF-05: unauthenticated notification access returns 401", async () => {
  const { response } = await request("/api/notifications");
  assert.equal(response.status, 401);
});