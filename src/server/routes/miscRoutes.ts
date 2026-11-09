// SCIP Backend - Miscellaneous & Verification Routes

import { NextFunction, Request, Router, Response } from 'express';
import { getDb } from '../../database/initMongo.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';
import {
  feedbackSchema,
  paginationQuerySchema,
  requireLocalDevelopmentEndpoint,
  validateBody,
  validateQuery
} from '../middleware/security.js';

const router = Router();

function requireExplicitDevelopmentFixtureSeeding(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'development' || process.env.ENABLE_DEV_FIXTURE_SEEDING !== 'true') {
    res.status(404).json({ success: false, message: 'Not found.' });
    return;
  }
  next();
}

router.get('/health', asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const database = await getDb().healthCheck();
  res.json({
    status: 'healthy',
    platform: 'Smart Community Intelligence Platform (SCIP)',
    version: '1.0.0-enterprise',
    timestamp: new Date().toISOString(),
    services: {
      api: 'operational',
      database: `MongoDB persistence available (${database.database})`,
      aiPipeline: 'ready',
      clusteringEngine: 'ready'
    }
  });
}));

router.get(
  '/notifications',
  authenticate,
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    const [notifications, unreadCount] = await Promise.all([
      getDb().getNotificationsForUser(req.user!.id, { skip: (page - 1) * pageSize, limit: pageSize }),
      getDb().countUnreadNotificationsForUser(req.user!.id)
    ]);
    res.json({
      success: true,
      data: notifications,
      unreadCount,
      meta: { page, pageSize }
    });
  })
);

router.put('/notifications/:id/read', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await getDb().markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success: true, message: 'Notification marked as read.' });
}));

router.post('/notifications/read-all', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  await getDb().markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true, message: 'All notifications marked as read.' });
}));

router.post('/feedback', authenticate, validateBody(feedbackSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { reportId, incidentId, rating, comments } = req.body;
  if (reportId) {
    const report = await getDb().getReportById(reportId);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found.' });
      return;
    }
    if (req.user!.role === 'citizen' && report.citizenId !== req.user!.id) {
      res.status(403).json({ success: false, message: 'Forbidden: You can only submit feedback for your own reports.' });
      return;
    }
  }
  if (incidentId) {
    const incident = await getDb().getIncidentById(incidentId);
    if (!incident) {
      res.status(404).json({ success: false, message: 'Incident not found.' });
      return;
    }
    if (req.user!.role === 'citizen') {
      const reports = await getDb().getReportsByIds(incident.reportIds);
      if (!reports.some(report => report.citizenId === req.user!.id)) {
        res.status(403).json({ success: false, message: 'Forbidden: You can only submit feedback for incidents tied to your reports.' });
        return;
      }
    }
  }
  const feedback = await getDb().submitFeedback({
    reportId,
    incidentId,
    userId: req.user!.id,
    userName: req.user!.name,
    rating,
    comments: comments || ''
  });
  res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully.',
    data: feedback
  });
}));

router.post(
  '/tests/run',
  requireLocalDevelopmentEndpoint,
  requireExplicitDevelopmentFixtureSeeding,
  authenticate,
  requireRole(['admin']),
  (_req: Request, res: Response): void => {
    res.status(410).json({
      success: false,
      message: 'The database-mutating fixture test endpoint is disabled. Run the isolated unit test suite instead.'
    });
  }
);

export default router;
