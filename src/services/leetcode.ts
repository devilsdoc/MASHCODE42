import { LeetCodeStats, Submission } from '../types/index.ts';

const ALFA_LEETCODE_API_BASE = 'https://alfa-leetcode-api.onrender.com';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  data: LeetCodeStats;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry>();

/**
 * Deterministic fallback generator for when external LeetCode API is down, rate-limited, or timing out.
 */
function generateFallbackLeetCodeStats(username: string): LeetCodeStats {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  const positiveHash = Math.abs(hash);

  const easySolved = 60 + (positiveHash % 120);
  const mediumSolved = 40 + ((positiveHash >> 3) % 150);
  const hardSolved = 10 + ((positiveHash >> 5) % 40);
  const totalSolved = easySolved + mediumSolved + hardSolved;
  const contestRating = 1450 + (positiveHash % 850);
  const contestRanking = 1000 + (positiveHash % 60000);
  const ranking = 5000 + (positiveHash % 150000);

  const sampleTitles = [
    { title: 'Two Sum', slug: 'two-sum', lang: 'python3' },
    { title: 'Trapping Rain Water', slug: 'trapping-rain-water', lang: 'cpp' },
    { title: 'Median of Two Sorted Arrays', slug: 'median-of-two-sorted-arrays', lang: 'java' },
    { title: 'Longest Palindromic Substring', slug: 'longest-palindromic-substring', lang: 'python3' },
    { title: 'LRU Cache', slug: 'lru-cache', lang: 'typescript' },
    { title: 'Course Schedule II', slug: 'course-schedule-ii', lang: 'cpp' },
    { title: 'Binary Tree Maximum Path Sum', slug: 'binary-tree-maximum-path-sum', lang: 'python3' },
  ];

  const nowSeconds = Math.floor(Date.now() / 1000);
  const recentSubmissions: Submission[] = sampleTitles.slice(0, 5).map((item, idx) => ({
    title: item.title,
    titleSlug: item.slug,
    timestamp: nowSeconds - (idx * 3600 * 14 + 1800),
    statusDisplay: idx === 1 ? 'Wrong Answer' : 'Accepted',
    lang: item.lang,
  }));

  // Generate calendar heatmap data for the past 6 months
  const calendar: Record<string, number> = {};
  const secondsInDay = 86400;
  for (let day = 0; day < 120; day++) {
    const dayTimestamp = nowSeconds - day * secondsInDay;
    // Semi-random activity
    if ((positiveHash + day) % 3 !== 0) {
      calendar[dayTimestamp.toString()] = ((positiveHash + day) % 7) + 1;
    }
  }

  return {
    username,
    solvedProblem: totalSolved,
    easySolved,
    mediumSolved,
    hardSolved,
    totalQuestions: 3350,
    totalEasy: 850,
    totalMedium: 1750,
    totalHard: 750,
    acceptanceRate: 54.8,
    ranking,
    reputation: 35 + (positiveHash % 300),
    contestRating: Math.round(contestRating),
    contestRanking,
    contestGlobalRanking: contestRanking,
    contestTopPercentage: Math.max(1, Math.min(99, +( (contestRanking / 150000) * 100 ).toFixed(1))),
    totalContestsAttended: 5 + (positiveHash % 30),
    recentSubmissions,
    submissionCalendar: calendar,
    cachedAt: Date.now(),
    isMockFallback: true,
  };
}

/**
 * Fetch from external API with strict timeout
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 4000): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'LeetCode-Classroom-Dashboard/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fetches all LeetCode statistics for a given username with 10-minute caching
 */
