import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateClassCode,
  validateLeetcodeUsername,
  isCacheValid,
  filterAndSortStudents,
  canManageClass,
  canStudentJoinClass,
  DEFAULT_CACHE_TTL_MS,
  type StudentListItem
} from './classroom-logic.ts';

test('generateClassCode generates 6-character valid uppercase alphanumeric code', () => {
  const code = generateClassCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
});

test('validateLeetcodeUsername validates allowed characters and lengths', () => {
  assert.equal(validateLeetcodeUsername('tourist'), true);
  assert.equal(validateLeetcodeUsername('neal_wu'), true);
  assert.equal(validateLeetcodeUsername('code-runner_99'), true);
  assert.equal(validateLeetcodeUsername(''), false);
  assert.equal(validateLeetcodeUsername('a'), false); // Too short
  assert.equal(validateLeetcodeUsername('bad user@name'), false); // Spaces and special chars not allowed
});

test('isCacheValid respects 10 minute TTL', () => {
  const now = 1000000;
  // 5 minutes old -> valid
  assert.equal(isCacheValid(now - 5 * 60 * 1000, DEFAULT_CACHE_TTL_MS, now), true);
  // 11 minutes old -> expired
  assert.equal(isCacheValid(now - 11 * 60 * 1000, DEFAULT_CACHE_TTL_MS, now), false);
  // Invalid timestamp
  assert.equal(isCacheValid(0, DEFAULT_CACHE_TTL_MS, now), false);
});

test('filterAndSortStudents sorts by solved count and filters by search', () => {
  const students: StudentListItem[] = [
    {
      id: '1',
      name: 'Alice Smith',
      email: 'alice@example.com',
      leetcodeUsername: 'alice_code',
      joinedAt: '2026-01-01T00:00:00Z',
      stats: {
        solvedProblem: 150,
        easySolved: 80,
        mediumSolved: 60,
        hardSolved: 10,
        ranking: 50000,
        contestRating: 1650,
        contestRanking: 24000,
        reputation: 20
      }
    },
    {
      id: '2',
      name: 'Bob Jones',
      email: 'bob@example.com',
      leetcodeUsername: 'bobj',
      joinedAt: '2026-01-02T00:00:00Z',
      stats: {
        solvedProblem: 320,
        easySolved: 120,
        mediumSolved: 150,
        hardSolved: 50,
        ranking: 15000,
        contestRating: 1980,
        contestRanking: 8000,
        reputation: 150
      }
    },
    {
      id: '3',
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      leetcodeUsername: 'charlieb',
      joinedAt: '2026-01-03T00:00:00Z',
      stats: {
        solvedProblem: 45,
        easySolved: 30,
        mediumSolved: 15,
        hardSolved: 0,
        ranking: 180000,
        contestRating: 1420,
        contestRanking: 65000,
        reputation: 5
      }
    }
  ];

  // Default sort by solved desc
  const sorted = filterAndSortStudents(students, { sortBy: 'solved', sortOrder: 'desc' });
  assert.equal(sorted[0].name, 'Bob Jones');
  assert.equal(sorted[1].name, 'Alice Smith');
  assert.equal(sorted[2].name, 'Charlie Brown');

  // Search filter
  const searched = filterAndSortStudents(students, { search: 'charlie' });
  assert.equal(searched.length, 1);
  assert.equal(searched[0].name, 'Charlie Brown');

  // Min solved filter
  const minSolvedList = filterAndSortStudents(students, { minSolved: 100 });
  assert.equal(minSolvedList.length, 2);
});

test('permission checks for class management and joining', () => {
  assert.equal(canManageClass('teacher', 'teacher-1', 'teacher-1'), true);
  assert.equal(canManageClass('teacher', 'teacher-1', 'teacher-2'), false);
  assert.equal(canManageClass('student', 'teacher-1', 'teacher-1'), false);

  assert.deepEqual(canStudentJoinClass('student', 'my_handle'), { allowed: true });
  assert.equal(canStudentJoinClass('student', '').allowed, false);
  assert.equal(canStudentJoinClass('teacher', 'teacher_handle').allowed, false);
});
