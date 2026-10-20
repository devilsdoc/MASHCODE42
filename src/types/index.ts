export type UserRole = 'teacher' | 'student' | 'admin' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  leetcodeUsername?: string | null;
  createdAt: string;
}

export interface ClassItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacherId: string;
  teacherName?: string;
  studentCount?: number;
  createdAt: string;
}

export interface Submission {
  title: string;
  titleSlug: string;
  timestamp: string | number;
  statusDisplay: string;
  lang: string;
}

export interface LeetCodeStats {
  username: string;
  solvedProblem: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalQuestions: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  acceptanceRate?: number;
  ranking: number;
  reputation: number;
  contestRating?: number;
  contestRanking?: number;
  contestGlobalRanking?: number;
  contestTopPercentage?: number;
  totalContestsAttended?: number;
  recentSubmissions: Submission[];
  submissionCalendar: Record<string, number>; // timestamp -> count
  cachedAt: number;
  isMockFallback?: boolean;
}

export interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  leetcodeUsername: string;
  joinedAt: string;
  stats?: LeetCodeStats | null;
  isLoadingStats?: boolean;
  statsError?: string | null;
}

export interface LeaderboardStudent {
  id: string;
  name: string;
  email: string;
  leetcodeUsername: string;
  joinedAt: string;
  rankBySolved: number;
  rankByRating: number;
  solvedProblem: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  contestRating?: number;
  contestRanking?: number;
  contestGlobalRanking?: number;
  contestTopPercentage?: number;
  globalRanking: number;
  acceptanceRate?: number;
  stats?: LeetCodeStats | null;
  statsError?: string | null;
}

export interface LeaderboardSummary {
  totalStudents: number;
  studentsWithStats: number;
  topSolved?: {
    name: string;
    username: string;
    solved: number;
  } | null;
  topRating?: {
    name: string;
    username: string;
    rating: number;
  } | null;
  averageSolved: number;
  averageRating: number;
}

export interface LeaderboardResponse {
  classId: string;
  className: string;
  classCode: string;
  summary: LeaderboardSummary;
  leaderboard: LeaderboardStudent[];
}
