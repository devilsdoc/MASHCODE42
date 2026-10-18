import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { generateClassCode } from '../utils/classroom-logic.ts';
import { User, ClassItem } from '../types/index.ts';

export interface DbUser extends User {
  passwordHash: string;
}

export interface DbClass extends ClassItem {
  // inherited fields: id, name, code, description, teacherId, createdAt
}

export interface DbEnrollment {
  id: string;
  studentId: string;
  classId: string;
  joinedAt: string;
}

interface DatabaseSchema {
  users: DbUser[];
  classes: DbClass[];
  enrollments: DbEnrollment[];
}

const DB_FILE = path.resolve(process.cwd(), '.data-store.json');
const TMP_DB_FILE = path.resolve('/tmp', '.data-store.json');

class DatabaseStore {
  private data: DatabaseSchema = {
    users: [],
    classes: [],
    enrollments: [],
  };

  constructor() {
    this.load();
    if (this.data.users.length === 0) {
      this.seed();
    }
    // Ensure Super Admin user is always present and properly configured
    this.seedAdminUser();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[DB] Loaded data from local store: ${this.data.users.length} users, ${this.data.classes.length} classes, ${this.data.enrollments.length} enrollments`);
        return;
      }
      if (fs.existsSync(TMP_DB_FILE)) {
        const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[DB] Loaded data from /tmp store: ${this.data.users.length} users, ${this.data.classes.length} classes, ${this.data.enrollments.length} enrollments`);
        return;
      }
    } catch (e) {
      console.error('[DB] Failed to load data file, initializing fresh:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      try {
        fs.writeFileSync(TMP_DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
      } catch (tmpErr) {
        // In purely stateless memory environments, state remains in this.data
        console.warn('[DB] Persistent file write unavailable in serverless environment, keeping in memory.');
      }
    }
  }

  private seed() {
    console.log('[DB] Seeding initial classroom data...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('password123', salt);

    const teacherId = 'teacher_turing';
    const teacher: DbUser = {
      id: teacherId,
      name: 'Prof. Alan Turing',
      email: 'teacher@classroom.edu',
      role: 'teacher',
      leetcodeUsername: null,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    const students: DbUser[] = [
      {
        id: 'student_alex',
        name: 'Alex Rivera',
        email: 'alex@university.edu',
        role: 'student',
        leetcodeUsername: 'neal_wu',
        passwordHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'student_sarah',
        name: 'Sarah Chen',
        email: 'sarah@university.edu',
        role: 'student',
        leetcodeUsername: 'lee215',
        passwordHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'student_david',
        name: 'David Kim',
        email: 'david@university.edu',
        role: 'student',
        leetcodeUsername: 'tourist',
        passwordHash,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'student_maya',
        name: 'Maya Patel',
        email: 'maya@university.edu',
        role: 'student',
        leetcodeUsername: 'awice',
        passwordHash,
        createdAt: new Date().toISOString(),
      },
    ];

    const class1: DbClass = {
      id: 'class_algo_201',
      name: 'CS 201: Data Structures & Algorithms',
      code: 'ALGO24',
      description: 'Foundations of data structures, graph traversals, and dynamic programming.',
      teacherId,
      createdAt: new Date().toISOString(),
    };

    const class2: DbClass = {
      id: 'class_comp_350',
      name: 'CS 350: Competitive Programming Seminar',
      code: 'COMP35',
      description: 'Weekly LeetCode contests, mock interviews, and advanced algorithmic thinking.',
      teacherId,
      createdAt: new Date().toISOString(),
    };

    const enrollments: DbEnrollment[] = [
      { id: 'enr_1', studentId: 'student_alex', classId: 'class_algo_201', joinedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: 'enr_2', studentId: 'student_sarah', classId: 'class_algo_201', joinedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: 'enr_3', studentId: 'student_david', classId: 'class_algo_201', joinedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: 'enr_4', studentId: 'student_maya', classId: 'class_algo_201', joinedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'enr_5', studentId: 'student_alex', classId: 'class_comp_350', joinedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: 'enr_6', studentId: 'student_sarah', classId: 'class_comp_350', joinedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
    ];

    this.data.users = [teacher, ...students];
    this.data.classes = [class1, class2];
    this.data.enrollments = enrollments;
    this.save();
  }

  // User operations
  findUserByEmail(email: string): DbUser | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  findUserById(id: string): DbUser | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  createUser(params: {
    email: string;
    name: string;
    password: string;
    role: 'teacher' | 'student' | 'admin' | 'ADMIN';
    leetcodeUsername?: string | null;
  }): DbUser {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(params.password, salt);
    const newUser: DbUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      email: params.email.trim().toLowerCase(),
      name: params.name.trim(),
      role: params.role,
      leetcodeUsername: params.leetcodeUsername ? params.leetcodeUsername.trim() : null,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  updateLeetCodeUsername(userId: string, leetcodeUsername: string): DbUser | null {
    const user = this.findUserById(userId);
    if (!user) return null;
    user.leetcodeUsername = leetcodeUsername.trim();
    this.save();
    return user;
  }

  // Class operations
  createClass(params: { name: string; description?: string; teacherId: string }): DbClass {
    // Generate unique 6-character code
    let code = generateClassCode();
    while (this.data.classes.some((c) => c.code === code)) {
      code = generateClassCode();
    }

    const newClass: DbClass = {
      id: 'cls_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: params.name.trim(),
      description: params.description ? params.description.trim() : undefined,
      code,
      teacherId: params.teacherId,
      createdAt: new Date().toISOString(),
    };
    this.data.classes.push(newClass);
    this.save();
    return newClass;
  }

  findClassById(id: string): DbClass | undefined {
    return this.data.classes.find((c) => c.id === id);
  }

  findClassByCode(code: string): DbClass | undefined {
    return this.data.classes.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  }

  getTeacherClasses(teacherId: string): ClassItem[] {
    return this.data.classes
      .filter((c) => c.teacherId === teacherId)
      .map((c) => {
        const studentCount = this.data.enrollments.filter((e) => e.classId === c.id).length;
        const teacher = this.findUserById(c.teacherId);
        return {
          ...c,
          teacherName: teacher ? teacher.name : 'Unknown Teacher',
          studentCount,
        };
      });
  }

  getStudentClasses(studentId: string): ClassItem[] {
    const enrolledClassIds = this.data.enrollments
      .filter((e) => e.studentId === studentId)
      .map((e) => e.classId);

    return this.data.classes
      .filter((c) => enrolledClassIds.includes(c.id))
      .map((c) => {
        const studentCount = this.data.enrollments.filter((e) => e.classId === c.id).length;
        const teacher = this.findUserById(c.teacherId);
        return {
          ...c,
          teacherName: teacher ? teacher.name : 'Unknown Teacher',
          studentCount,
        };
      });
  }

  // Enrollment operations
  isEnrolled(studentId: string, classId: string): boolean {
    return this.data.enrollments.some((e) => e.studentId === studentId && e.classId === classId);
  }

  enrollStudent(studentId: string, classId: string): DbEnrollment {
    if (this.isEnrolled(studentId, classId)) {
      return this.data.enrollments.find((e) => e.studentId === studentId && e.classId === classId)!;
    }
    const enrollment: DbEnrollment = {
      id: 'enr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      studentId,
      classId,
      joinedAt: new Date().toISOString(),
    };
    this.data.enrollments.push(enrollment);
    this.save();
    return enrollment;
  }

  removeStudentFromClass(classId: string, studentId: string): boolean {
    const initialLength = this.data.enrollments.length;
    this.data.enrollments = this.data.enrollments.filter(
      (e) => !(e.classId === classId && e.studentId === studentId)
    );
    if (this.data.enrollments.length !== initialLength) {
      this.save();
      return true;
    }
    return false;
  }

  getClassStudents(classId: string): Array<{
    id: string;
    name: string;
    email: string;
    leetcodeUsername: string;
    joinedAt: string;
  }> {
    const enrollments = this.data.enrollments.filter((e) => e.classId === classId);
    return enrollments
      .map((enr) => {
        const user = this.findUserById(enr.studentId);
        if (!user) return null;
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          leetcodeUsername: user.leetcodeUsername || '',
          joinedAt: enr.joinedAt,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }

  // Super Admin Methods
  seedAdminUser(): DbUser {
    const ADMIN_EMAIL = 'manishnagare258@gmail.com';
    const ADMIN_PASSWORD = 'M@nii1212';
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, salt);

    // Enforce invariant: ONLY ONE admin user with exact email can ever hold admin role
    for (const u of this.data.users) {
      if (u.email.toLowerCase() !== ADMIN_EMAIL && (u.role === 'admin' || (u.role as string) === 'ADMIN')) {
        u.role = 'teacher';
      }
    }

    let adminUser = this.data.users.find(
      (u) => u.email.toLowerCase() === ADMIN_EMAIL
    );

    if (adminUser) {
      adminUser.role = 'ADMIN';
      adminUser.passwordHash = passwordHash;
      if (!adminUser.name || adminUser.name === 'Admin' || adminUser.name === 'Super Admin') {
        adminUser.name = 'Manish Nagare (Super Admin)';
      }
    } else {
      adminUser = {
        id: 'usr_super_admin',
        name: 'Manish Nagare (Super Admin)',
        email: ADMIN_EMAIL,
        role: 'ADMIN',
        leetcodeUsername: null,
        passwordHash,
        createdAt: new Date().toISOString(),
      };
      this.data.users.unshift(adminUser);
    }

    this.save();
    console.log(`[DB] Super Admin user ensured: ${ADMIN_EMAIL} (role: ADMIN)`);
    return adminUser;
  }

  getAllTeachers(): Array<Omit<DbUser, 'passwordHash'> & { createdClassesCount: number; totalStudentsCount: number }> {
    return this.data.users
      .filter((u) => u.role === 'teacher')
      .map((t) => {
        const classes = this.data.classes.filter((c) => c.teacherId === t.id);
        const classIds = new Set(classes.map((c) => c.id));
        const totalStudents = this.data.enrollments.filter((e) => classIds.has(e.classId)).length;
        const { passwordHash, ...safe } = t;
        return {
          ...safe,
          createdClassesCount: classes.length,
          totalStudentsCount: totalStudents,
        };
      });
  }

  getAllStudents(): Array<Omit<DbUser, 'passwordHash'> & { enrolledClassesCount: number; enrolledClasses: string[] }> {
    return this.data.users
      .filter((u) => u.role === 'student')
      .map((s) => {
        const enrollments = this.data.enrollments.filter((e) => e.studentId === s.id);
        const classNames = enrollments.map((e) => {
          const cls = this.findClassById(e.classId);
          return cls ? cls.name : e.classId;
        });
        const { passwordHash, ...safe } = s;
        return {
          ...safe,
          enrolledClassesCount: enrollments.length,
          enrolledClasses: classNames,
        };
      });
  }

  getAllClassesAdmin(): Array<
    DbClass & {
      teacherName: string;
      teacherEmail: string;
      studentCount: number;
      students: Array<{ id: string; name: string; email: string; leetcodeUsername?: string | null }>;
    }
  > {
    return this.data.classes.map((cls) => {
      const teacher = this.findUserById(cls.teacherId);
      const enrollments = this.data.enrollments.filter((e) => e.classId === cls.id);
      const students = enrollments.map((enr) => {
        const stu = this.findUserById(enr.studentId);
        return {
          id: enr.studentId,
          name: stu ? stu.name : 'Unknown',
          email: stu ? stu.email : '',
          leetcodeUsername: stu ? stu.leetcodeUsername : null,
        };
      });

      return {
        ...cls,
        teacherName: teacher ? teacher.name : 'Unknown Instructor',
        teacherEmail: teacher ? teacher.email : 'Unknown Email',
        studentCount: enrollments.length,
        students,
      };
    });
  }

  deleteUser(userId: string): { success: boolean; error?: string } {
    const user = this.findUserById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (user.email.toLowerCase() === 'manishnagare258@gmail.com' || user.role === 'admin' || (user.role as string) === 'ADMIN') {
      return { success: false, error: 'Cannot delete the Super Admin account' };
    }

    // Delete related classes if teacher
    if (user.role === 'teacher') {
      const teacherClassIds = this.data.classes.filter((c) => c.teacherId === userId).map((c) => c.id);
      this.data.classes = this.data.classes.filter((c) => c.teacherId !== userId);
      this.data.enrollments = this.data.enrollments.filter((e) => !teacherClassIds.includes(e.classId));
    }

    // Delete enrollments if student
    if (user.role === 'student') {
      this.data.enrollments = this.data.enrollments.filter((e) => e.studentId !== userId);
    }

    this.data.users = this.data.users.filter((u) => u.id !== userId);
    this.save();
    return { success: true };
  }

  deleteClass(classId: string): { success: boolean; error?: string } {
    const cls = this.findClassById(classId);
    if (!cls) {
      return { success: false, error: 'Class not found' };
    }
    this.data.classes = this.data.classes.filter((c) => c.id !== classId);
    this.data.enrollments = this.data.enrollments.filter((e) => e.classId !== classId);
    this.save();
    return { success: true };
  }

  getAdminOverview() {
    const teachers = this.getAllTeachers();
    const students = this.getAllStudents();
    const classes = this.getAllClassesAdmin();

    return {
      stats: {
        totalUsers: this.data.users.length,
        totalTeachers: teachers.length,
        totalStudents: students.length,
        totalClasses: classes.length,
        totalEnrollments: this.data.enrollments.length,
      },
      teachers,
      students,
      classes,
    };
  }
}

// Ensure global singleton instantiation in serverless environments to prevent connection/instance leaks
const globalForDb = globalThis as unknown as {
  dbInstance: DatabaseStore | undefined;
};

export const db = globalForDb.dbInstance ?? new DatabaseStore();

// Cache on globalThis for both development and production serverless execution
// to ensure warm serverless containers reuse existing in-memory store & connection pools:
globalForDb.dbInstance = db;

// Re-export prisma singleton for serverless PostgreSQL access
export { prisma } from '../lib/prisma.ts';

