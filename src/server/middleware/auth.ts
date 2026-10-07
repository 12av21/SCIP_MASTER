// SCIP Backend - Authentication & RBAC Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../database/scipDatabase.ts';
import { User, UserPermission, UserRole } from '../../types/scip.ts';

export const JWT_SECRET = process.env.JWT_SECRET || 'scip-master-secure-jwt-secret-key-2026';

const ROLE_PERMISSIONS: Record<UserRole, UserPermission[]> = {
  citizen: [
    'report.create',
    'report.read',
    'report.update',
    'incident.read'
  ],
  officer: [
    'report.create',
    'report.read',
    'report.update',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read'
  ],
  authority: [
    'user.read',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read',
    'audit.read'
  ],
  admin: [
    'user.read',
    'user.create',
    'user.update',
    'user.delete',
    'report.create',
    'report.read',
    'report.update',
    'report.delete',
    'report.assign',
    'incident.read',
    'incident.create',
    'incident.update',
    'incident.assign',
    'incident.resolve',
    'analytics.read',
    'intelligence.read',
    'audit.read',
    'admin.manage'
  ]
};

export function hasPermission(role: UserRole, permission: UserPermission): boolean {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}
export const AuthenticatedRequest = {} as any;

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication token required.',
      errors: ['Missing or malformed Authorization header.']
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    const user = db.getUserById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User no longer exists or session is invalid.',
        errors: ['Invalid user session.']
      });
      return;
    }

    if (user.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'Your account has been suspended by system administrators.',
        errors: ['Account suspended.']
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication session.',
      errors: [err.message]
    });
  }
}

export function requirePermission(permission: UserPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      db.logAudit({
        action: 'SECURITY_EVENT',
        module: 'security',
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Access denied: User lacked required permission "${permission}"`
      });

      res.status(403).json({
        success: false,
        message: `Forbidden: Lacks required permission '${permission}'`,
        errors: [`Your role '${req.user.role}' is not authorized to perform this operation.`]
      });
      return;
    }

    next();
  };
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Allowed roles: ${allowedRoles.join(', ')}`,
        errors: [`Your role '${req.user.role}' cannot access this endpoint.`]
      });
      return;
    }

    next();
  };
}
