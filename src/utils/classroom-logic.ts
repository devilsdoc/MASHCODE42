/**
 * Classroom pure business logic and helper functions
 */

export interface StudentListItem {
  id: string;
  name: string;
  email: string;
  leetcodeUsername: string;
  joinedAt: string;
  stats?: {
    solvedProblem: number;
    easySolved: number;
    mediumSolved: number;
    hardSolved: number;
    ranking: number;
    contestRating: number;
    contestRanking: number;
    reputation: number;
  };
}

/**
 * Generate a unique, readable 6-character alphanumeric class code
 * Excludes easily confused characters like 0, O, 1, I
 */
export function generateClassCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Validates LeetCode username format
 */
export function validateLeetcodeUsername(username: string): boolean {
  if (!username || typeof username !== 'string') return false;
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 35) return false;
  // LeetCode usernames allow letters, numbers, underscores, and hyphens
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * Cache validity checker (default 10 minutes TTL)
 */
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function isCacheValid(cachedAt: number, ttlMs: number = DEFAULT_CACHE_TTL_MS, now: number = Date.now()): boolean {
  if (!cachedAt || typeof cachedAt !== 'number') return false;
  return now - cachedAt < ttlMs;
}

/**
 * Sort and filter student list for teacher dashboard
 */
export interface FilterSortOptions {
  search?: string;
  sortBy?: 'solved' | 'rating' | 'name' | 'joinedAt';
  sortOrder?: 'asc' | 'desc';
  minSolved?: number;
}

export function filterAndSortStudents(
  students: StudentListItem[],
  options: FilterSortOptions = {}
): StudentListItem[] {
  const {
    search = '',
    sortBy = 'solved',
    sortOrder = 'desc',
    minSolved = 0,
  } = options;

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = students.filter((student) => {
    // Search filter
    if (normalizedSearch) {
      const matchName = student.name.toLowerCase().includes(normalizedSearch);
      const matchEmail = student.email.toLowerCase().includes(normalizedSearch);
      const matchUsername = (student.leetcodeUsername || '').toLowerCase().includes(normalizedSearch);
      if (!matchName && !matchEmail && !matchUsername) return false;
    }

    // Min solved filter
    const totalSolved = student.stats?.solvedProblem || 0;
    if (totalSolved < minSolved) {
      return false;
    }

    return true;
  });

  return filtered.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'solved') {
      const aSolved = a.stats?.solvedProblem || 0;
      const bSolved = b.stats?.solvedProblem || 0;
      comparison = aSolved - bSolved;
    } else if (sortBy === 'rating') {
      const aRating = a.stats?.contestRating || 0;
      const bRating = b.stats?.contestRating || 0;
      comparison = aRating - bRating;
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else if (sortBy === 'joinedAt') {
      comparison = new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

/**
 * Verify role permissions
 */
export function canManageClass(userRole: string, teacherId: string, currentUserId: string): boolean {
  if (userRole.toLowerCase() === 'admin') return true;
  if (userRole !== 'teacher') return false;
  return teacherId === currentUserId;
}

export function canStudentJoinClass(userRole: string, leetcodeUsername?: string | null): { allowed: boolean; reason?: string } {
  if (userRole !== 'student') {
    return { allowed: false, reason: 'Only students can join classes via class code.' };
  }
  if (!leetcodeUsername || !validateLeetcodeUsername(leetcodeUsername)) {
    return { allowed: false, reason: 'You must save a valid LeetCode username to your profile before joining a class.' };
  }
  return { allowed: true };
}
