// SCIP Backend - Authentication & RBAC Middleware

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getDb } from '../../database/initMongo.js';
import { User, UserPermission, UserRole } from '../../types/scip.ts';

// ============================================================================
// JWT CONFIGURATION
// ============================================================================
const JWT_ALGORITHM = 'HS256' as const;
const JWT_EXPIRY = '7d' as const;

// Never sign or verify tokens with a source-controlled fallback secret.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const knownInsecureSecret = 'scip-master-secure-jwt-secret-key-2026';
  if (
    !secret ||
    secret.trim().length === 0 ||
    Buffer.byteLength(secret, 'utf8') < 32 ||
    secret === knownInsecureSecret
  ) {
    throw new Error('[SCIP] JWT_SECRET must be configured with at least 32 bytes in every environment.');
  }

  return secret;
}

export const JWT_SECRET = getJwtSecret();

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
  let decoded: { id: string; email: string; role: UserRole };
  try {
    decoded = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] }) as { id: string; email: string; role: UserRole };
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Authentication session has expired.',
        errors: ['Token expired. Please log in again.']
      });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        errors: ['Token signature verification failed.']
      });
    } else if (err.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
        errors: ['Token signature verification failed.']
      });
    } else {
      next(err);
    }
    return;
  }

  void getDb().getUserById(decoded.id).then(user => {
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
  }).catch(next);
}

export function requirePermission(permission: UserPermission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthenticated.' });
      return;
    }

    if (!hasPermission(req.user.role, permission)) {
      void getDb().logAudit({
        action: 'SECURITY_EVENT',
        module: 'security',
        userId: req.user.id,
        userEmail: req.user.email,
        userRole: req.user.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Access denied: User lacked required permission "${permission}"`
      }).then(() => {
        res.status(403).json({
          success: false,
          message: `Forbidden: Lacks required permission '${permission}'`,
          errors: [`Your role '${req.user!.role}' is not authorized to perform this operation.`]
        });
      }).catch(next);
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
