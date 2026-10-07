// SCIP Backend - Incident Lifecycle & Human Review Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission } from '../middleware/auth.js';

const router = Router();

// GET /api/incidents
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const { status, category, priority } = req.query;

  const incidents = db.getIncidents({
    status: status ? String(status) : undefined,
    category: category ? String(category) : undefined,
    priority: priority ? String(priority) : undefined
  });

  res.json({
    success: true,
    data: incidents,
    meta: {
      total: incidents.length
    }
  });
});

// GET /api/incidents/:id
router.get('/:id', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  const incident = db.getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({
      success: false,
      message: `Incident ${req.params.id} not found.`
    });
    return;
  }

  // Fetch all linked reports
  const allReports = db.getReports();
  const linkedReports = allReports.filter(r => incident.reportIds.includes(r.id));

  res.json({
    success: true,
    data: {
      incident,
      linkedReports
    }
  });
});

// POST /api/incidents/from-cluster
router.post(
  '/from-cluster',
  authenticate,
  requirePermission('incident.create'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { cluster } = req.body;
      if (!cluster || !cluster.reportIds || cluster.reportIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Valid cluster data with report IDs is required.'
        });
        return;
      }

      const newIncident = db.createIncidentFromCluster(cluster, req.user!);
      res.status(201).json({
        success: true,
        message: 'Potential incident created from cluster observation.',
        data: newIncident
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to create incident from cluster.',
        errors: [err.message]
      });
    }
  }
);

// POST /api/incidents/:id/review (Human Review Workflow)
router.post(
  '/:id/review',
  authenticate,
  requirePermission('incident.update'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { action, notes, departmentId, officerId } = req.body;

      if (!action || (action !== 'confirm' && action !== 'dismiss')) {
        res.status(400).json({
          success: false,
          message: 'Action must be "confirm" or "dismiss".'
        });
        return;
      }

      if (!notes) {
        res.status(400).json({
          success: false,
          message: 'Review notes are required for administrative accountability.'
        });
        return;
      }

      const updatedIncident = db.reviewIncident(
        req.params.id,
        action,
        req.user!,
        notes,
        departmentId,
        officerId
      );

      res.json({
        success: true,
        message: `Incident ${req.params.id} has been ${action === 'confirm' ? 'confirmed' : 'dismissed'} by human review.`,
        data: updatedIncident
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message,
        errors: [err.message]
      });
    }
  }
);

// POST /api/incidents/:id/resolve
router.post(
  '/:id/resolve',
  authenticate,
  requirePermission('incident.resolve'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { actionTaken, preventiveMeasures, costEstimate } = req.body;

      if (!actionTaken || actionTaken.length < 5) {
        res.status(400).json({
          success: false,
          message: 'Action taken description is required to document resolution.'
        });
        return;
      }

      const resolved = db.resolveIncident(req.params.id, req.user!, {
        actionTaken,
        preventiveMeasures,
        costEstimate: Number(costEstimate) || undefined
      });

      res.json({
        success: true,
        message: `Incident ${req.params.id} has been marked resolved.`,
        data: resolved
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message,
        errors: [err.message]
      });
    }
  }
);

export default router;
