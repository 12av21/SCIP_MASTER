// SCIP Backend - Incident Lifecycle & Human Review Routes

import { Router, Response } from 'express';
import { getDb } from '../../database/initMongo.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createIncidentSchema,
  incidentQuerySchema,
  resolveIncidentSchema,
  reviewIncidentSchema,
  validateBody,
  validateQuery
} from '../middleware/security.js';

const router = Router();

export async function getCitizenOwnedReportIds(userId: string): Promise<Set<string>> {
  return new Set(await getDb().getReportIdsByCitizen(userId));
}

export async function filterCitizenVisibleIncidentReportIds(reportIds: string[] | undefined, userId: string): Promise<string[]> {
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    return [];
  }

  const ownedIds = await getCitizenOwnedReportIds(userId);
  return reportIds.filter(reportId => ownedIds.has(reportId));
}

export function filterCitizenVisibleIncidents<T extends { reportIds?: string[] }>(
  incidents: T[],
  userId: string,
  ownedReportIds: Set<string>
): T[] {
  const visibleIncidents: T[] = [];
  for (const incident of incidents) {
    const reportIds = (incident.reportIds || []).filter(reportId => ownedReportIds.has(reportId));
    if (reportIds.length > 0) {
      visibleIncidents.push({ ...incident, reportIds });
    }
  }
  return visibleIncidents;
}

export function createIncidentDetailResponse<
  TIncident extends { id: string; reportIds: string[] },
  TReport extends { id: string; citizenId: string }
>(
  incident: TIncident,
  reports: TReport[],
  user: { id: string; role: string }
): {
  status: 200;
  body: { success: true; data: { incident: TIncident; linkedReports: TReport[] } };
} | {
  status: 403;
  body: { success: false; message: string };
} {
  const linkedReports = reports.filter(report => incident.reportIds.includes(report.id));

  if (user.role !== 'citizen') {
    return {
      status: 200,
      body: { success: true, data: { incident, linkedReports } }
    };
  }

  const visibleReports = linkedReports.filter(report => report.citizenId === user.id);
  if (visibleReports.length === 0) {
    return {
      status: 403,
      body: {
        success: false,
        message: 'Forbidden: You can only view incidents tied to your own reports.'
      }
    };
  }

  const visibleReportIds = visibleReports.map(report => report.id);
  const visibleIncident = { ...incident, reportIds: visibleReportIds };
  return {
    status: 200,
    body: {
      success: true,
      data: {
        incident: visibleIncident,
        linkedReports: visibleReports
      }
    }
  };
}

// GET /api/incidents
router.get('/', authenticate, requirePermission('incident.read'), validateQuery(incidentQuerySchema), asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { status, category, priority, page = 1, pageSize = 25 } = req.query;
  const filter: { status?: string; category?: string; priority?: string; reportIds?: string[] } = {
    status: status ? String(status) : undefined,
    category: category ? String(category) : undefined,
    priority: priority ? String(priority) : undefined
  };
  if (req.user?.role === 'citizen') {
    filter.reportIds = await getDb().getReportIdsByCitizen(req.user.id);
  }

  const pagination = { skip: (Number(page) - 1) * Number(pageSize), limit: Number(pageSize) };
  const [incidents, total] = await Promise.all([
    getDb().getIncidents(filter, pagination),
    getDb().countIncidents(filter)
  ]);
  const visibleIncidents = req.user?.role === 'citizen'
    ? filterCitizenVisibleIncidents(incidents, req.user.id, new Set(filter.reportIds))
    : incidents;
  res.json({
    success: true,
    data: visibleIncidents,
    meta: {
      total,
      page: Number(page),
      pageSize: Number(pageSize)
    }
  });
}));

// GET /api/incidents/:id
router.get('/:id', authenticate, requirePermission('incident.read'), asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const incident = await getDb().getIncidentById(req.params.id);
  if (!incident) {
    res.status(404).json({
      success: false,
      message: `Incident ${req.params.id} not found.`
    });
    return;
  }

  const reports = await getDb().getReportsByIds(incident.reportIds);
  const response = createIncidentDetailResponse(incident, reports, req.user!);
  res.status(response.status).json(response.body);
}));

// POST /api/incidents/from-cluster
router.post(
  '/from-cluster',
  authenticate,
  requirePermission('incident.create'),
  validateBody(createIncidentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { cluster } = req.body;
      const newIncident = await getDb().createIncidentFromCluster(cluster, req.user!);
      res.status(201).json({
        success: true,
        message: 'Potential incident created from cluster observation.',
        data: newIncident
      });
    } catch (err: unknown) {
      if (err instanceof Error && ['INVALID_CLUSTER_REPORTS', 'REPORT_REFERENCE_NOT_FOUND', 'REPORT_ALREADY_LINKED'].includes(err.message)) {
        res.status(409).json({ success: false, message: 'The incident conflicts with existing report links.' });
        return;
      }
      throw err;
    }
  })
);

// POST /api/incidents/:id/review (Human Review Workflow) - authority/admin only
router.post(
  '/:id/review',
  authenticate,
  requireRole(['authority', 'admin']),
  validateBody(reviewIncidentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { action, notes, departmentId, officerId } = req.body;
      const updatedIncident = await getDb().reviewIncident(
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
    } catch (err: unknown) {
      if (err instanceof Error && ['INCIDENT_NOT_FOUND', 'DEPARTMENT_NOT_FOUND', 'OFFICER_NOT_FOUND'].includes(err.message)) {
        const status = err.message === 'INCIDENT_NOT_FOUND' ? 404 : 400;
        res.status(status).json({ success: false, message: err.message.replaceAll('_', ' ').toLowerCase() });
        return;
      }
      throw err;
    }
  })
);

// POST /api/incidents/:id/resolve - officer/authority/admin
router.post(
  '/:id/resolve',
  authenticate,
  requireRole(['officer', 'authority', 'admin']),
  validateBody(resolveIncidentSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { actionTaken, preventiveMeasures, costEstimate } = req.body;
      const resolved = await getDb().resolveIncident(req.params.id, req.user!, {
        actionTaken,
        preventiveMeasures,
        costEstimate: Number(costEstimate) || undefined
      });

      res.json({
        success: true,
        message: `Incident ${req.params.id} has been marked resolved.`,
        data: resolved
      });
    } catch (err: unknown) {
      if (err instanceof Error && ['INCIDENT_NOT_FOUND', 'REPORT_REFERENCE_NOT_FOUND'].includes(err.message)) {
        const status = err.message === 'INCIDENT_NOT_FOUND' ? 404 : 409;
        res.status(status).json({ success: false, message: 'The incident could not be resolved because its linked records are unavailable.' });
        return;
      }
      throw err;
    }
  })
);

export default router;
