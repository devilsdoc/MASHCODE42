import React, { useState, useEffect } from 'react';
import { User, ClassItem, EnrolledStudent } from '../types/index.ts';
import { filterAndSortStudents } from '../utils/classroom-logic.ts';
import { generateStudentsCSV, downloadCSV } from '../utils/csv-export.ts';
import { StudentStatsCard } from './StudentStatsCard.tsx';
import { AnimatedCounter } from './AnimatedCounter.tsx';
import {
  Plus,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  Users,
  Award,
  TrendingUp,
  UserX,
  ExternalLink,
  Eye,
  RefreshCw,
  BookOpen,
  AlertCircle,
  X,
  Download,
  FileSpreadsheet,
  BarChart2,
  Trophy,
} from 'lucide-react';
import { ClassroomLeaderboard } from './ClassroomLeaderboard.tsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TeacherDashboardProps {
  user: User;
  token: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, token }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active view tab: 'roster' | 'analytics' | 'classes' | 'leaderboard'
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics' | 'classes' | 'leaderboard'>('roster');

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'solved' | 'rating' | 'name' | 'joinedAt'>('solved');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minSolved, setMinSolved] = useState<number>(0);

  // Create class modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Student details modal state
  const [inspectStudent, setInspectStudent] = useState<EnrolledStudent | null>(null);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Remove confirmation modal state
  const [studentToRemove, setStudentToRemove] = useState<EnrolledStudent | null>(null);
  const [isRemovingStudent, setIsRemovingStudent] = useState(false);

  // Feedback states
  const [copiedCode, setCopiedCode] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);

  // 1. Fetch classes for this teacher
  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    setError(null);
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load classes');
      setClasses(data.classes || []);
      if (data.classes && data.classes.length > 0 && !selectedClassId) {
        setSelectedClassId(data.classes[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingClasses(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // 2. Fetch students for the selected class
  const fetchStudents = async (classId: string) => {
    if (!classId) return;
    setIsLoadingStudents(true);
    setError(null);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load student statistics');
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    } else {
      setStudents([]);
    }
  }, [selectedClassId]);

  // Handle Create Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setCreateError('Class name is required');
      return;
    }

    setIsCreatingClass(true);
    setCreateError(null);
    try {
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newClassName,
          description: newClassDesc,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create class');

      const created = data.class;
      setClasses((prev) => [created, ...prev]);
      setSelectedClassId(created.id);
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassDesc('');
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setIsCreatingClass(false);
    }
  };

  // Handle Remove Student
  const handleConfirmRemoveStudent = async () => {
    if (!studentToRemove || !selectedClassId) return;
    setIsRemovingStudent(true);
    try {
      const res = await fetch(`/api/classes/${selectedClassId}/students/${studentToRemove.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove student');

      setStudents((prev) => prev.filter((s) => s.id !== studentToRemove.id));
      setClasses((prev) =>
        prev.map((c) =>
          c.id === selectedClassId ? { ...c, studentCount: Math.max(0, (c.studentCount || 1) - 1) } : c
        )
      );
      setStudentToRemove(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsRemovingStudent(false);
    }
  };

  // Export to CSV Handler
  const handleExportCSV = () => {
    if (students.length === 0) {
      alert('No student performance records to export.');
      return;
    }
    setIsExportingCSV(true);
    try {
      const csvString = generateStudentsCSV(filteredStudents);
      const safeClassName = (selectedClass?.name || 'Classroom').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${safeClassName}_student_performance_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCSV(csvString, filename);
    } finally {
      setTimeout(() => setIsExportingCSV(false), 500);
    }
  };

  // Refresh single student stats
  const handleRefreshStudentStats = async (username: string) => {
    setIsRefreshingStats(true);
    try {
      const res = await fetch(`/api/leetcode-stats?username=${encodeURIComponent(username)}&refresh=true`);
      const data = await res.json();
      if (res.ok && (data.stats || data.solvedProblem !== undefined)) {
        const studentStats = data.stats || data;
        setStudents((prev) =>
          prev.map((s) =>
            s.leetcodeUsername.toLowerCase() === username.toLowerCase()
              ? { ...s, stats: studentStats }
              : s
          )
        );
        if (inspectStudent && inspectStudent.leetcodeUsername.toLowerCase() === username.toLowerCase()) {
          setInspectStudent((prev) => (prev ? { ...prev, stats: studentStats } : null));
        }
      }
    } catch {
      // Handled quietly
    } finally {
      setIsRefreshingStats(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Filter and sort students
  const filteredStudents = React.useMemo(() => {
    return filterAndSortStudents(students as any, {
      search,
      sortBy,
      sortOrder,
      minSolved,
    }) as unknown as EnrolledStudent[];
  }, [students, search, sortBy, sortOrder, minSolved]);

  // Aggregate Metrics for this class
  const classMetrics = React.useMemo(() => {
    if (students.length === 0) {
      return { totalSolved: 0, avgSolved: 0, topStudent: null, avgRating: 0, ratedCount: 0 };
    }

    let totalSolved = 0;
    let totalRating = 0;
    let ratedCount = 0;
    let topStudent: EnrolledStudent | null = null;
    let maxSolved = -1;

    for (const student of students) {
      const solved = student.stats?.solvedProblem || 0;
      totalSolved += solved;

      if (solved > maxSolved) {
        maxSolved = solved;
        topStudent = student;
      }

      if (student.stats?.contestRating) {
        totalRating += student.stats.contestRating;
        ratedCount++;
      }
    }

    return {
      totalSolved,
      avgSolved: Math.round(totalSolved / students.length),
      topStudent,
      avgRating: ratedCount > 0 ? Math.round(totalRating / ratedCount) : 0,
      ratedCount,
    };
  }, [students]);

  // Comparison chart data for Class Analytics
  const classComparisonData = React.useMemo(() => {
    return students
      .filter((s) => s.stats)
      .map((s) => ({
        name: s.name.split(' ')[0],
        solved: s.stats?.solvedProblem || 0,
        easy: s.stats?.easySolved || 0,
        medium: s.stats?.mediumSolved || 0,
        hard: s.stats?.hardSolved || 0,
        rating: s.stats?.contestRating || 0,
      }))
      .sort((a, b) => b.solved - a.solved);
  }, [students]);

  return (
    <div className="space-y-6">
      {/* Top Banner: Mashcode Instructor Hub */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Instructor Dashboard
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
              Mashcode Pro
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Live aggregated problem breakdown, contest ratings, and activity heatmaps across all enrolled students.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-xs transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Classroom</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-orange-400" />
          <span>Student Roster & Stats</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Leaderboard</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Class Analytics</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>All Classrooms ({classes.length})</span>
        </button>
      </div>

      {/* Class Selection Strip */}
      {isLoadingClasses ? (
        <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl">
          <RefreshCw className="w-6 h-6 text-orange-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-zinc-400">Loading classrooms...</p>
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/80 border border-dashed border-zinc-800 rounded-3xl">
          <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-zinc-200">No classes created yet</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-6">
            Get started by creating your first classroom. You will receive a unique 6-character code to share with your students!
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Class</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Class Selector Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {classes.map((c) => {
              const isSelected = c.id === selectedClassId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedClassId(c.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2.5 border ${
                    isSelected
                      ? 'bg-zinc-100 text-zinc-950 border-white shadow-md'
                      : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border-zinc-800'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-orange-500" />
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-zinc-300 text-zinc-900 font-bold' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {c.studentCount ?? 0} students
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Class Header Card */}
          {selectedClass && (
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-lg space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-black text-white">{selectedClass.name}</h2>
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono border border-zinc-700">
                      ID: {selectedClass.id}
                    </span>
                  </div>
                  {selectedClass.description && (
                    <p className="text-xs text-zinc-400 mt-1 max-w-2xl">{selectedClass.description}</p>
                  )}
                </div>

                {/* 6-Character Class Code Highlight */}
                <div className="flex items-center gap-3 bg-zinc-950 p-3 rounded-2xl border border-zinc-800/80 self-start md:self-auto shadow-inner">
                  <div className="text-left">
                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
                      Student Join Code
                    </div>
                    <div className="text-2xl font-mono font-black text-orange-400 tracking-widest">
                      {selectedClass.code}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(selectedClass.code)}
                    className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl transition-all border border-zinc-700/80 flex items-center gap-1.5 text-xs font-bold"
                    title="Copy Join Code"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-orange-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Class Summary Stats with Animated Numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-medium">Total Enrolled</div>
                    <div className="text-lg font-black text-white">
                      <AnimatedCounter value={students.length} /> Students
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-medium">Class Avg. Solved</div>
                    <div className="text-lg font-black text-white">
                      <AnimatedCounter value={classMetrics.avgSolved} /> Problems
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-medium">Top Solver</div>
                    <div className="text-sm font-bold text-white truncate max-w-[130px]">
                      {classMetrics.topStudent ? classMetrics.topStudent.name : 'None yet'}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/70 p-4 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-500 font-medium">Avg Contest Rating</div>
                    <div className="text-lg font-black text-amber-400">
                      {classMetrics.avgRating > 0 ? (
                        <AnimatedCounter value={classMetrics.avgRating} />
                      ) : (
                        'Unrated'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Stats Table Section */}
          {activeTab === 'roster' && (
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
              {/* Table Control Bar */}
              <div className="p-5 border-b border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-white">Enrolled Students & Performance</h3>
                  <p className="text-xs text-zinc-400">Live breakdown with green/yellow/red difficulty tags</p>
                </div>

                {/* Filters, Search & Export Actions */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Search */}
                  <div className="relative min-w-[180px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search student or handle..."
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Sort By Dropdown */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-zinc-500 font-medium">Sort:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-orange-500"
                    >
                      <option value="solved">Solved Count</option>
                      <option value="rating">Contest Rating</option>
                      <option value="name">Student Name</option>
                      <option value="joinedAt">Date Joined</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                      className="p-1.5 bg-zinc-950 border border-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-800"
                      title={`Order: ${sortOrder}`}
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Export to CSV Button */}
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    disabled={isExportingCSV || students.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40"
                    title="Export student stats to CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isExportingCSV ? 'Exporting...' : 'Export CSV'}</span>
                  </button>

                  {/* Refresh all */}
                  <button
                    type="button"
                    onClick={() => selectedClassId && fetchStudents(selectedClassId)}
                    disabled={isLoadingStudents}
                    className="p-2 bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors"
                    title="Reload Class Stats"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingStudents ? 'animate-spin text-orange-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Table */}
              {isLoadingStudents ? (
                <div className="p-12 text-center">
                  <RefreshCw className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-zinc-200 font-semibold">Synchronizing student LeetCode statistics...</p>
                  <p className="text-xs text-zinc-500 mt-1">Aggregating problem counts and contest rankings via backend proxy</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-zinc-400">
                  <Users className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                  <p className="font-semibold text-zinc-300">
                    {students.length === 0 ? 'No students enrolled yet' : 'No students match your filter'}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                    {students.length === 0
                      ? `Share class code "${selectedClass?.code}" with your students so they can join!`
                      : 'Try clearing your search query or adjusting the sort settings.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm min-w-[700px]">
                    <thead className="bg-zinc-950/70 text-zinc-400 text-[11px] font-bold uppercase tracking-wider border-b border-zinc-800">
                      <tr>
                        <th className="py-3.5 px-5">Student</th>
                        <th className="py-3.5 px-4">LeetCode Handle</th>
                        <th className="py-3.5 px-4 text-center">Total Solved</th>
                        <th className="py-3.5 px-4">Difficulty Distribution</th>
                        <th className="py-3.5 px-4 text-center">Contest Rating</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80">
                      {filteredStudents.map((student) => {
                        const stats = student.stats;
                        return (
                          <tr key={student.id} className="hover:bg-zinc-800/30 transition-colors">
                            {/* Student Info */}
                            <td className="py-4 px-5">
                              <div className="font-bold text-white text-sm">{student.name}</div>
                              <div className="text-xs text-zinc-500 font-mono">{student.email}</div>
                            </td>

                            {/* LeetCode Handle */}
                            <td className="py-4 px-4">
                              {student.leetcodeUsername ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-xs font-semibold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-lg border border-orange-400/20">
                                    {student.leetcodeUsername}
                                  </span>
                                  <a
                                    href={`https://leetcode.com/u/${student.leetcodeUsername}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-zinc-500 hover:text-orange-400"
                                    title="Open LeetCode Profile"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ) : (
                                <span className="text-xs text-rose-400 italic">No handle set</span>
                              )}
                            </td>

                            {/* Solved Count */}
                            <td className="py-4 px-4 text-center">
                              {stats ? (
                                <div className="flex items-baseline justify-center gap-1.5">
                                  <span className="font-black text-base text-white">
                                    {stats.solvedProblem.toLocaleString()}
                                  </span>
                                  <span className="text-[11px] text-zinc-500 font-medium">solved</span>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">-</span>
                              )}
                            </td>

                            {/* Difficulty Distribution Pill (Green, Yellow, Red) */}
                            <td className="py-4 px-4">
                              {stats ? (
                                <div className="space-y-1.5 min-w-[150px] max-w-[210px]">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {stats.easySolved}E
                                    </span>
                                    <span className="text-amber-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                      {stats.mediumSolved}M
                                    </span>
                                    <span className="text-rose-400 font-bold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                      {stats.hardSolved}H
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                                    <div
                                      style={{
                                        width: `${stats.solvedProblem ? (stats.easySolved / stats.solvedProblem) * 100 : 0}%`,
                                      }}
                                      className="bg-emerald-500 h-full"
                                      title={`Easy: ${stats.easySolved}`}
                                    />
                                    <div
                                      style={{
                                        width: `${stats.solvedProblem ? (stats.mediumSolved / stats.solvedProblem) * 100 : 0}%`,
                                      }}
                                      className="bg-amber-500 h-full"
                                      title={`Medium: ${stats.mediumSolved}`}
                                    />
                                    <div
                                      style={{
                                        width: `${stats.solvedProblem ? (stats.hardSolved / stats.solvedProblem) * 100 : 0}%`,
                                      }}
                                      className="bg-rose-500 h-full"
                                      title={`Hard: ${stats.hardSolved}`}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500 italic">Unavailable</span>
                              )}
                            </td>

                            {/* Contest Rating */}
                            <td className="py-4 px-4 text-center">
                              {stats?.contestRating ? (
                                <div>
                                  <span className="font-extrabold text-amber-400 text-sm">
                                    {stats.contestRating.toLocaleString()}
                                  </span>
                                  {stats.contestRanking && (
                                    <div className="text-[10px] text-zinc-500">
                                      Rank #{stats.contestRanking.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">Unrated</span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {stats && (
                                  <button
                                    type="button"
                                    onClick={() => setInspectStudent(student)}
                                    className="px-3 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all shadow-sm"
                                    title="View full statistics & heatmap"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-orange-400" />
                                    <span>Stats</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setStudentToRemove(student)}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title="Remove student from class"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Classroom Leaderboard Tab */}
          {activeTab === 'leaderboard' && selectedClass && (
            <ClassroomLeaderboard
              classId={selectedClass.id}
              className={selectedClass.name}
              classCode={selectedClass.code}
              token={token}
              onInspectStudent={(student) => {
                setInspectStudent({
                  id: student.id,
                  name: student.name,
                  email: student.email,
                  leetcodeUsername: student.leetcodeUsername,
                  joinedAt: '',
                  stats: student.stats,
                });
              }}
            />
          )}

          {/* Class Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    Classroom Proficiency Analytics
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Comparative distribution of problems solved across enrolled students
                  </p>
                </div>
              </div>

              {/* Class-wide Problem Solving Bar Chart */}
              {classComparisonData.length > 0 && (
                <div className="p-5 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    Problems Solved by Student
                  </span>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classComparisonData}
                        margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                      >
                        <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px' }}
                          labelStyle={{ color: '#f4f4f5' }}
                        />
                        <Bar dataKey="solved" fill="#f97316" radius={[6, 6, 0, 0]} isAnimationActive={true}>
                          {classComparisonData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#f97316' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Total Solved Across Class</span>
                  <div className="text-3xl font-black text-white">
                    <AnimatedCounter value={classMetrics.totalSolved} />
                  </div>
                  <p className="text-xs text-zinc-500">Combined solutions submitted by all active students.</p>
                </div>
                <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Rated Contestants</span>
                  <div className="text-3xl font-black text-amber-400">{classMetrics.ratedCount} / {students.length}</div>
                  <p className="text-xs text-zinc-500">Students participating in weekly LeetCode contests.</p>
                </div>
                <div className="p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-2">
                  <span className="text-xs font-semibold text-zinc-400">Class Lead</span>
                  <div className="text-2xl font-bold text-orange-400 truncate">
                    {classMetrics.topStudent ? classMetrics.topStudent.name : 'N/A'}
                  </div>
                  <p className="text-xs text-zinc-500">
                    Highest problem volume solved in this classroom.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* All Classes List Tab */}
          {activeTab === 'classes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {classes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClassId(c.id);
                    setActiveTab('roster');
                  }}
                  className={`p-6 rounded-3xl border transition-all cursor-pointer space-y-3 ${
                    c.id === selectedClassId
                      ? 'bg-zinc-900 border-orange-500/50 shadow-lg shadow-orange-500/10'
                      : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-950 text-orange-400 font-bold border border-zinc-800">
                      Code: {c.code}
                    </span>
                    <span className="text-xs text-zinc-400 font-medium">
                      {c.studentCount ?? 0} Students
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white">{c.name}</h4>
                  {c.description && <p className="text-xs text-zinc-400 line-clamp-2">{c.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inspect Student Stats Modal */}
      {inspectStudent && inspectStudent.stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl relative">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">{inspectStudent.name}</span>
                <span className="text-xs text-zinc-400 font-mono">({inspectStudent.email})</span>
              </div>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <StudentStatsCard
                stats={inspectStudent.stats}
                onRefresh={handleRefreshStudentStats}
                isRefreshing={isRefreshingStats}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-orange-400" />
                Create Classroom
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Class Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. CS 201: Data Structures"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Brief curriculum description or weekly challenge goals..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
                <span className="font-semibold text-zinc-200">Class Code:</span> A 6-character code (e.g., <code className="text-orange-400 font-mono font-bold">ALGO24</code>) will be generated automatically for student invitations.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClass}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white transition-all shadow-md shadow-orange-500/20 disabled:opacity-50"
                >
                  {isCreatingClass ? 'Generating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Student Confirmation Dialog */}
      {studentToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Remove Student from Class</h3>
            <p className="text-sm text-zinc-300">
              Are you sure you want to remove <strong className="text-white">{studentToRemove.name}</strong> from this classroom?
            </p>
            <p className="text-xs text-zinc-500">
              They can rejoin anytime using the class code. Their personal LeetCode statistics will not be deleted.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStudentToRemove(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveStudent}
                disabled={isRemovingStudent}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all disabled:opacity-50"
              >
                {isRemovingStudent ? 'Removing...' : 'Remove Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
