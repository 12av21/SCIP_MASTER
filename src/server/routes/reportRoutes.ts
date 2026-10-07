// SCIP Backend - Report Management Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';
import { ReportCategory, UrgencyLevel } from '../../types/scip.js';

const router = Router();

// GET /api/reports
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { category, status, urgency, myOnly } = req.query;

  const filter: any = {};
  if (category) filter.category = String(category);
  if (status) filter.status = String(status);
  if (urgency) filter.urgency = String(urgency);

  // If citizen requests reports or `myOnly=true`, default to their own reports
  if (req.user?.role === 'citizen' || myOnly === 'true') {
    filter.citizenId = req.user?.id;
  }

  const reports = db.getReports(filter);
  res.json({
    success: true,
    data: reports,
    meta: {
      total: reports.length
    }
  });
});

// GET /api/reports/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const report = db.getReportById(req.params.id);
  if (!report) {
    res.status(404).json({
      success: false,
      message: `Report ${req.params.id} not found.`
    });
    return;
  }

  const analysis = db.getAIAnalysisForReport(req.params.id);

  res.json({
    success: true,
    data: {
      report,
      analysis: analysis || null
    }
  });
});

// POST /api/reports - Citizen submits new report
router.post(
  '/',
  authenticate,
  requirePermission('report.create'),
  (req: AuthenticatedRequest, res: Response): void => {
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

      if (!title || !description || !locationName) {
        res.status(400).json({
          success: false,
          message: 'Title, description, and location are required fields.',
          errors: ['Missing mandatory fields.']
        });
        return;
      }

      if (title.length < 5) {
        res.status(400).json({
          success: false,
          message: 'Report title must be at least 5 characters.',
          errors: ['Title too short.']
        });
        return;
      }

      const validLat = Number(latitude) || 28.6139;
      const validLng = Number(longitude) || 77.2090;

      const validCategory: ReportCategory = [
        'Water & Drainage',
        'Roads & Traffic',
        'Public Sanitation',
        'Power & Lighting',
        'Parks & Environment',
        'Structural Safety',
        'Public Health',
        'Noise & Disturbance'
      ].includes(category)
        ? category
        : 'Water & Drainage';

      const validUrgency: UrgencyLevel = ['low', 'medium', 'high', 'critical'].includes(urgency)
        ? urgency
        : 'medium';

      const user = req.user!;
      const { report, analysis } = db.createReport({
        title,
        description,
        category: validCategory,
        subcategory,
        locationName,
        latitude: validLat,
        longitude: validLng,
        citizenId: user.id,
        citizenName: user.name,
        citizenEmail: user.email,
        urgency: validUrgency,
        images: Array.isArray(images) ? images : []
      });

      res.status(201).json({
        success: true,
        message: 'Report submitted and processed by SCIP intelligence pipeline.',
        data: {
          report,
          analysis
        }
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to submit report.',
        errors: [err.message]
      });
    }
  }
);

// PUT /api/reports/:id
router.put('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const user = req.user!;
    const updated = db.updateReport(req.params.id, req.body, user);
    res.json({
      success: true,
      message: 'Report updated successfully.',
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      message: err.message,
      errors: [err.message]
    });
  }
});

// POST /api/reports/:id/reanalyze
router.post(
  '/:id/reanalyze',
  authenticate,
  requirePermission('intelligence.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const report = db.getReportById(req.params.id);
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    const freshAnalysis = db.runAndStoreAIAnalysis(report, true);
    res.json({
      success: true,
      message: 'AI re-analysis completed.',
      data: freshAnalysis
    });
  }
);

export default router;
