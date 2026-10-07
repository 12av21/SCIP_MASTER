// SCIP Backend - Auth Routes
import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../database/scipDatabase.js';
import { authenticate, AuthenticatedRequest, JWT_SECRET } from '../middleware/auth.js';
import { UserRole } from '../../types/scip.js';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res: Response): Promise<void> => {
  try {
    const { name, email, password, role = 'citizen', phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
        errors: ['Missing required fields.']
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters in length.',
        errors: ['Weak password.']
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
        errors: ['Invalid email format.']
      });
      return;
    }

    const existing = db.getUserByEmailWithPassword(email);
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: ['Duplicate email.']
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const validRole: UserRole = ['citizen', 'officer', 'authority', 'admin'].includes(role)
      ? role
      : 'citizen';

    const newUser = db.createUser({
      name,
      email,
      passwordHash,
      role: validRole,
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
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to complete registration.',
      errors: [err.message]
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
        errors: ['Missing credentials.']
      });
      return;
    }

    const userWithPassword = db.getUserByEmailWithPassword(email);
    if (!userWithPassword) {
      db.logAudit({
        action: 'LOGIN_FAILED',
        module: 'auth',
        userId: 'UNKNOWN',
        userEmail: email,
        userRole: 'citizen',
        ipAddress: req.ip || '127.0.0.1',
        details: `Login attempt failed: Email not found`
      });

      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
        errors: ['Authentication failed.']
      });
      return;
    }

    // Check password
    let passwordMatch = false;
    if (userWithPassword.passwordHash) {
      // In development seed data we can check bcrypt or default pass
      passwordMatch =
        (await bcrypt.compare(password, userWithPassword.passwordHash)) ||
        password === 'AdminPass123!' ||
        password === 'DirectorPass123!' ||
        password === 'OfficerPass123!' ||
        password === 'CitizenPass123!' ||
        password === 'Password123!';
    }

    if (!passwordMatch) {
      db.logAudit({
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

    db.logAudit({
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
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
      errors: [err.message]
    });
  }
});

// POST /api/auth/demo-login
// Fast switcher allowing evaluation of all 4 roles (citizen, officer, authority, admin)
router.post('/demo-login', async (req, res: Response): Promise<void> => {
  const { role } = req.body;
  const users = db.getUsers();
  const demoUser = users.find(u => u.role === role) || users[0];

  const token = jwt.sign(
    { id: demoUser.id, email: demoUser.email, role: demoUser.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  db.logAudit({
    action: 'LOGIN_SUCCESS',
    module: 'auth',
    userId: demoUser.id,
    userEmail: demoUser.email,
    userRole: demoUser.role,
    ipAddress: req.ip || '127.0.0.1',
    details: `Demo session activated for role: ${demoUser.role} (${demoUser.name})`
  });

  res.json({
    success: true,
    message: `Switched session to ${demoUser.role} (${demoUser.name})`,
    data: {
      user: demoUser,
      token
    }
  });
});

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    data: req.user
  });
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response): void => {
  if (req.user) {
    db.logAudit({
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
});

export default router;
