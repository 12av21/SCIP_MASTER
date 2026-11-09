import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { app } from "../src/app.js";
import { User } from "../src/models/user.js";
import { authenticate, requireRole } from "../src/middleware/auth.js";

process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes-long";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/scip_auth_test";
const testId = randomUUID();
const createdEmails = [`auth-suite-${testId}@example.test`, `inactive-suite-${testId}@example.test`, `admin-suite-${testId}@example.test`];
let baseUrl = "";
let server: ReturnType<typeof app.listen>;

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  app.get("/__test/admin", authenticate, requireRole("admin"), (_req, res) => res.json({ success: true }));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind a TCP port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server?.close();
  await User.deleteMany({ email: { $in: createdEmails } });
  await mongoose.disconnect();
});

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  return { response, body: await response.json() as Record<string, any> };
}

test("health endpoint remains available", async () => {
  const { response, body } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(body.status, "healthy");
});

test("registration validates data, fixes citizen role, hashes password, and handles duplicates", async () => {
  const send = (data: object) => request("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  assert.equal((await send({ name: "Test Person", email: "bad", password: "long-enough-password" })).response.status, 400);
  assert.equal((await send({ name: "Test Person", email: "weak@example.test", password: "short" })).response.status, 400);
  assert.equal((await send({ name: "Test Person", email: createdEmails[0], password: "long-enough-password", role: "admin" })).response.status, 400);
  assert.equal((await send({ name: "Test Person", email: createdEmails[0], password: "long-enough-password", isActive: false })).response.status, 400);
  const created = await send({ name: "Test Person", email: createdEmails[0], password: "long-enough-password" });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.user.role, "citizen");
  assert.equal("passwordHash" in created.body.data.user, false);
  const doc = await User.findOne({ email: createdEmails[0] }).select("+passwordHash");
  assert.ok(doc?.passwordHash && doc.passwordHash !== "long-enough-password");
  assert.equal((await send({ name: "Test Person", email: createdEmails[0], password: "long-enough-password" })).response.status, 409);
});

test("login, profile, account status, token validation, and RBAC", async () => {
  const send = (data: object) => request("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const login = await send({ email: createdEmails[0], password: "long-enough-password" });
  assert.equal(login.response.status, 200);
  const token = login.body.data.token as string;
  assert.equal((await send({ email: createdEmails[0], password: "wrong-password" })).response.status, 401);
  assert.equal((await request("/api/auth/me")).response.status, 401);
  assert.equal((await request("/api/auth/me", { headers: { authorization: "Bearer invalid" } })).response.status, 401);
  const expired = jwt.sign({}, process.env.JWT_SECRET!, { subject: login.body.data.user.id, expiresIn: -1 });
  assert.equal((await request("/api/auth/me", { headers: { authorization: `Bearer ${expired}` } })).response.status, 401);
  const me = await request("/api/auth/me", { headers: { authorization: `Bearer ${token}` } });
  assert.equal(me.response.status, 200);
  assert.equal(me.body.data.email, createdEmails[0]);
  assert.equal("passwordHash" in me.body.data, false);
  assert.equal((await request("/__test/admin", { headers: { authorization: `Bearer ${token}` } })).response.status, 403);
  await User.create({ name: "Inactive", email: createdEmails[1], passwordHash: "unused", isActive: false });
  assert.equal((await send({ email: createdEmails[1], password: "long-enough-password" })).response.status, 401);
  await User.create({ name: "Test Admin", email: createdEmails[2], passwordHash: await bcrypt.hash("long-enough-password", 4), role: "admin" });
  const admin = await send({ email: createdEmails[2], password: "long-enough-password" });
  assert.equal(admin.response.status, 200);
  assert.equal((await request("/__test/admin", { headers: { authorization: `Bearer ${admin.body.data.token}` } })).response.status, 200);
});
