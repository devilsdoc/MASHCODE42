import React, { useState } from 'react';
import { LeetCodeStats } from '../types/index.ts';
import { AnimatedCounter } from './AnimatedCounter.tsx';
import {
  ExternalLink,
  Trophy,
  Award,
  Flame,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Layers,
  Calendar,
  Percent,
  BarChart3,
  PieChart as PieChartIcon,
  Compass,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from 'recharts';

interface StudentStatsCardProps {
  stats: LeetCodeStats | null;
  isLoading?: boolean;
  onRefresh?: (username: string) => Promise<void>;
  isRefreshing?: boolean;
  className?: string;
}

export const StudentStatsCard: React.FC<StudentStatsCardProps> = ({
  stats,
  isLoading = false,
  onRefresh,
  isRefreshing = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'activity'>('overview');
  const [chartType, setChartType] = useState<'donut' | 'radar' | 'bar'>('donut');

  // Build heatmap cells for past 16 weeks (112 days) - called unconditionally
  const heatmapDays = React.useMemo(() => {
    const days: Array<{ date: string; count: number; timestamp: number }> = [];
    const today = new Date();
    const calendarMap = stats?.submissionCalendar || {};

    for (let i = 111; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayStartSec = Math.floor(d.getTime() / 1000);
      const dayEndSec = dayStartSec + 86400;

      let count = 0;
      for (const [key, val] of Object.entries(calendarMap)) {
        const sec = Number(key);
        if (sec >= dayStartSec && sec < dayEndSec) {
          count += Number(val);
        }
      }

      days.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
        timestamp: d.getTime(),
      });
    }
    return days;
  }, [stats?.submissionCalendar]);

  const totalHeatmapSubmissions = heatmapDays.reduce((acc, d) => acc + d.count, 0);

  // Difficulty data for Recharts Donut & Bar
  const donutData = React.useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Easy', value: stats.easySolved, color: '#10b981', total: stats.totalEasy || 850 },
      { name: 'Medium', value: stats.mediumSolved, color: '#f59e0b', total: stats.totalMedium || 1750 },
      { name: 'Hard', value: stats.hardSolved, color: '#f43f5e', total: stats.totalHard || 750 },
    ];
  }, [stats]);

  // Radar chart data for Algorithmic Profile
  const radarData = React.useMemo(() => {
    if (!stats) return [];
    const easyPct = stats.totalEasy ? Math.min(100, Math.round((stats.easySolved / stats.totalEasy) * 100)) : 0;
    const medPct = stats.totalMedium ? Math.min(100, Math.round((stats.mediumSolved / stats.totalMedium) * 100)) : 0;
    const hardPct = stats.totalHard ? Math.min(100, Math.round((stats.hardSolved / stats.totalHard) * 100)) : 0;
    const contestPct = stats.contestRating ? Math.min(100, Math.round((stats.contestRating / 3500) * 100)) : 20;
    const acceptPct = stats.acceptanceRate ? Math.round(stats.acceptanceRate) : 50;

    return [
      { subject: 'Easy Prowess', score: easyPct, fullMark: 100 },
      { subject: 'Medium Mastery', score: medPct, fullMark: 100 },
      { subject: 'Hard Depth', score: hardPct, fullMark: 100 },
      { subject: 'Contest Rating', score: contestPct, fullMark: 100 },
      { subject: 'Acceptance %', score: acceptPct, fullMark: 100 },
    ];
  }, [stats]);

  // Loading Skeleton State
  if (isLoading || !stats) {
    return (
      <div className={`bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-6 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800" />
            <div className="space-y-2">
              <div className="w-32 h-4 bg-zinc-800 rounded" />
              <div className="w-48 h-3 bg-zinc-800/60 rounded" />
            </div>
          </div>
          <div className="w-24 h-8 bg-zinc-800 rounded-xl" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-950/60 rounded-2xl border border-zinc-800/60 p-4 space-y-2">
              <div className="w-20 h-3 bg-zinc-800 rounded" />
              <div className="w-28 h-6 bg-zinc-800 rounded" />
            </div>
          ))}
        </div>

        <div className="h-64 bg-zinc-950/60 rounded-3xl border border-zinc-800/60 p-5 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Format relative time
  const formatTime = (timestamp: string | number) => {
    const timeMs = typeof timestamp === 'string' ? Number(timestamp) * 1000 : timestamp * 1000;
    const diff = Math.floor((Date.now() - timeMs) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const cacheAgeMinutes = Math.max(0, Math.floor((Date.now() - stats.cachedAt) / 60000));

  // Custom Chart Tooltip
  const CustomDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl shadow-2xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold" style={{ color: data.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
            <span>{data.name} Difficulty</span>
          </div>
          <div className="text-white font-mono">
            Solved: <span className="font-bold">{data.value.toLocaleString()}</span> / {data.total.toLocaleString()}
          </div>
          <div className="text-zinc-400">
            {((data.value / data.total) * 100).toFixed(1)}% of category solved
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl ${className}`}>
      {/* Header bar */}
      <div className="p-6 border-b border-zinc-800/80 bg-zinc-950/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500/20 to-blue-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-mono font-bold text-lg shadow-inner">
            {stats.username.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-lg text-white">{stats.username}</h3>
              <a
                href={`https://leetcode.com/u/${stats.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-orange-400 hover:text-orange-300 inline-flex items-center gap-1 font-bold bg-orange-500/10 hover:bg-orange-500/20 px-2.5 py-0.5 rounded-full transition-colors border border-orange-500/20"
                title="View on LeetCode"
              >
                LeetCode Profile <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400">
              <span className="font-mono text-zinc-300">
                Rank: #{stats.ranking ? stats.ranking.toLocaleString() : 'N/A'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Clock className="w-3 h-3 text-zinc-500" />
                {cacheAgeMinutes === 0 ? 'Cached just now' : `Cached ${cacheAgeMinutes}m ago (10m TTL)`}
              </span>
              {stats.isMockFallback && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Resilient Fallback Mode
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh(stats.username)}
              disabled={isRefreshing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync LeetCode'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-800 px-6 pt-3 bg-zinc-900/40 gap-4 text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Stats & Visualizations</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'submissions'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Submissions ({stats.recentSubmissions?.length || 0})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('activity')}
          className={`pb-2.5 px-1 border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'activity'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Activity Heatmap</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Cards Grid with Animated Count-Up Numbers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Solved Card */}
              <div className="bg-zinc-950/70 p-5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Total Problems Solved</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-white tracking-tight flex items-baseline">
                    <AnimatedCounter value={stats.solvedProblem} />
                    <span className="text-xs text-zinc-500 font-normal ml-1.5">/ {stats.totalQuestions || 3350}</span>
                  </div>
                  <div className="text-xs text-emerald-400 font-semibold mt-1">
                    {(((stats.solvedProblem || 0) / (stats.totalQuestions || 3350)) * 100).toFixed(1)}% of LeetCode library
                  </div>
                </div>
              </div>

              {/* Contest Rating Card */}
              <div className="bg-zinc-950/70 p-5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Contest Rating</span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-amber-400 tracking-tight">
                    {stats.contestRating ? (
                      <AnimatedCounter value={stats.contestRating} />
                    ) : (
                      'Unrated'
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 font-medium mt-1">
                    {stats.contestGlobalRanking ? `Global Rank #${stats.contestGlobalRanking.toLocaleString()}` : 'No contests yet'}
                  </div>
                </div>
              </div>

              {/* Contest Percentile / Standing */}
              <div className="bg-zinc-950/70 p-5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Contest Standing</span>
                  <Award className="w-4 h-4 text-blue-400" />
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-black text-zinc-100">
                    {stats.contestTopPercentage ? (
                      <span className="text-blue-400">Top {stats.contestTopPercentage}%</span>
                    ) : (
                      'Participant'
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 font-medium mt-1">
                    {stats.totalContestsAttended ? `${stats.totalContestsAttended} contests attended` : 'Practicing questions'}
                  </div>
                </div>
              </div>

              {/* Acceptance Rate */}
              <div className="bg-zinc-950/70 p-5 rounded-2xl border border-zinc-800/80 flex flex-col justify-between shadow-sm">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold">
                  <span>Acceptance Rate</span>
                  <Percent className="w-4 h-4 text-orange-400" />
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-orange-400 tracking-tight">
                    <AnimatedCounter
                      value={Math.round(stats.acceptanceRate || 52)}
                      suffix="%"
                    />
                  </div>
                  <div className="text-xs text-zinc-400 font-medium mt-1">
                    Community reputation: {stats.reputation || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Animated Chart Section */}
            <div className="bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800/90 shadow-xl space-y-6">
              {/* Chart Control Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-500" />
                    Interactive Difficulty & Skill Visualization
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Live visual representation of problem difficulty and algorithmic competencies
                  </p>
                </div>

                {/* Chart Mode Picker */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setChartType('donut')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartType === 'donut'
                        ? 'bg-orange-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <PieChartIcon className="w-3.5 h-3.5" />
                    <span>Donut Chart</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('radar')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartType === 'radar'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Radar Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      chartType === 'bar'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Library Ratio</span>
                  </button>
                </div>
              </div>

              {/* Chart Canvas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Visualizer (Donut, Radar, or Bar) */}
                <div className="lg:col-span-7 h-72 w-full flex items-center justify-center">
                  {chartType === 'donut' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomDonutTooltip />} />
                        <Pie
                          data={donutData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={95}
                          paddingAngle={5}
                          stroke="#09090b"
                          strokeWidth={3}
                          isAnimationActive={true}
                          animationDuration={1000}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'radar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                        <PolarGrid stroke="#27272a" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 10 }} />
                        <Radar
                          name="Proficiency"
                          dataKey="score"
                          stroke="#f97316"
                          fill="#f97316"
                          fillOpacity={0.45}
                          isAnimationActive={true}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                          labelStyle={{ color: '#f4f4f5' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}

                  {chartType === 'bar' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={donutData}
                        margin={{ top: 20, right: 20, left: -10, bottom: 5 }}
                      >
                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip content={<CustomDonutTooltip />} />
                        <Bar
                          dataKey="value"
                          radius={[8, 8, 0, 0]}
                          isAnimationActive={true}
                          animationDuration={1000}
                        >
                          {donutData.map((entry, index) => (
                            <Cell key={`bar-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Right Side Stats Panel */}
                <div className="lg:col-span-5 space-y-3">
                  {/* Easy */}
                  <div className="p-4 bg-zinc-900/90 rounded-2xl border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                      <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Easy</div>
                        <div className="text-xl font-black text-white">
                          <AnimatedCounter value={stats.easySolved} />
                          <span className="text-xs text-zinc-500 font-normal ml-1.5">/ {stats.totalEasy || 850}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 font-mono font-bold">
                      {stats.totalEasy ? `${((stats.easySolved / stats.totalEasy) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>

                  {/* Medium */}
                  <div className="p-4 bg-zinc-900/90 rounded-2xl border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                      <div>
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Medium</div>
                        <div className="text-xl font-black text-white">
                          <AnimatedCounter value={stats.mediumSolved} />
                          <span className="text-xs text-zinc-500 font-normal ml-1.5">/ {stats.totalMedium || 1750}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 font-mono font-bold">
                      {stats.totalMedium ? `${((stats.mediumSolved / stats.totalMedium) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>

                  {/* Hard */}
                  <div className="p-4 bg-zinc-900/90 rounded-2xl border border-rose-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                      <div>
                        <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">Hard</div>
                        <div className="text-xl font-black text-white">
                          <AnimatedCounter value={stats.hardSolved} />
                          <span className="text-xs text-zinc-500 font-normal ml-1.5">/ {stats.totalHard || 750}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 font-mono font-bold">
                      {stats.totalHard ? `${((stats.hardSolved / stats.totalHard) * 100).toFixed(0)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
              <span className="font-semibold text-zinc-200">Recent 5 Submissions</span>
              <span>Updated via LeetCode API</span>
            </div>

            {stats.recentSubmissions && stats.recentSubmissions.length > 0 ? (
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/60">
                {stats.recentSubmissions.map((sub, idx) => {
                  const isAccepted = sub.statusDisplay === 'Accepted';
                  return (
                    <div
                      key={idx}
                      className="p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isAccepted ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-sm text-zinc-100">
                            {sub.title}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-zinc-800/90 rounded-md text-[11px] font-mono text-zinc-300">
                              {sub.lang}
                            </span>
                            <span>•</span>
                            <span>{formatTime(sub.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            isAccepted
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {sub.statusDisplay}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-zinc-950/40 rounded-2xl border border-zinc-800 text-zinc-400">
                <Clock className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
                <p className="text-sm font-medium">No recent submissions found for this user.</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Heatmap Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                {totalHeatmapSubmissions} submissions in the past 16 weeks
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-zinc-800" />
                <div className="w-3 h-3 rounded-sm bg-emerald-950" />
                <div className="w-3 h-3 rounded-sm bg-emerald-600" />
                <div className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span>More</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="p-5 bg-zinc-950/60 border border-zinc-800 rounded-2xl overflow-x-auto">
              <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-max">
                {heatmapDays.map((day, idx) => {
                  let colorClass = 'bg-zinc-800/80 hover:ring-1 hover:ring-zinc-400';
                  if (day.count > 0 && day.count <= 2) {
                    colorClass = 'bg-emerald-950 hover:ring-1 hover:ring-emerald-400';
                  } else if (day.count > 2 && day.count <= 5) {
                    colorClass = 'bg-emerald-600 hover:ring-1 hover:ring-emerald-300';
                  } else if (day.count > 5) {
                    colorClass = 'bg-emerald-400 hover:ring-1 hover:ring-emerald-200';
                  }

                  return (
                    <div
                      key={idx}
                      className={`w-3.5 h-3.5 rounded-sm transition-all cursor-pointer ${colorClass}`}
                      title={`${day.date}: ${day.count} submission${day.count === 1 ? '' : 's'}`}
                    />
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-zinc-500 italic">
              Hover over cells to view daily submission activity. Daily stats are synchronized with LeetCode calendar data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
