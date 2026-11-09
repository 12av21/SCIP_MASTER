import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

let serverProc: any;
let baseUrl = "";

before(async () => {
  // Start server in production mode
  process.env.NODE_ENV = "production";
  process.env.PORT = "0"; // let OS assign
  serverProc = spawn("npx", ["tsx", "server.ts"], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Wait for server to report listening
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server start timeout")), 15000);
    serverProc.stdout.on("data", (data: Buffer) => {
      const txt = data.toString();
      const match = txt.match(/running on http:\/\/0\.0\.0\.0:(\d+)/);
      if (match) {
        clearTimeout(timeout);
        baseUrl = `http://127.0.0.1:${match[1]}`;
        resolve();
      }
    });
    serverProc.stderr.on("data", (data: Buffer) => {
      console.error("SERVER ERR:", data.toString());
    });
  });
});

after(async () => {
  if (serverProc) {
    serverProc.kill("SIGINT");
    await new Promise(r => serverProc.on("exit", r));
  }
});

async function postJson(path: string, body: object) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

test("demo-login unavailable in production", async () => {
  const { status } = await postJson("/api/auth/demo-login", { role: "citizen" });
  assert.equal(status, 404);
});

test("tests/run unavailable in production", async () => {
  const { status } = await postJson("/api/tests/run", {});
  assert.equal(status, 404);
});