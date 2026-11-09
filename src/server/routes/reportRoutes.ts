// SCIP Backend - Report Management Routes

import { Router, Response } from 'express';
import { getDb } from '../../database/initMongo.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { reportCreateRateLimiter, validateBody, validateQuery, createReportSchema, updateReportSchema, reportQuerySchema } from '../middleware/security.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { ReportAccessDeniedError, ReportService } from '../services/reportService.js';

const router = Router();

// GET /api/reports
router.get('/', authenticate, validateQuery(reportQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { category, status, urgency, myOnly, page = 1, pageSize = 25 } = req.query;

  const filter: { citizenId?: string; category?: string; status?: string; urgency?: string } = {};
  if (category) filter.category = String(category);
  if (status) filter.status = String(status);
  if (urgency) filter.urgency = String(urgency);

  // If citizen requests reports or `myOnly=true`, default to their own reports
  if (req.user?.role === 'citizen' || myOnly === 'true') {
    filter.citizenId = req.user?.id;
  }

  const pageNumber = Number(page);
  const limit = Number(pageSize);
  const { reports, total } = await new ReportService(getDb()).listReports(
    filter,
    { skip: (pageNumber - 1) * limit, limit }
  );
  res.json({
    success: true,
    data: reports,
    meta: {
      total,
      page: pageNumber,
      pageSize: limit
    }
  });
}));

// GET /api/reports/:id
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const details = await new ReportService(getDb()).getReportDetails(req.params.id, req.user!);
    if (!details) {
    res.status(404).json({
      success: false,
      message: `Report ${req.params.id} not found.`
    });
    return;
    }

    res.json({
      success: true,
      data: {
        report: details.report,
        analysis: details.analysis || null
      }
    });
  } catch (error) {
    if (error instanceof ReportAccessDeniedError) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own reports.',
        errors: ['Insufficient permissions to access this report.']
      });
      return;
    }
    throw error;
  }
}));

// POST /api/reports - Citizen submits new report
router.post(
  '/',
  reportCreateRateLimiter,
  authenticate,
  requirePermission('report.create'),
  validateBody(createReportSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        category,
        subcategory,
        locationName,
        latitude,
        longitude,
        urgency = 'medium',
        images
      } = req.body;

      const user = req.user!;
      const { report, analysis } = await new ReportService(getDb()).createReport({
        title,
        description,
        category,
        subcategory,
        locationName,
        latitude,
        longitude,
        citizenId: user.id,
        citizenName: user.name,
        citizenEmail: user.email,
        urgency,
        images: images || []
      });

      res.status(201).json({
        success: true,
        message: 'Report submitted and processed by SCIP intelligence pipeline.',
        data: {
          report,
          analysis
        }
      });
    } catch (err: unknown) {
      if (err instanceof Error && (err.message === 'DUPLICATE_REPORT' || err.message === 'REPORT_REFERENCE_NOT_FOUND')) {
        res.status(409).json({ success: false, message: 'The report could not be created because it conflicts with existing data.' });
        return;
      }
      throw err;
    }
  })
);

// PUT /api/reports/:id
router.put('/:id', authenticate, validateBody(updateReportSchema), asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    const report = await getDb().getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }
    // Ownership check: citizens can only update their own reports
    if (user.role === 'citizen' && report.citizenId !== user.id) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You can only update your own reports.',
        errors: ['Insufficient permissions to modify this report.']
      });
      return;
    }
    if (user.role === 'citizen' && Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Citizens cannot change report workflow status.',
        errors: ['Insufficient permissions to modify report status.']
      });
      return;
    }
    const updated = await new ReportService(getDb()).updateReport(req.params.id, req.body, user);
    res.json({
      success: true,
      message: 'Report updated successfully.',
      data: updated
    });
  } catch (err: unknown) {
    if (err instanceof Error && ['Report not found', 'Unauthorized to edit this report', 'Report cannot be modified once linked or investigated'].includes(err.message)) {
      const status = err.message === 'Report not found' ? 404 : 403;
      res.status(status).json({ success: false, message: err.message });
      return;
    }
    throw err;
  }
}));

// POST /api/reports/:id/reanalyze
router.post(
  '/:id/reanalyze',
  authenticate,
  requirePermission('intelligence.read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const report = await getDb().getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const freshAnalysis = await getDb().runAndStoreAIAnalysis(report, true);
    res.json({
      success: true,
      message: 'AI re-analysis completed.',
      data: freshAnalysis
    });
  })
);

export default router;
