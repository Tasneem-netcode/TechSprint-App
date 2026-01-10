import { Router, Request, Response } from 'express';
const router = Router();

// Session helper and MongoDB
const sessions = require('../../lib/sessions');
const { getDb } = require('../../lib/mongo');
const bcrypt = require('bcryptjs');

/**
 * POST /auth/register
 * Register a new user with email
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // If MongoDB is configured, persist users there
    const db = await getDb();
    if (db) {
      const usersCol = db.collection('users');
      const existing = await usersCol.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, error: 'User already exists' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const userDoc = {
        email,
        password: hashed,
        name: name || email.split('@')[0],
        role: role || 'user',
        createdAt: new Date().toISOString()
      };

      await usersCol.insertOne(userDoc);

      // Create session
      const sessionId = sessions.create(email);

      return res.json({
        success: true,
        message: 'Registration successful',
        user: { email, name: userDoc.name, role: userDoc.role },
        sessionId
      });
    }

    // Fallback to in-memory (demo)
    const hashed = await bcrypt.hash(password, 10);
    const user = { email, password: hashed, name: name || email.split('@')[0], role: role || 'user', createdAt: new Date().toISOString() };
    // store in sessions map keyed by email for demo lookups
    sessions.create(email);

    const sessionId = sessions.create(email);

    res.json({
      success: true,
      message: 'Registration successful (demo)',
      user: { email, name: user.name, role: user.role },
      sessionId
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

/**
 * POST /auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const db = await getDb();
    if (db) {
      const usersCol = db.collection('users');
      const userDoc = await usersCol.findOne({ email });

      if (!userDoc) {
        // Auto-register for demo convenience
        const hashed = await bcrypt.hash(password, 10);
        const newUser = { email, password: hashed, name: email.split('@')[0], createdAt: new Date().toISOString() };
        await usersCol.insertOne(newUser);
      } else {
        const match = await bcrypt.compare(password, userDoc.password);
        if (!match) {
          return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
      }

      const sessionId = sessions.create(email);

      const userDocLatest = await usersCol.findOne({ email });
      const userName = userDocLatest?.name || email.split('@')[0];
      const role = userDocLatest?.role || 'user';

      return res.json({ success: true, message: 'Login successful', user: { email, name: userName, role }, sessionId });
    }

    // Fallback: demo auto-register behavior
    const hashed = await bcrypt.hash(password, 10);
    // demo session create
    sessions.create(email);
    const sessionId = sessions.create(email);

    res.json({ success: true, message: 'Login successful (demo)', user: { email, name: email.split('@')[0], role: 'user' }, sessionId });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * POST /auth/logout
 * Logout and invalidate session
 */
router.post('/logout', (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (sessionId) {
    sessions.destroy(sessionId);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

/**
 * GET /auth/verify
 * Verify if session is valid
 */
router.get('/verify', async (req: Request, res: Response) => {
  const sessionId = req.headers['x-session-id'] as string;

  const sess = sessions.get(sessionId);
  if (!sessionId || !sess) {
    return res.status(401).json({
      success: false,
      error: 'Invalid session'
    });
  }

  const db = await getDb();
  if (db) {
    const usersCol = db.collection('users');
    const userDoc = await usersCol.findOne({ email: sess.email });
    return res.json({ success: true, user: { email: sess.email, name: userDoc?.name || sess.email.split('@')[0], role: userDoc?.role || 'user' } });
  }

  // Demo fallback
  return res.json({ success: true, user: { email: sess.email, name: sess.email.split('@')[0], role: 'user' } });
});

/**
 * Generate a random session ID
 */
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default router;
// CommonJS compatibility
module.exports = router;