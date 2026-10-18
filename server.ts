import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './src/server/db.ts';
import { getLeetCodeUserStats, invalidateLeetCodeCache } from './src/services/leetcode.ts';
import { validateLeetcodeUsername, canStudentJoinClass, canManageClass } from './src/utils/classroom-logic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Runtime Environment requires the dev server to run strictly on port 3000
const PORT = 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'leetcode-classroom-dashboard-secret-key-42';

app.use(express.json());

// Simple HMAC-SHA256 Token Helper
function createToken(userId: string): string {
  const payload = `${userId}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64');
}

function verifyToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestampStr, hmac] = decoded.split(':');
    if (!userId || !timestampStr || !hmac) return null;

    const payload = `${userId}:${timestampStr}`;
    const expectedHmac = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac))) {
      return userId;
    }
    return null;
  } catch {
    return null;
  }
}

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: ReturnType<typeof db.findUserById>;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const token = authHeader.substring(7);
  const userId = verifyToken(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
    return;
  }

  const user = db.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User no longer exists' });
    return;
  }

  req.user = user;
  next();
}

function requireRole(role: 'teacher' | 'student' | 'admin' | 'ADMIN') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role.toLowerCase() !== role.toLowerCase()) {
      res.status(403).json({ error: `Access forbidden: ${role} role required` });
      return;
    }
    next();
  };
}

const SUPER_ADMIN_EMAIL = 'manishnagare258@gmail.com';

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const role = (req.user.role || '').toLowerCase();
  const email = (req.user.email || '').toLowerCase().trim();

  if (role !== 'admin' || email !== SUPER_ADMIN_EMAIL) {
    res.status(403).json({
      error: 'Access forbidden: Only the designated Super Admin (manishnagare258@gmail.com) can access this resource.',
    });
    return;
  }

  next();
}

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------

// Sign Up
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, role, leetcodeUsername } = req.body;

  if (!name || !email || !password || !role) {
    res.status(400).json({ error: 'Name, email, password, and role are required' });
    return;
  }

  if (role !== 'teacher' && role !== 'student') {
    res.status(400).json({ error: 'Role must be either teacher or student' });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters long' });
    return;
  }

  if (db.findUserByEmail(email)) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }

  if (role === 'student' && leetcodeUsername && !validateLeetcodeUsername(leetcodeUsername)) {
    res.status(400).json({ error: 'Invalid LeetCode username format' });
    return;
  }

  const user = db.createUser({
    name,
    email,
    password,
    role,
    leetcodeUsername: role === 'student' ? leetcodeUsername : null,
  });

  const token = createToken(user.id);
  const { passwordHash, ...safeUser } = user;
  res.status(201).json({ user: safeUser, token });
});

// Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  console.log(`[API /api/auth/login] Attempt received for email: "${email}"`);

  if (!email || !password) {
    console.log('[API /api/auth/login] Error: Missing email or password in request body.');
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const user = db.findUserByEmail(normalizedEmail);

  console.log(
    `[API /api/auth/login] User found in database: ${Boolean(user)}`,
    user
      ? `(ID: ${user.id}, Role: ${user.role}, Stored Email: "${user.email}")`
      : `(No user found with email "${normalizedEmail}")`
  );

  if (!user) {
    console.log(`[API /api/auth/login] Authentication failed: User "${normalizedEmail}" does not exist in the database.`);
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  try {
    const isPasswordValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isPasswordValid) {
      console.log(`[API /api/auth/login] Authentication failed: Password hash mismatch for user "${user.email}".`);
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
  } catch (bcryptErr) {
    console.error(`[API /api/auth/login] Authentication failed: Exception in bcrypt comparison for user "${user.email}":`, bcryptErr);
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  console.log(`[API /api/auth/login] Authentication successful for user "${user.email}" (${user.role}).`);
  const token = createToken(user.id);
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// Fast Demo Login for instant review
app.post('/api/auth/demo-login', (req: Request, res: Response) => {
  const { role } = req.body;
  const email = role === 'teacher' ? 'teacher@classroom.edu' : 'alex@university.edu';
  const user = db.findUserByEmail(email);

  if (!user) {
    res.status(404).json({ error: 'Demo user not found' });
    return;
  }

  const token = createToken(user.id);
  const { passwordHash, ...safeUser } = user;
  res.json({ user: safeUser, token });
});

// Current user profile
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { passwordHash, ...safeUser } = req.user!;
  res.json({ user: safeUser });
});

// Update LeetCode handle
app.post('/api/auth/update-leetcode', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { leetcodeUsername } = req.body;
  if (!leetcodeUsername || !validateLeetcodeUsername(leetcodeUsername)) {
    res.status(400).json({ error: 'Please provide a valid LeetCode username (letters, numbers, underscores, hyphens)' });
    return;
  }

  const updated = db.updateLeetCodeUsername(req.user!.id, leetcodeUsername);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const { passwordHash, ...safeUser } = updated;
  res.json({ user: safeUser, message: 'LeetCode username updated successfully' });
});

// -----------------------------------------------------------------------------
// Classes Endpoints
// -----------------------------------------------------------------------------

// List classes for the logged in user
app.get('/api/classes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  if (user.role === 'teacher') {
    const classes = db.getTeacherClasses(user.id);
    res.json({ classes });
  } else {
    const classes = db.getStudentClasses(user.id);
    res.json({ classes });
  }
});

// Create class (Teacher only)
app.post('/api/classes', requireAuth, requireRole('teacher'), (req: AuthenticatedRequest, res: Response) => {
  const { name, description } = req.body;
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'Class name is required' });
    return;
  }

  const newClass = db.createClass({
    name,
    description,
    teacherId: req.user!.id,
  });

  res.status(201).json({
    class: {
      ...newClass,
      teacherName: req.user!.name,
      studentCount: 0,
    },
    message: 'Class created successfully',
  });
});

// Join class by code (Student only)
app.post('/api/classes/join', requireAuth, requireRole('student'), (req: AuthenticatedRequest, res: Response) => {
  const { code } = req.body;
  const user = req.user!;

  const check = canStudentJoinClass(user.role, user.leetcodeUsername);
  if (!check.allowed) {
    res.status(400).json({ error: check.reason });
    return;
  }

  if (!code || typeof code !== 'string') {
    res.status(400).json({ error: 'Class code is required' });
    return;
  }

  const targetClass = db.findClassByCode(code);
  if (!targetClass) {
    res.status(404).json({ error: 'Invalid class code. Please check with your teacher.' });
    return;
  }

  if (db.isEnrolled(user.id, targetClass.id)) {
    res.status(400).json({ error: 'You are already enrolled in this class' });
    return;
  }

  db.enrollStudent(user.id, targetClass.id);
  const teacher = db.findUserById(targetClass.teacherId);

  res.json({
    message: `Successfully joined ${targetClass.name}!`,
    class: {
      ...targetClass,
      teacherName: teacher ? teacher.name : 'Teacher',
    },
  });
});

// Get class details
app.get('/api/classes/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const classId = req.params.id;
  const targetClass = db.findClassById(classId);

  if (!targetClass) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }

  const user = req.user!;
  const isOwner = targetClass.teacherId === user.id;
  const isStudentMember = db.isEnrolled(user.id, classId);

  if (!isOwner && !isStudentMember) {
    res.status(403).json({ error: 'You do not have permission to view this class' });
    return;
  }

  const teacher = db.findUserById(targetClass.teacherId);
  const students = db.getClassStudents(classId);

  res.json({
    class: {
      ...targetClass,
      teacherName: teacher ? teacher.name : 'Unknown Teacher',
      studentCount: students.length,
    },
    isOwner,
  });
});

// Get all students and their LeetCode stats for a class (Teacher only)
app.get('/api/classes/:id/students', requireAuth, requireRole('teacher'), async (req: AuthenticatedRequest, res: Response) => {
  const classId = req.params.id;
  const targetClass = db.findClassById(classId);

  if (!targetClass) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }

  if (!canManageClass(req.user!.role, targetClass.teacherId, req.user!.id)) {
    res.status(403).json({ error: 'You can only view student stats for classes you own' });
    return;
  }

  const rawStudents = db.getClassStudents(classId);

  // Fetch LeetCode stats for each student in parallel with individual error resilience
  const studentsWithStats = await Promise.all(
    rawStudents.map(async (student) => {
      if (!student.leetcodeUsername) {
        return {
          ...student,
          stats: null,
          statsError: 'No LeetCode username provided',
        };
      }

      try {
        const stats = await getLeetCodeUserStats(student.leetcodeUsername);
        return {
          ...student,
          stats,
          statsError: null,
        };
      } catch (err: any) {
        return {
          ...student,
          stats: null,
          statsError: err.message || 'Failed to fetch LeetCode stats',
        };
      }
    })
  );

  res.json({ students: studentsWithStats });
});

// Remove student from class (Teacher only)
app.delete('/api/classes/:id/students/:studentId', requireAuth, requireRole('teacher'), (req: AuthenticatedRequest, res: Response) => {
  const { id: classId, studentId } = req.params;
  const targetClass = db.findClassById(classId);

  if (!targetClass) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }

  if (!canManageClass(req.user!.role, targetClass.teacherId, req.user!.id)) {
    res.status(403).json({ error: 'You can only remove students from classes you own' });
    return;
  }

  const removed = db.removeStudentFromClass(classId, studentId);
  if (!removed) {
    res.status(404).json({ error: 'Student enrollment not found' });
    return;
  }

  res.json({ message: 'Student removed from class successfully' });
});

// -----------------------------------------------------------------------------
// LeetCode Direct Official GraphQL API Proxy Endpoints
// -----------------------------------------------------------------------------

// Direct GraphQL stats endpoint supporting /api/leetcode-stats?username=...
app.get('/api/leetcode-stats', async (req: Request, res: Response) => {
  const username = (req.query.username as string | undefined)?.trim();
  const forceRefresh = req.query.refresh === 'true';

  if (!username) {
    res.status(400).json({ error: 'Username query parameter is required (e.g. /api/leetcode-stats?username=example)' });
    return;
  }

  if (!validateLeetcodeUsername(username)) {
    res.status(400).json({ error: 'Invalid LeetCode username format' });
    return;
  }

  try {
    const stats = await getLeetCodeUserStats(username, { forceRefresh });
    res.json({
      success: true,
      username: stats.username,
      totalSolved: stats.solvedProblem,
      solvedProblem: stats.solvedProblem,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      stats,
    });
  } catch (err: any) {
    console.error(`[LeetCode GraphQL Error] Could not retrieve data for username "${username}":`, err?.message || err);
    res.status(500).json({ error: 'Unable to fetch LeetCode data right now' });
  }
});

// Backward-compatible path: Fetch user stats with cache
app.get('/api/leetcode/:username', async (req: Request, res: Response) => {
  const { username } = req.params;
  if (!validateLeetcodeUsername(username)) {
    res.status(400).json({ error: 'Invalid LeetCode username format' });
    return;
  }

  try {
    const stats = await getLeetCodeUserStats(username);
    res.json({
      success: true,
      username: stats.username,
      totalSolved: stats.solvedProblem,
      solvedProblem: stats.solvedProblem,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      stats,
    });
  } catch (err: any) {
    console.error(`[LeetCode GraphQL Error] Could not retrieve data for username "${username}":`, err?.message || err);
    res.status(500).json({ error: 'Unable to fetch LeetCode data right now' });
  }
});

// Force refresh user stats
app.post('/api/leetcode/:username/refresh', async (req: Request, res: Response) => {
  const { username } = req.params;
  if (!validateLeetcodeUsername(username)) {
    res.status(400).json({ error: 'Invalid LeetCode username format' });
    return;
  }

  invalidateLeetCodeCache(username);
  try {
    const stats = await getLeetCodeUserStats(username, { forceRefresh: true });
    res.json({
      success: true,
      refreshed: true,
      username: stats.username,
      totalSolved: stats.solvedProblem,
      solvedProblem: stats.solvedProblem,
      easySolved: stats.easySolved,
      mediumSolved: stats.mediumSolved,
      hardSolved: stats.hardSolved,
      stats,
    });
  } catch (err: any) {
    console.error(`[LeetCode GraphQL Error] Could not refresh data for username "${username}":`, err?.message || err);
    res.status(500).json({ error: 'Unable to fetch LeetCode data right now' });
  }
});

// -----------------------------------------------------------------------------
// Super Admin Protected Endpoints (Strictly for manishnagare258@gmail.com)
// -----------------------------------------------------------------------------

// Seed / Verify the single Super Admin account
app.post('/api/admin/seed', (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  // If credentials passed, enforce that they match the designated Super Admin
  if (email && email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
    res.status(403).json({ error: `Only ${SUPER_ADMIN_EMAIL} can be provisioned as Super Admin.` });
    return;
  }
  if (password && password !== 'M@nii1212') {
    res.status(400).json({ error: 'Password does not match designated Super Admin specification.' });
    return;
  }

  const adminUser = db.seedAdminUser();
  const { passwordHash, ...safeAdmin } = adminUser;
  res.json({
    success: true,
    message: 'Super Admin user successfully seeded and verified.',
    admin: safeAdmin,
  });
});

// Verify Super Admin access status
app.get('/api/admin/check-access', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    allowed: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

// Admin System Overview (Teachers, Students, Classes, Stats)
app.get('/api/admin/overview', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const overview = db.getAdminOverview();
  res.json(overview);
});

// List all teachers
app.get('/api/admin/teachers', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ teachers: db.getAllTeachers() });
});

// List all students
app.get('/api/admin/students', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ students: db.getAllStudents() });
});

// Master God Mode view: All students with live/cached LeetCode statistics
app.get('/api/admin/students-with-stats', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const students = db.getAllStudents();
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        if (!student.leetcodeUsername) {
          return {
            ...student,
            stats: null,
          };
        }
        try {
          const stats = await getLeetCodeUserStats(student.leetcodeUsername);
          return {
            ...student,
            stats,
          };
        } catch {
          return {
            ...student,
            stats: null,
          };
        }
      })
    );
    res.json({ students: studentsWithStats });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch student statistics' });
  }
});

// List all classes
app.get('/api/admin/classes', requireAuth, requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ classes: db.getAllClassesAdmin() });
});

// Delete user (prevents deleting the Super Admin)
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const result = db.deleteUser(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true, message: 'User deleted successfully' });
});

// Delete class
app.delete('/api/admin/classes/:id', requireAuth, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const result = db.deleteClass(req.params.id);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true, message: 'Class deleted successfully' });
});

// -----------------------------------------------------------------------------
// Vite Dev Server / Static File Serving
// -----------------------------------------------------------------------------
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LeetCode Classroom Dashboard running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
