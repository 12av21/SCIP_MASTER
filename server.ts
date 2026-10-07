// Smart Community Intelligence Platform (SCIP) - Full Stack Server Entry
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isTsx = process.execArgv.some(arg => arg.includes('tsx')) || process.env.__SCIP_TSX_ACTIVE__ === '1';

if (!isTsx) {
  process.env.__SCIP_TSX_ACTIVE__ = '1';
  const child = spawn(process.execPath, ['--import', 'tsx', ...process.argv.slice(1)], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });

  // Keep parent alive while child runs
  process.on('SIGINT', () => child.kill('SIGINT'));
  process.on('SIGTERM', () => child.kill('SIGTERM'));
} else {
  const { startServer } = await import('./src/server/app.ts');
  await startServer();
}
