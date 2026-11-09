// Smart Community Intelligence Platform (SCIP) - Express Application Core
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes';
import reportRoutes from './routes/reportRoutes';
import incidentRoutes from './routes/incidentRoutes';
import intelligenceRoutes from './routes/intelligenceRoutes';
import adminRoutes from './routes/adminRoutes';
import miscRoutes from './routes/miscRoutes';
import { initDatabase, closeDatabase } from '../database/initMongo.js';
import { securityHeaders, corsMiddleware, generalRateLimiter, errorHandler, notFoundHandler } from './middleware/security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export async function createApp() {
  const app = express();

  // Trust first proxy for accurate IP extraction (configure TRUST_PROXY=true in production behind reverse proxy)
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // Security: Prevent accidental enabling of dev-only endpoints in production
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_ENDPOINTS === 'true') {
    console.error('[SCIP] FATAL: ENABLE_DEV_ENDPOINTS is set in production. Refusing to start.');
    process.exit(1);
  }

  // Security headers (Helmet)
  app.use(securityHeaders);

  // CORS with configurable allowlist
  app.use(corsMiddleware);

  // General rate limiting
  app.use(generalRateLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/incidents', incidentRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api', miscRoutes);

  // Error handling (must be after routes)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Development: Vite Middleware Mode; Production: Static dist
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    try {
      // Dynamic import to avoid loading Vite/rolldown native bindings on Windows
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteErr) {
      console.error('[SCIP] Vite middleware init warning:', viteErr);
    }
  }

  return app;
}

export async function startServer() {
  // Initialize MongoDB first
  try {
    await initDatabase();
  } catch (error) {
    console.error('[SCIP] Failed to initialize database, server cannot start:', error);
    process.exit(1);
  }

  const app = await createApp();

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SCIP] Smart Community Intelligence Platform server running on http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[SCIP] Shutting down...');
    await closeDatabase();
    server.close(() => process.exit(0));
  });
  process.on('SIGTERM', async () => {
    console.log('[SCIP] Shutting down...');
    await closeDatabase();
    server.close(() => process.exit(0));
  });

  return server;
}
