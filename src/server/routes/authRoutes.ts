// SCIP Backend - Auth Routes
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../../database/initMongo.js';
import { authenticate, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.js';
import { verifyPassword } from '../auth/password.js';
import { authRateLimiter, registerRateLimiter, validateBody, loginSchema, registerSchema } from '../middleware/security.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// Apply auth rate limiter to all auth routes
router.use(authRateLimiter);

// POST /api/auth/register
router.post('/register', registerRateLimiter, validateBody(registerSchema), asyncHandler(async (req, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await getDb().createUser({
      name,
      email,
      passwordHash,
      role: 'citizen',
      phone,
      status: 'active'
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: newUser,
        token
      }
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'DUPLICATE_EMAIL') {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: ['Duplicate email.']
      });
      return;
    }
    throw err;
  }
}));

// POST /api/auth/login
router.post('/login', validateBody(loginSchema), asyncHandler(async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const userWithPassword = await getDb().getUserByEmailWithPassword(email);
    if (!userWithPassword) {
      await getDb().logAudit({
        action: 'LOGIN_FAILED',
        module: 'auth',
        userId: 'UNKNOWN',
        userEmail: email,
        userRole: 'citizen',
        ipAddress: req.ip || '127.0.0.1',
        details: 'Login attempt failed: Email not found'
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    const passwordMatch = userWithPassword.passwordHash
      ? await verifyPassword(password, userWithPassword.passwordHash)
      : false;

    if (!passwordMatch) {
      await getDb().logAudit({
        action: 'LOGIN_FAILED',
        module: 'auth',
        userId: userWithPassword.id,
        userEmail: userWithPassword.email,
        userRole: userWithPassword.role,
        ipAddress: req.ip || '127.0.0.1',
        details: `Login attempt failed: Incorrect password for ${email}`
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    if (userWithPassword.status === 'suspended') {
      res.status(403).json({
        success: false,
        message: 'Account is suspended. Contact system administrator.',
        errors: ['Account suspended.']
      });
      return;
    }

    const token = jwt.sign(
      { id: userWithPassword.id, email: userWithPassword.email, role: userWithPassword.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await getDb().logAudit({
      action: 'LOGIN_SUCCESS',
      module: 'auth',
      userId: userWithPassword.id,
      userEmail: userWithPassword.email,
      userRole: userWithPassword.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `User ${userWithPassword.name} logged in successfully`
    });

    const { passwordHash, ...safeUser } = userWithPassword;
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: safeUser,
        token
      }
    });
  } catch (err) {
    throw err;
  }
}));

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.user) {
    await getDb().logAudit({
      action: 'LOGOUT',
      module: 'auth',
      userId: req.user.id,
      userEmail: req.user.email,
      userRole: req.user.role,
      ipAddress: req.ip || '127.0.0.1',
      details: `User ${req.user.name} logged out`
    });
  }
  res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}));

export default router;
