// SCIP Backend - Security Middleware
// Rate limiting, CORS, Helmet, and validation utilities

import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';

// ============================================================================
// HELMET - Security headers
// ============================================================================
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});

// ============================================================================
// CORS - Configurable allowlist
// ============================================================================
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(',').map(o => o.trim()).filter(Boolean);
}

const allowedOrigins = parseCorsOrigins();
const isProduction = process.env.NODE_ENV === 'production';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin && !isProduction) {
      return callback(null, true);
    }
    if (isProduction && allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin!)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    }
    if (!isProduction) {
      return callback(null, true);
    }
    return callback(new Error('CORS: No allowlist configured in production'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  maxAge: 86400,
});

// ============================================================================
// RATE LIMITING - Configurable limiters
// ============================================================================
interface RateLimitConfig {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  auth: {
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 10 : 100,
    message: 'Too many authentication attempts. Please try again later.',
    keyPrefix: 'rl:auth',
  },
  register: {
    windowMs: 60 * 60 * 1000,
    max: isProduction ? 5 : 50,
    message: 'Too many registration attempts. Please try again later.',
    keyPrefix: 'rl:register',
  },
  reportCreate: {
    windowMs: 60 * 60 * 1000,
    max: isProduction ? 20 : 200,
    message: 'Report creation rate limit exceeded.',
    keyPrefix: 'rl:report',
  },
  aiAgent: {
    windowMs: 60 * 1000,
    max: isProduction ? 10 : 100,
    message: 'AI agent request rate limit exceeded.',
    keyPrefix: 'rl:ai',
  },
  general: {
    windowMs: 15 * 60 * 1000,
    max: isProduction ? 100 : 1000,
    message: 'Too many requests. Please slow down.',
    keyPrefix: 'rl:general',
  },
};

function createRateLimiter(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      message: config.message,
      errors: ['Rate limit exceeded'],
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Use library's ipKeyGenerator for proper IPv6 support
    // Wrap it to add userId suffix for authenticated users
    keyGenerator: (req: Request) => {
      const baseKey = ipKeyGenerator(req.ip || 'unknown');
      const userId = (req as any).user?.id;
      return userId ? `${config.keyPrefix}:${baseKey}:${userId}` : `${config.keyPrefix}:${baseKey}`;
    },
    skip: (req: Request) => req.path === '/health',
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: config.message,
        errors: ['Rate limit exceeded'],
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    },
  });
}

export const authRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.auth);
export const registerRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.register);
export const reportCreateRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.reportCreate);
export const aiAgentRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.aiAgent);
export const generalRateLimiter = createRateLimiter(RATE_LIMIT_CONFIGS.general);

export function requireLocalDevelopmentEndpoint(req: Request, res: Response, next: NextFunction): void {
  const loopbackAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
  const remoteAddress = req.socket?.remoteAddress;
  if (
    process.env.NODE_ENV !== 'development' ||
    process.env.ENABLE_DEV_ENDPOINTS !== 'true' ||
    process.env.TRUST_PROXY === 'true' ||
    !remoteAddress ||
    !loopbackAddresses.has(remoteAddress)
  ) {
    res.status(404).json({ success: false, message: 'Not found.' });
    return;
  }
  next();
}

// ============================================================================
// REQUEST VALIDATION - Zod schemas
// ============================================================================

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(['citizen']).optional(),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

// Report schemas
export const createReportSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(5000),
  category: z.enum([
    'Water & Drainage',
    'Roads & Traffic',
    'Public Sanitation',
    'Power & Lighting',
    'Parks & Environment',
    'Structural Safety',
    'Public Health',
    'Noise & Disturbance',
  ]),
  subcategory: z.string().max(100).optional(),
  locationName: z.string().min(2).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  images: z.array(z.string().url()).max(10).optional(),
});

export const updateReportSchema = z.object({
  title: z.string().min(5).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  category: z.enum([
    'Water & Drainage',
    'Roads & Traffic',
    'Public Sanitation',
    'Power & Lighting',
    'Parks & Environment',
    'Structural Safety',
    'Public Health',
    'Noise & Disturbance',
  ]).optional(),
  subcategory: z.string().max(100).optional(),
  locationName: z.string().min(2).max(200).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['submitted', 'analyzed', 'assigned', 'in_progress', 'resolved', 'closed']).optional(),
  images: z.array(z.string().url()).max(10).optional(),
});

// Incident schemas
export const reviewIncidentSchema = z.object({
  action: z.enum(['confirm', 'dismiss']),
  notes: z.string().min(5).max(2000),
  departmentId: z.string().optional(),
  officerId: z.string().optional(),
}).strict();

export const resolveIncidentSchema = z.object({
  actionTaken: z.string().min(5).max(2000),
  preventiveMeasures: z.string().max(2000).optional(),
  costEstimate: z.number().positive().optional(),
}).strict();

const incidentClusterSchema = z.object({
  clusterId: z.string().min(1).max(200),
  category: z.enum([
    'Water & Drainage', 'Roads & Traffic', 'Public Sanitation', 'Power & Lighting',
    'Parks & Environment', 'Structural Safety', 'Public Health', 'Noise & Disturbance'
  ]),
  centroid: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180)
  }).strict(),
  radiusMeters: z.number().nonnegative(),
  reportIds: z.array(z.string().min(1).max(200)).min(1).max(500),
  reportCount: z.number().int().positive(),
  suggestedTitle: z.string().min(1).max(200),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  priority: z.enum(['P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_LOW']),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string().max(2000)).max(100),
  timeSpanHours: z.number().nonnegative()
}).strict();

export const createIncidentSchema = z.object({ cluster: incidentClusterSchema }).strict();

// Intelligence schemas
export const aiAgentQuerySchema = z.object({
  query: z.string().min(3).max(2000),
  specificTool: z.string().optional(),
});

// Feedback schema
export const feedbackSchema = z.object({
  reportId: z.string().optional(),
  incidentId: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional(),
}).refine(data => data.reportId || data.incidentId, {
  message: 'Either reportId or incidentId is required',
});

// Query parameter schemas
export const reportQuerySchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  urgency: z.string().optional(),
  myOnly: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const incidentQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  priority: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const auditLogQuerySchema = z.object({
  module: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['citizen', 'officer', 'authority', 'admin'])
}).strict();

// ============================================================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================================================
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid request body',
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
      return;
    }
    req.query = result.data as any;
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid route parameters',
        errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
      });
      return;
    }
    req.params = result.data as any;
    next();
  };
}

// ============================================================================
// SAFE ERROR HANDLING
// ============================================================================
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(`[SCIP Error] ${req.method} ${req.path} failed (${err.name || 'Error'}).`);
  if (res.headersSent) {
    next(err);
    return;
  }
  const errorRecord = err as Error & { code?: number };
  if (errorRecord.code === 11000) {
    res.status(409).json({
      success: false,
      message: 'A record with the same unique value already exists.',
      errors: ['Duplicate record.']
    });
    return;
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: 'The submitted data is invalid.',
      errors: ['Validation failed.']
    });
    return;
  }
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: ['An unexpected error occurred'],
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    errors: ['Endpoint does not exist'],
  });
}

// ============================================================================
// IP ADDRESS EXTRACTION (respecting reverse proxy)
// ============================================================================
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && process.env.TRUST_PROXY === 'true') {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}