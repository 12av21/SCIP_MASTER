// SCIP Backend - Administrative & Governance Routes

import { Router, Response } from 'express';
import { getDb } from '../../database/initMongo.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  auditLogQuerySchema,
  paginationQuerySchema,
  updateUserRoleSchema,
  validateBody,
  validateQuery
} from '../middleware/security.js';

const router = Router();

// GET /api/admin/users
router.get(
  '/users',
  authenticate,
  requirePermission('user.read'),
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    const users = await getDb().getUsers({ skip: (page - 1) * pageSize, limit: pageSize });
    const total = await getDb().countUsers();
    res.json({
      success: true,
      data: users,
      meta: { total, page, pageSize }
    });
  })
);

// PUT /api/admin/users/:id/role
router.put(
  '/users/:id/role',
  authenticate,
  requirePermission('admin.manage'),
  validateBody(updateUserRoleSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { role } = req.body;
      const updated = await getDb().updateUserRole(req.params.id, role, req.user!);
      res.json({
        success: true,
        message: `User role updated to ${role}.`,
        data: updated
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'User not found') {
        res.status(404).json({ success: false, message: err.message });
        return;
      }
      throw err;
    }
  })
);

// GET /api/admin/departments
router.get(
  '/departments',
  authenticate,
  validateQuery(paginationQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    const depts = await getDb().getDepartments({ skip: (page - 1) * pageSize, limit: pageSize });
    res.json({
      success: true,
      data: depts,
      meta: { page, pageSize }
    });
  })
);

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  requirePermission('audit.read'),
  validateQuery(auditLogQuerySchema),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { module, action, userId } = req.query;
    const page = Number(req.query.page);
    const pageSize = Number(req.query.pageSize);
    const filters = {
      module: module ? String(module) : undefined,
      action: action ? String(action) : undefined,
      userId: userId ? String(userId) : undefined
    };
    const pagination = { skip: (page - 1) * pageSize, limit: pageSize };
    const [logs, total] = await Promise.all([
      getDb().getAuditLogs(filters, pagination),
      getDb().countAuditLogs(filters)
    ]);

    res.json({
      success: true,
      data: logs,
      meta: { total, page, pageSize }
    });
  })
);

// GET /api/admin/system-stats
router.get(
  '/system-stats',
  authenticate,
  requireRole(['authority', 'admin']),
  asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const mem = process.memoryUsage();
    const counts = await getDb().countRecords();
    res.json({
      success: true,
      data: {
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memory: {
          heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
          rssMB: Math.round(mem.rss / 1024 / 1024)
        },
        database: {
          status: 'CONNECTED_MONGODB_PERSISTED',
          usersCount: counts.users,
          reportsCount: counts.reports,
          incidentsCount: counts.incidents,
          auditLogsCount: counts.auditLogs
        }
      }
    });
  })
);

export default router;