export async function getLeetCodeUserStats(
  username: string,
  options: { forceRefresh?: boolean } = {}
): Promise<LeetCodeStats> {
  const cleanUsername = username.trim().toLowerCase();

  // Check in-memory cache
  if (!options.forceRefresh) {
    const cached = memoryCache.get(cleanUsername);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    // Attempt parallel fetching from alfa-leetcode-api endpoints
    const [solvedRes, profileRes, contestRes, submissionRes, calendarRes] = await Promise.allSettled([
      fetchWithTimeout(`${ALFA_LEETCODE_API_BASE}/${cleanUsername}/solved`),
      fetchWithTimeout(`${ALFA_LEETCODE_API_BASE}/${cleanUsername}/profile`),
      fetchWithTimeout(`${ALFA_LEETCODE_API_BASE}/${cleanUsername}/contest`),
      fetchWithTimeout(`${ALFA_LEETCODE_API_BASE}/${cleanUsername}/submission?limit=5`),
      fetchWithTimeout(`${ALFA_LEETCODE_API_BASE}/${cleanUsername}/calendar`),
    ]);

    // If solved query fails or user not found, fall back to fallback generator
    if (solvedRes.status === 'rejected') {
      console.warn(`[LeetCode Service] External API call rejected for ${cleanUsername}:`, solvedRes.reason?.message || solvedRes.reason);
      const fallback = generateFallbackLeetCodeStats(cleanUsername);
      memoryCache.set(cleanUsername, { data: fallback, timestamp: Date.now() });
      return fallback;
    }

    const solvedData = solvedRes.value;
    const profileData = profileRes.status === 'fulfilled' ? profileRes.value : {};
    const contestData = contestRes.status === 'fulfilled' ? contestRes.value : {};
    const submissionData = submissionRes.status === 'fulfilled' ? submissionRes.value : {};
    const calendarData = calendarRes.status === 'fulfilled' ? calendarRes.value : {};

    // Parse submissions
    let recentSubmissions: Submission[] = [];
    if (submissionData && Array.isArray(submissionData.submission)) {
      recentSubmissions = submissionData.submission.slice(0, 5).map((sub: any) => ({
        title: sub.title || 'Unknown Problem',
        titleSlug: sub.titleSlug || '',
        timestamp: sub.timestamp || Date.now() / 1000,
        statusDisplay: sub.statusDisplay || 'Accepted',
        lang: sub.lang || 'Unknown',
      }));
    } else if (Array.isArray(submissionData)) {
      recentSubmissions = submissionData.slice(0, 5).map((sub: any) => ({
        title: sub.title || 'Unknown Problem',
        titleSlug: sub.titleSlug || '',
        timestamp: sub.timestamp || Date.now() / 1000,
        statusDisplay: sub.statusDisplay || 'Accepted',
        lang: sub.lang || 'Unknown',
      }));
    }

    // Parse submission calendar
    let submissionCalendar: Record<string, number> = {};
    if (calendarData) {
      if (typeof calendarData.submissionCalendar === 'string') {
        try {
          submissionCalendar = JSON.parse(calendarData.submissionCalendar);
        } catch {
          submissionCalendar = {};
        }
      } else if (typeof calendarData.submissionCalendar === 'object') {
        submissionCalendar = calendarData.submissionCalendar;
      }
    }

    const totalSolved = solvedData.solvedProblem ?? (
      (solvedData.easySolved || 0) + (solvedData.mediumSolved || 0) + (solvedData.hardSolved || 0)
    );

    const stats: LeetCodeStats = {
      username: cleanUsername,
      solvedProblem: totalSolved,
      easySolved: solvedData.easySolved || 0,
      mediumSolved: solvedData.mediumSolved || 0,
      hardSolved: solvedData.hardSolved || 0,
      totalQuestions: solvedData.totalQuestions || 3350,
      totalEasy: solvedData.totalEasy || 850,
      totalMedium: solvedData.totalMedium || 1750,
      totalHard: solvedData.totalHard || 750,
      acceptanceRate: profileData.acceptanceRate || 52.4,
      ranking: profileData.ranking || 45000,
      reputation: profileData.reputation || 0,
      contestRating: contestData.contestRating ? Math.round(contestData.contestRating) : undefined,
      contestRanking: contestData.contestRanking || undefined,
      contestGlobalRanking: contestData.contestGlobalRanking || undefined,
      contestTopPercentage: contestData.contestTopPercentage || undefined,
      totalContestsAttended: contestData.contestAttend || undefined,
      recentSubmissions,
      submissionCalendar,
      cachedAt: Date.now(),
      isMockFallback: false,
    };

    memoryCache.set(cleanUsername, { data: stats, timestamp: Date.now() });
    return stats;
  } catch (err: any) {
    console.warn(`[LeetCode Service] Error fetching stats for ${cleanUsername}, serving fallback:`, err.message);
    const fallback = generateFallbackLeetCodeStats(cleanUsername);
    memoryCache.set(cleanUsername, { data: fallback, timestamp: Date.now() });
    return fallback;
  }
}

/**
 * Clear cache for a specific user
 */
export function invalidateLeetCodeCache(username: string): void {
  memoryCache.delete(username.trim().toLowerCase());
}
