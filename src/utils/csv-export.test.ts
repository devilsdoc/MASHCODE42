import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCSVField, generateStudentsCSV } from './csv-export.ts';
import type { EnrolledStudent } from '../types/index.ts';

test('escapeCSVField correctly escapes commas and quotes', () => {
  assert.equal(escapeCSVField('Normal Text'), '"Normal Text"');
  assert.equal(escapeCSVField('Text, with comma'), '"Text, with comma"');
  assert.equal(escapeCSVField('Text with "quotes"'), '"Text with ""quotes"""');
  assert.equal(escapeCSVField(123), '"123"');
  assert.equal(escapeCSVField(null), '""');
});

test('generateStudentsCSV produces formatted CSV header and rows', () => {
  const mockStudents: EnrolledStudent[] = [
    {
      id: '1',
      name: 'Maya Patel',
      email: 'maya@example.com',
      leetcodeUsername: 'awice',
      joinedAt: '2026-01-15T00:00:00.000Z',
      stats: {
        username: 'awice',
        solvedProblem: 3257,
        easySolved: 802,
        mediumSolved: 1695,
        hardSolved: 760,
        totalQuestions: 3350,
        totalEasy: 850,
        totalMedium: 1750,
        totalHard: 750,
        ranking: 251,
        reputation: 12000,
        contestRating: 3091,
        contestGlobalRanking: 85,
        recentSubmissions: [],
        submissionCalendar: {},
        cachedAt: Date.now(),
      },
    },
  ];

  const csv = generateStudentsCSV(mockStudents);
  const lines = csv.split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /Student Name,Email,LeetCode Handle,Total Solved/);
  assert.match(lines[1], /"Maya Patel","maya@example.com","awice","3257","802","1695","760"/);
});
