import React, { useState, useEffect, useMemo } from 'react';
import { LeaderboardStudent, LeaderboardResponse, LeetCodeStats } from '../types/index.ts';
import { AnimatedCounter } from './AnimatedCounter.tsx';
import {
  Trophy,
  Flame,
  Medal,
  Award,
  Search,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  TrendingUp,
  X,
  Users,
  Target,
  Sparkles,
  ArrowUpDown,
  Zap,
} from 'lucide-react';

interface ClassroomLeaderboardProps {
  classId: string;
  className: string;
  classCode: string;
  token: string;
  onInspectStudent?: (student: {
    id: string;
    name: string;
    email: string;
    leetcodeUsername: string;
    stats?: LeetCodeStats | null;
  }) => void;
}

export const ClassroomLeaderboard: React.FC<ClassroomLeaderboardProps> = ({
  classId,
  className,
  classCode,
  token,
  onInspectStudent,
}) => {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controls
  const [rankingMetric, setRankingMetric] = useState<'solved' | 'rating' | 'hybrid'>('solved');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'contest_only' | 'top_performers'>('all');
  const [refreshingUsername, setRefreshingUsername] = useState<string | null>(null);

  // Fetch Leaderboard from backend
  const fetchLeaderboard = async (isManualRefresh = false) => {
    if (!classId) return;
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/classes/${classId}/leaderboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to fetch classroom leaderboard');
      }

      setData(json);
    } catch (err: any) {
      setError(err.message || 'Unable to load leaderboard data right now');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [classId]);

  // Refresh single student's LeetCode stats directly
  const handleRefreshStudent = async (username: string) => {
    if (!username) return;
    setRefreshingUsername(username);

    try {
      const res = await fetch(`/api/leetcode-stats?username=${encodeURIComponent(username)}&refresh=true`);
      const json = await res.json();

      if (res.ok && (json.stats || json.solvedProblem !== undefined)) {
        const freshStats: LeetCodeStats = json.stats || json;

        // Update student in local leaderboard data
        setData((prev) => {
          if (!prev) return null;
          const updated = prev.leaderboard.map((item) => {
            if (item.leetcodeUsername.toLowerCase() === username.toLowerCase()) {
              return {
                ...item,
                solvedProblem: freshStats.solvedProblem,
                easySolved: freshStats.easySolved,
                mediumSolved: freshStats.mediumSolved,
                hardSolved: freshStats.hardSolved,
                contestRating: freshStats.contestRating,
                contestRanking: freshStats.contestRanking,
                contestGlobalRanking: freshStats.contestGlobalRanking,
                contestTopPercentage: freshStats.contestTopPercentage,
                globalRanking: freshStats.ranking,
                acceptanceRate: freshStats.acceptanceRate,
                stats: freshStats,
                statsError: null,
              };
            }
            return item;
          });

          return {
            ...prev,
            leaderboard: updated,
          };
        });
      }
    } catch {
      // Quiet fail
    } finally {
      setRefreshingUsername(null);
    }
  };

  // Rank and sort students based on selected metric
  const rankedStudents = useMemo(() => {
    if (!data?.leaderboard) return [];

    let list = [...data.leaderboard];

    // Filter by contest or high solver
    if (filterMode === 'contest_only') {
      list = list.filter((s) => s.contestRating && s.contestRating > 0);
    } else if (filterMode === 'top_performers') {
      list = list.filter((s) => s.solvedProblem >= 100 || (s.contestRating && s.contestRating >= 1600));
    }

    // Filter by search text
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.leetcodeUsername.toLowerCase().includes(q)
      );
    }

    // Sort according to metric
    list.sort((a, b) => {
      if (rankingMetric === 'solved') {
        const diff = b.solvedProblem - a.solvedProblem;
        if (diff !== 0) return diff;
        // Tie-breaker: hard solved then medium solved
        if (b.hardSolved !== a.hardSolved) return b.hardSolved - a.hardSolved;
        return (b.contestRating || 0) - (a.contestRating || 0);
      }

      if (rankingMetric === 'rating') {
        const aRating = a.contestRating || 0;
        const bRating = b.contestRating || 0;
        const diff = bRating - aRating;
        if (diff !== 0) return diff;
        return b.solvedProblem - a.solvedProblem;
      }

      // Hybrid score: (solved * 1.5) + (contestRating * 0.8)
      const aScore = (a.solvedProblem * 1.5) + ((a.contestRating || 1200) * 0.8);
      const bScore = (b.solvedProblem * 1.5) + ((b.contestRating || 1200) * 0.8);
      return bScore - aScore;
    });

    return list;
  }, [data?.leaderboard, rankingMetric, filterMode, searchQuery]);

  // Top 3 Podium Students (derived from rankedStudents)
  const podiumStudents = useMemo(() => {
    return rankedStudents.slice(0, 3);
  }, [rankedStudents]);

  const maxSolvedInClass = useMemo(() => {
    if (!data?.leaderboard || data.leaderboard.length === 0) return 1;
    return Math.max(...data.leaderboard.map((s) => s.solvedProblem), 1);
  }, [data?.leaderboard]);

  // CSV Export for Classroom Leaderboard
  const exportLeaderboardCSV = () => {
    if (!data) return;

    let csvContent = `Classroom Leaderboard: ${data.className} (${data.classCode})\n`;
    csvContent += `Generated On: ${new Date().toISOString()}\n`;
    csvContent += `Ranking Metric: ${rankingMetric === 'solved' ? 'Problems Solved' : rankingMetric === 'rating' ? 'Contest Rating' : 'Hybrid Score'}\n\n`;
    csvContent += 'Rank,Student Name,Email,LeetCode Handle,Total Solved,Easy,Medium,Hard,Contest Rating,Global Contest Rank,Global Rank,Acceptance Rate\n';

    rankedStudents.forEach((s, idx) => {
      const rank = idx + 1;
      const rating = s.contestRating ?? 'Unrated';
      const cRank = s.contestRanking ?? 'N/A';
      const acc = s.acceptanceRate ? `${s.acceptanceRate}%` : 'N/A';
      csvContent += `${rank},"${s.name}","${s.email}","${s.leetcodeUsername || 'None'}",${s.solvedProblem},${s.easySolved},${s.mediumSolved},${s.hardSolved},"${rating}","${cRank}","${s.globalRanking}","${acc}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.className.replace(/[^a-zA-Z0-9_-]/g, '_')}_leaderboard_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Contest Rating Tiers
  const getRatingBadge = (rating?: number) => {
    if (!rating) {
      return {
        label: 'Unrated',
        textColor: 'text-zinc-500',
        borderColor: 'border-zinc-800',
        bgColor: 'bg-zinc-900',
      };
    }
    if (rating >= 2200) {
      return {
        label: 'Guardian',
        textColor: 'text-rose-400',
        borderColor: 'border-rose-500/30',
        bgColor: 'bg-rose-500/10',
      };
    }
    if (rating >= 1850) {
      return {
        label: 'Knight',
        textColor: 'text-amber-400',
        borderColor: 'border-amber-500/30',
        bgColor: 'bg-amber-500/10',
      };
    }
    if (rating >= 1600) {
      return {
        label: 'Challenger',
        textColor: 'text-blue-400',
        borderColor: 'border-blue-500/30',
        bgColor: 'bg-blue-500/10',
      };
    }
    return {
      label: 'Apprentice',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-emerald-500/10',
    };
  };

  return (
    <div className="space-y-6">
      {/* Leaderboard Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Trophy className="w-4 h-4" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Classroom Leaderboard
            </h2>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {classCode}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>{className}</span>
            <span aria-hidden="true">·</span>
            <span>Live algorithmic rankings based on LeetCode API telemetry</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => fetchLeaderboard(true)}
            disabled={isRefreshing || isLoading}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 border border-zinc-700/80 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Data'}</span>
          </button>

          <button
            type="button"
            onClick={exportLeaderboardCSV}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
          <X className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Class Solved */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4.5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Solved</span>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Flame className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : (
                <AnimatedCounter
                  value={data?.leaderboard.reduce((acc, curr) => acc + curr.solvedProblem, 0) || 0}
                />
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Problems solved collectively</p>
          </div>
        </div>

        {/* Average Solved */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4.5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Class Average</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : `~${data?.summary.averageSolved || 0}`}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Solved per active student</p>
          </div>
        </div>

        {/* Top Contest Rating */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4.5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Top Rating</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Trophy className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : data?.summary.topRating ? data.summary.topRating.rating : 'None'}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500 truncate">
              {data?.summary.topRating ? `${data.summary.topRating.name}` : 'No active competitors'}
            </p>
          </div>
        </div>

        {/* Competitor Count */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4.5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Competitors</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : `${data?.summary.studentsWithStats || 0}/${data?.summary.totalStudents || 0}`}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-500">Enrolled with LeetCode handle</p>
          </div>
        </div>
      </div>

      {/* Top 3 Visual Podium (When at least 2 students exist) */}
      {!isLoading && podiumStudents.length >= 2 && (
        <div className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-zinc-800/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-mono">
                Classroom Honor Roll
              </h3>
            </div>
            <span className="text-xs text-zinc-500">
              Ranked by {rankingMetric === 'solved' ? 'Problems Solved' : rankingMetric === 'rating' ? 'Contest Rating' : 'Hybrid Index'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 items-end">
            {/* 2nd Place Podium (Silver - Left) */}
            {podiumStudents[1] && (
              <div
                onClick={() => onInspectStudent?.(podiumStudents[1])}
                className="order-2 md:order-1 cursor-pointer group p-5 rounded-2xl bg-zinc-900/80 border border-zinc-700/80 hover:border-zinc-500 transition-all transform hover:-translate-y-1 relative shadow-lg flex flex-col items-center text-center space-y-3"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-600 text-zinc-200 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <Medal className="w-3 h-3 text-zinc-300" />
                  <span>2nd Place</span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-zinc-700 to-zinc-500 p-[1.5px] mt-1">
                  <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center font-black text-zinc-200 text-base">
                    {podiumStudents[1].name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-white text-sm group-hover:text-orange-400 transition-colors">
                    {podiumStudents[1].name}
                  </h4>
                  <a
                    href={`https://leetcode.com/u/${podiumStudents[1].leetcodeUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-0.5"
                  >
                    <span>@{podiumStudents[1].leetcodeUsername}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="w-full pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Solved</div>
                    <div className="text-base font-black text-white">
                      {podiumStudents[1].solvedProblem}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Rating</div>
                    <div className="text-base font-black text-zinc-300">
                      {podiumStudents[1].contestRating || 'Unrated'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1st Place Podium (Gold - Center, Elevated) */}
            {podiumStudents[0] && (
              <div
                onClick={() => onInspectStudent?.(podiumStudents[0])}
                className="order-1 md:order-2 cursor-pointer group p-6 rounded-3xl bg-gradient-to-b from-amber-500/15 via-zinc-900/90 to-zinc-900 border-2 border-amber-500/50 hover:border-amber-400 transition-all transform hover:-translate-y-1.5 relative shadow-2xl shadow-amber-500/10 flex flex-col items-center text-center space-y-3.5"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[11px] font-black font-mono flex items-center gap-1.5 shadow-md">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>1st Place Champion</span>
                </div>

                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-300 p-[2px] mt-2 shadow-lg shadow-amber-500/20">
                  <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center font-black text-amber-300 text-xl">
                    {podiumStudents[0].name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div>
                  <h4 className="font-black text-white text-base group-hover:text-amber-300 transition-colors">
                    {podiumStudents[0].name}
                  </h4>
                  <a
                    href={`https://leetcode.com/u/${podiumStudents[0].leetcodeUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-mono text-amber-400/90 hover:text-amber-300 flex items-center justify-center gap-1 mt-0.5"
                  >
                    <span>@{podiumStudents[0].leetcodeUsername}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="w-full pt-3 border-t border-amber-500/20 grid grid-cols-2 gap-3 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-amber-400/80 font-bold uppercase">Total Solved</div>
                    <div className="text-xl font-black text-white">
                      {podiumStudents[0].solvedProblem}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-400/80 font-bold uppercase">Contest Rating</div>
                    <div className="text-xl font-black text-amber-400">
                      {podiumStudents[0].contestRating || 'Unrated'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3rd Place Podium (Bronze - Right) */}
            {podiumStudents[2] && (
              <div
                onClick={() => onInspectStudent?.(podiumStudents[2])}
                className="order-3 cursor-pointer group p-5 rounded-2xl bg-zinc-900/80 border border-amber-900/40 hover:border-amber-700/80 transition-all transform hover:-translate-y-1 relative shadow-lg flex flex-col items-center text-center space-y-3"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-mono font-bold flex items-center gap-1 shadow-sm">
                  <Medal className="w-3 h-3 text-amber-600" />
                  <span>3rd Place</span>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-700 to-amber-900 p-[1.5px] mt-1">
                  <div className="w-full h-full bg-zinc-900 rounded-[14px] flex items-center justify-center font-black text-amber-500 text-base">
                    {podiumStudents[2].name.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-white text-sm group-hover:text-orange-400 transition-colors">
                    {podiumStudents[2].name}
                  </h4>
                  <a
                    href={`https://leetcode.com/u/${podiumStudents[2].leetcodeUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] font-mono text-zinc-400 hover:text-amber-400 flex items-center justify-center gap-1 mt-0.5"
                  >
                    <span>@{podiumStudents[2].leetcodeUsername}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="w-full pt-2 border-t border-zinc-800 grid grid-cols-2 gap-2 text-center text-xs">
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Solved</div>
                    <div className="text-base font-black text-white">
                      {podiumStudents[2].solvedProblem}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-zinc-500 uppercase">Rating</div>
                    <div className="text-base font-black text-zinc-300">
                      {podiumStudents[2].contestRating || 'Unrated'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Bar: Metric Selector, Filter & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800">
        {/* Metric Segmented Buttons */}
        <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setRankingMetric('solved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rankingMetric === 'solved'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Problems Solved</span>
          </button>

          <button
            type="button"
            onClick={() => setRankingMetric('rating')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rankingMetric === 'rating'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Contest Rating</span>
          </button>

          <button
            type="button"
            onClick={() => setRankingMetric('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              rankingMetric === 'hybrid'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Combined Score</span>
          </button>
        </div>

        {/* Filter and Search */}
        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="hidden sm:flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterMode === 'all'
                  ? 'bg-zinc-800 text-white border border-zinc-700'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({data?.leaderboard.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('contest_only')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                filterMode === 'contest_only'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Contest Rated
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter leaderboard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/90 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4 text-center w-16">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">LeetCode Handle</th>
                <th className="py-3.5 px-4 text-center">
                  <span className={rankingMetric === 'solved' ? 'text-orange-400 font-bold' : ''}>
                    Total Solved
                  </span>
                </th>
                <th className="py-3.5 px-4">Difficulty Split</th>
                <th className="py-3.5 px-4 text-center">
                  <span className={rankingMetric === 'rating' ? 'text-amber-400 font-bold' : ''}>
                    Contest Rating
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">Global Rank</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    <RefreshCw className="w-5 h-5 text-orange-400 animate-spin mx-auto mb-2" />
                    <span>Compiling classroom leaderboard...</span>
                  </td>
                </tr>
              ) : rankedStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                rankedStudents.map((student, idx) => {
                  const rank = idx + 1;
                  const isTop1 = rank === 1;
                  const isTop2 = rank === 2;
                  const isTop3 = rank === 3;
                  const ratingBadge = getRatingBadge(student.contestRating);
                  const isRefreshingThis = refreshingUsername === student.leetcodeUsername;
                  const solvedPct = Math.round((student.solvedProblem / maxSolvedInClass) * 100);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-zinc-800/40 transition-colors ${
                        isTop1
                          ? 'bg-amber-500/[0.04]'
                          : isTop2
                          ? 'bg-zinc-700/[0.05]'
                          : isTop3
                          ? 'bg-amber-900/[0.05]'
                          : ''
                      }`}
                    >
                      {/* Rank Indicator */}
                      <td className="py-3.5 px-4 text-center">
                        {isTop1 ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 shadow-sm">
                            <Trophy className="w-3.5 h-3.5" />
                          </div>
                        ) : isTop2 ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-zinc-700/50 text-zinc-200 font-black border border-zinc-500/40 shadow-sm">
                            <Medal className="w-3.5 h-3.5 text-zinc-300" />
                          </div>
                        ) : isTop3 ? (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-950/60 text-amber-400 font-black border border-amber-800/50 shadow-sm">
                            <Medal className="w-3.5 h-3.5 text-amber-600" />
                          </div>
                        ) : (
                          <span className="font-mono text-zinc-500 font-bold">#{rank}</span>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-white text-xs">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-white flex items-center gap-1.5">
                              <span>{student.name}</span>
                              {isTop1 && (
                                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                  Lead
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 font-mono">{student.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* LeetCode Handle */}
                      <td className="py-3.5 px-4">
                        {student.leetcodeUsername ? (
                          <a
                            href={`https://leetcode.com/u/${student.leetcodeUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-amber-400 hover:text-amber-300 hover:underline"
                          >
                            <span>{student.leetcodeUsername}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-zinc-500 italic text-[11px]">Unlinked</span>
                        )}
                      </td>

                      {/* Total Problems Solved with relative bar */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="text-sm font-black text-white font-mono">
                            {student.solvedProblem}
                          </span>
                          <div className="w-16 h-1.5 bg-zinc-800 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                              style={{ width: `${Math.max(solvedPct, 6)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Difficulty Split (Easy / Med / Hard) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Easy Solved">
                            E: {student.easySolved}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Medium Solved">
                            M: {student.mediumSolved}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Hard Solved">
                            H: {student.hardSolved}
                          </span>
                        </div>
                      </td>

                      {/* Contest Rating & Tier */}
                      <td className="py-3.5 px-4 text-center">
                        {student.contestRating ? (
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="font-mono font-black text-amber-300 text-xs">
                              {student.contestRating}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${ratingBadge.bgColor} ${ratingBadge.textColor} ${ratingBadge.borderColor}`}>
                              {ratingBadge.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px] font-mono">Unrated</span>
                        )}
                      </td>

                      {/* Global Ranking */}
                      <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                        {student.globalRanking ? (
                          <span className="text-zinc-300">
                            #{student.globalRanking.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {student.stats && (
                            <button
                              type="button"
                              onClick={() => onInspectStudent?.(student)}
                              className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                              title="Inspect comprehensive analytics"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {student.leetcodeUsername && (
                            <button
                              type="button"
                              onClick={() => handleRefreshStudent(student.leetcodeUsername)}
                              disabled={isRefreshingThis}
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                              title="Force refresh LeetCode stats"
                            >
                              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingThis ? 'animate-spin text-amber-400' : ''}`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
