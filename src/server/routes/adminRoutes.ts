// SCIP Backend - Administrative & Governance Routes

import { Router, Response } from 'express';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, requirePermission, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/admin/users
router.get(
  '/users',
  authenticate,
  requirePermission('user.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const users = db.getUsers();
    res.json({
      success: true,
      data: users,
      meta: { total: users.length }
    });
  }
);

// PUT /api/admin/users/:id/role
router.put(
  '/users/:id/role',
  authenticate,
  requirePermission('admin.manage'),
  (req: AuthenticatedRequest, res: Response): void => {
    try {
      const { role } = req.body;
      if (!role) {
        res.status(400).json({ success: false, message: 'Role is required.' });
        return;
      }

      const updated = db.updateUserRole(req.params.id, role, req.user!);
      res.json({
        success: true,
        message: `User role updated to ${role}.`,
        data: updated
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message
      });
    }
  }
);

// GET /api/admin/departments
router.get(
  '/departments',
  authenticate,
  (req: AuthenticatedRequest, res: Response): void => {
    const depts = db.getDepartments();
    res.json({
      success: true,
      data: depts
    });
  }
);

// GET /api/admin/audit-logs
router.get(
  '/audit-logs',
  authenticate,
  requirePermission('audit.read'),
  (req: AuthenticatedRequest, res: Response): void => {
    const { module, action, userId } = req.query;

    const logs = db.getAuditLogs({
      module: module ? String(module) : undefined,
      action: action ? String(action) : undefined,
      userId: userId ? String(userId) : undefined
    });

    res.json({
      success: true,
      data: logs,
      meta: { total: logs.length }
    });
  }
);

// GET /api/admin/system-stats
router.get(
  '/system-stats',
  authenticate,
  requireRole(['authority', 'admin']),
  (req: AuthenticatedRequest, res: Response): void => {
    const mem = process.memoryUsage();
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
          status: 'CONNECTED_IN_MEMORY_PERSISTED',
          usersCount: db.getUsers().length,
          reportsCount: db.getReports().length,
          incidentsCount: db.getIncidents().length,
          auditLogsCount: db.getAuditLogs().length
        }
      }
    });
  }
);

export default router;
