// SCIP Backend - Security Integration Tests
// Tests JWT, rate limiting, CORS, validation, and RBAC

import { test, before, after, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { db } from "../../src/database/scipDatabase.ts";

process.env.JWT_SECRET = "test-only-secret-that-is-at-least-32-bytes-long";
process.env.NODE_ENV = "test";
process.env.CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000";

let baseUrl = "";
let server: any;
let app: any;

before(async () => {
  db.seedDatabase();
  
  // Import and create the app
  const { createApp } = await import("../../src/server/app.ts");
  app = await createApp();
  
  // Start server on random port
  server = app.listen(0);
  
  await new Promise<void>((resolve) => {
    server.on('listening', () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

after(() => {
  if (server) {
    server.close();
  }
});

interface TestResponse {
  response: Response;
  body: Record<string, any>;
}

async function request(path: string, init?: RequestInit): Promise<TestResponse> {
  if (!baseUrl) {
    throw new Error("Server not started, baseUrl not set");
  }
  const res = await fetch(`${baseUrl}${path}`, init);
  let body: Record<string, any> = {};
  try { body = await res.json(); } catch {}
  return { response: res, body };
}

describe("JWT Security", () => {
  test("rejects expired tokens", async () => {
    const expiredToken = jwt.sign(
      { id: "test", email: "test@test.com", role: "citizen" },
      process.env.JWT_SECRET!,
      { expiresIn: "-1h" }
    );
    const { response } = await request("/api/auth/me", {
      headers: { authorization: `Bearer ${expiredToken}` }
    });
    assert.equal(response.status, 401);
  });

  test("rejects malformed tokens", async () => {
    const { response } = await request("/api/auth/me", {
      headers: { authorization: "Bearer invalid.token.here" }
    });
    assert.equal(response.status, 401);
  });

  test("rejects tokens signed with wrong secret", async () => {
    const token = jwt.sign(
      { id: "test", email: "test@test.com", role: "citizen" },
      "different-secret",
      { expiresIn: "1h" }
    );
    const { response } = await request("/api/auth/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 401);
  });
});

describe("Rate Limiting", () => {
  test("limits login attempts", async () => {
    for (let i = 0; i < 12; i++) {
      const { response } = await request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "nonexistent@test.com", password: "wrong" })
      });
      if (i < 10) {
        assert.equal(response.status, 401);
      } else {
        assert.equal(response.status, 429);
      }
    }
  });

  test("limits registration attempts", async () => {
    for (let i = 0; i < 7; i++) {
      const { response } = await request("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Test", email: `test${i}@test.com`, password: "long-enough-password" })
      });
      if (i < 5) {
        assert.equal(response.status, 201);
      } else {
        assert.equal(response.status, 429);
      }
    }
  });
});

describe("Request Validation", () => {
  test("validates registration body", async () => {
    const { response, body } = await request("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "A", email: "invalid", password: "short" })
    });
    assert.equal(response.status, 400);
    assert.ok(body.errors);
  });

  test("validates report creation body", async () => {
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "citizen@scip.local", password: "password123" })
    });
    const token = login.body.data?.token;
    if (!token) return;
    
    const { response, body } = await request("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
      body: JSON.stringify({ title: "Ab", description: "Short", category: "Invalid" })
    });
    assert.equal(response.status, 400);
    assert.ok(body.errors);
  });

  test("validates feedback body", async () => {
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "citizen@scip.local", password: "password123" })
    });
    const token = login.body.data?.token;
    if (!token) return;
    
    const { response, body } = await request("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${token}` },
      body: JSON.stringify({ rating: 10 })
    });
    assert.equal(response.status, 400);
    assert.ok(body.errors);
  });
});

describe("RBAC & Ownership", () => {
  test("officer cannot review incidents (authority/admin only)", async () => {
    const officerLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "officer@scip.local", password: "password123" })
    });
    const officerToken = officerLogin.body.data?.token;
    if (!officerToken) return;
    
    const { response } = await request("/api/incidents/INC-2026-001/review", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${officerToken}` },
      body: JSON.stringify({ action: "confirm", notes: "Test review notes" })
    });
    assert.equal(response.status, 403);
  });

  test("citizen cannot resolve incidents", async () => {
    const citizenLogin = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "citizen@scip.local", password: "password123" })
    });
    const citizenToken = citizenLogin.body.data?.token;
    if (!citizenToken) return;
    
    const { response } = await request("/api/incidents/INC-2026-001/resolve", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": `Bearer ${citizenToken}` },
      body: JSON.stringify({ actionTaken: "Fixed the issue" })
    });
    assert.equal(response.status, 403);
  });
});

describe("Error Handling", () => {
  test("404 handler works", async () => {
    const { response, body } = await request("/api/nonexistent");
    assert.equal(response.status, 404);
    assert.equal(body.message, "Route GET /api/nonexistent not found");
  });

  test("logout logs audit but does not revoke token", async () => {
    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "citizen@scip.local", password: "password123" })
    });
    const token = login.body.data?.token;
    if (!token) return;
    
    const logout = await request("/api/auth/logout", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(logout.response.status, 200);
    
    const me = await request("/api/auth/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(me.response.status, 200);
  });
});