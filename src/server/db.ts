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
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log(`[DB] Loaded data: ${this.data.users.length} users, ${this.data.classes.length} classes, ${this.data.enrollments.length} enrollments`);
      }
    } catch (e) {
      console.error('[DB] Failed to load data file, initializing fresh:', e);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save data store:', e);
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
    role: 'teacher' | 'student';
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
}

export const db = new DatabaseStore();
