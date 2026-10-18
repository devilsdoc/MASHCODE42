import type { EnrolledStudent } from '../types/index.ts';

/**
 * Escapes a CSV field to prevent injection and format errors
 */
export function escapeCSVField(field: string | number | undefined | null): string {
  if (field === undefined || field === null) return '""';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates CSV string for a list of enrolled students
 */
export function generateStudentsCSV(students: EnrolledStudent[]): string {
  const headers = [
    'Student Name',
    'Email',
    'LeetCode Handle',
    'Total Solved',
    'Easy Solved',
    'Medium Solved',
    'Hard Solved',
    'Contest Rating',
    'Contest Global Rank',
    'Enrolled Date',
  ];

  const rows = students.map((student) => {
    const stats = student.stats;
    return [
      escapeCSVField(student.name),
      escapeCSVField(student.email),
      escapeCSVField(student.leetcodeUsername || 'Not Set'),
      escapeCSVField(stats ? stats.solvedProblem : 0),
      escapeCSVField(stats ? stats.easySolved : 0),
      escapeCSVField(stats ? stats.mediumSolved : 0),
      escapeCSVField(stats ? stats.hardSolved : 0),
      escapeCSVField(stats?.contestRating || 'Unrated'),
      escapeCSVField(stats?.contestGlobalRanking || 'N/A'),
      escapeCSVField(student.joinedAt ? new Date(student.joinedAt).toLocaleDateString() : 'N/A'),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a browser file download of the CSV
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
