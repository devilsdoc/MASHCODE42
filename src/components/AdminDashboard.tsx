import React, { useState, useEffect, useMemo } from 'react';
import { User, LeetCodeStats } from '../types/index.ts';
import { AnimatedCounter } from './AnimatedCounter.tsx';
import { StudentStatsCard } from './StudentStatsCard.tsx';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  BookOpen,
  Layers,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  AlertTriangle,
  X,
  Code,
  Calendar,
  Mail,
  User as UserIcon,
  Flame,
  Trophy,
  Award,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface TeacherItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdClassesCount: number;
  totalStudentsCount: number;
  createdAt: string;
}

interface StudentItem {
  id: string;
  name: string;
  email: string;
  role: string;
  leetcodeUsername?: string | null;
  enrolledClassesCount: number;
  enrolledClasses: string[];
  createdAt: string;
  stats?: LeetCodeStats | null;
}

interface ClassStudentItem {
  id: string;
  name: string;
  email: string;
  leetcodeUsername?: string | null;
}

interface AdminClassItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  studentCount: number;
  students: ClassStudentItem[];
  createdAt: string;
}

interface AdminOverviewData {
  stats: {
    totalUsers: number;
    totalTeachers: number;
    totalStudents: number;
    totalClasses: number;
    totalEnrollments: number;
  };
  teachers: TeacherItem[];
  students: StudentItem[];
  classes: AdminClassItem[];
}

interface AdminDashboardProps {
  user: User;
  token: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, token }) => {
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'classes' | 'god_mode'>('teachers');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // God Mode state
  const [studentsWithStats, setStudentsWithStats] = useState<StudentItem[]>([]);
  const [isLoadingGodMode, setIsLoadingGodMode] = useState(false);
  const [godModeSort, setGodModeSort] = useState<'solved_desc' | 'solved_asc' | 'hard_desc' | 'name'>('solved_desc');
  const [godModeFilter, setGodModeFilter] = useState<'all' | 'has_handle' | 'no_handle'>('all');
  const [inspectStudent, setInspectStudent] = useState<StudentItem | null>(null);
  const [refreshingUsername, setRefreshingUsername] = useState<string | null>(null);

  // Modal inspection state for class roster
  const [selectedClass, setSelectedClass] = useState<AdminClassItem | null>(null);

  // Deletion modal state
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'user' | 'class';
    id: string;
    name: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchOverview = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to fetch admin dashboard data');
      }

      const result: AdminOverviewData = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'An error occurred while loading admin overview.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchGodModeStats = async () => {
    setIsLoadingGodMode(true);
    try {
      const res = await fetch('/api/admin/students-with-stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setStudentsWithStats(json.students || []);
      }
    } catch {
      // Handled quietly
    } finally {
      setIsLoadingGodMode(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [token]);

  // Load God Mode stats when tab becomes active
  useEffect(() => {
    if (activeTab === 'god_mode' && studentsWithStats.length === 0) {
      fetchGodModeStats();
    }
  }, [activeTab]);

  // Refresh single student's LeetCode stats via direct GraphQL
  const handleRefreshStudentStats = async (username: string) => {
    setRefreshingUsername(username);
    try {
      const res = await fetch(`/api/leetcode-stats?username=${encodeURIComponent(username)}&refresh=true`);
      const resData = await res.json();
      if (res.ok && (resData.stats || resData.solvedProblem !== undefined)) {
        const updatedStats: LeetCodeStats = resData.stats || resData;
        setStudentsWithStats((prev) =>
          prev.map((s) =>
            s.leetcodeUsername && s.leetcodeUsername.toLowerCase() === username.toLowerCase()
              ? { ...s, stats: updatedStats }
              : s
          )
        );
        if (inspectStudent && inspectStudent.leetcodeUsername?.toLowerCase() === username.toLowerCase()) {
          setInspectStudent((prev) => (prev ? { ...prev, stats: updatedStats } : null));
        }
      }
    } catch {
      // Handled quietly
    } finally {
      setRefreshingUsername(null);
    }
  };

  // Copy class code to clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Delete handler
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setActionMessage(null);

    try {
      const endpoint =
        itemToDelete.type === 'user'
          ? `/api/admin/users/${itemToDelete.id}`
          : `/api/admin/classes/${itemToDelete.id}`;

      const res = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resJson.error || `Failed to delete ${itemToDelete.type}`);
      }

      setActionMessage({
        type: 'success',
        text: `Successfully removed ${itemToDelete.type}: "${itemToDelete.name}"`,
      });
      setItemToDelete(null);
      await fetchOverview(true);
      if (activeTab === 'god_mode') {
        await fetchGodModeStats();
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err.message || `Failed to delete ${itemToDelete.type}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export functions
  const exportCSV = (type: 'teachers' | 'students' | 'classes' | 'god_mode' | 'all') => {
    if (!data) return;

    let csvContent = '';
    const filename = `mashcode-admin-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (type === 'teachers' || type === 'all') {
      csvContent += '--- TEACHERS ---\n';
      csvContent += 'ID,Name,Email,Created Classes Count,Total Students Count,Joined At\n';
      data.teachers.forEach((t) => {
        csvContent += `"${t.id}","${t.name}","${t.email}",${t.createdClassesCount},${t.totalStudentsCount},"${t.createdAt}"\n`;
      });
      csvContent += '\n';
    }

    if (type === 'students' || type === 'all') {
      csvContent += '--- STUDENTS ---\n';
      csvContent += 'ID,Name,Email,LeetCode Username,Enrolled Classes Count,Joined At\n';
      data.students.forEach((s) => {
        csvContent += `"${s.id}","${s.name}","${s.email}","${s.leetcodeUsername || 'None'}",${s.enrolledClassesCount},"${s.createdAt}"\n`;
      });
      csvContent += '\n';
    }

    if (type === 'classes' || type === 'all') {
      csvContent += '--- CLASSES ---\n';
      csvContent += 'ID,Name,Code,Instructor,Instructor Email,Enrolled Count,Created At\n';
      data.classes.forEach((c) => {
        csvContent += `"${c.id}","${c.name}","${c.code}","${c.teacherName}","${c.teacherEmail}",${c.studentCount},"${c.createdAt}"\n`;
      });
      csvContent += '\n';
    }

    if (type === 'god_mode' || type === 'all') {
      csvContent += '--- GOD MODE: STUDENT LEETCODE PERFORMANCE ---\n';
      csvContent += 'Student ID,Name,Email,LeetCode Handle,Total Solved,Easy Solved,Medium Solved,Hard Solved,Global Ranking,Acceptance Rate,Enrolled Classes\n';
      studentsWithStats.forEach((s) => {
        const solved = s.stats?.solvedProblem ?? 0;
        const easy = s.stats?.easySolved ?? 0;
        const med = s.stats?.mediumSolved ?? 0;
        const hard = s.stats?.hardSolved ?? 0;
        const rank = s.stats?.ranking ?? 'N/A';
        const acc = s.stats?.acceptanceRate ? `${s.stats.acceptanceRate}%` : 'N/A';
        const classes = (s.enrolledClasses || []).join('; ');
        csvContent += `"${s.id}","${s.name}","${s.email}","${s.leetcodeUsername || 'None'}",${solved},${easy},${med},${hard},"${rank}","${acc}","${classes}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered views
  const filteredTeachers = useMemo(() => {
    if (!data?.teachers) return [];
    if (!searchQuery.trim()) return data.teachers;
    const q = searchQuery.toLowerCase().trim();
    return data.teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
    );
  }, [data?.teachers, searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!data?.students) return [];
    if (!searchQuery.trim()) return data.students;
    const q = searchQuery.toLowerCase().trim();
    return data.students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.leetcodeUsername && s.leetcodeUsername.toLowerCase().includes(q))
    );
  }, [data?.students, searchQuery]);

  const filteredClasses = useMemo(() => {
    if (!data?.classes) return [];
    if (!searchQuery.trim()) return data.classes;
    const q = searchQuery.toLowerCase().trim();
    return data.classes.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q) ||
        c.teacherEmail.toLowerCase().includes(q)
    );
  }, [data?.classes, searchQuery]);

  // Filtered and Sorted God Mode students
  const filteredGodModeStudents = useMemo(() => {
    let list = [...studentsWithStats];

    // Filter by handle presence
    if (godModeFilter === 'has_handle') {
      list = list.filter((s) => Boolean(s.leetcodeUsername));
    } else if (godModeFilter === 'no_handle') {
      list = list.filter((s) => !s.leetcodeUsername);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          (s.leetcodeUsername && s.leetcodeUsername.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      const aSolved = a.stats?.solvedProblem ?? -1;
      const bSolved = b.stats?.solvedProblem ?? -1;
      const aHard = a.stats?.hardSolved ?? -1;
      const bHard = b.stats?.hardSolved ?? -1;

      if (godModeSort === 'solved_desc') return bSolved - aSolved;
      if (godModeSort === 'solved_asc') return aSolved - bSolved;
      if (godModeSort === 'hard_desc') return bHard - aHard;
      if (godModeSort === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [studentsWithStats, godModeFilter, searchQuery, godModeSort]);

  // Aggregate stats for God Mode
  const godModeAggregates = useMemo(() => {
    let totalSolved = 0;
    let totalHard = 0;
    let studentsWithStatsCount = 0;
    let topCoder: { name: string; username: string; solved: number } | null = null;

    studentsWithStats.forEach((s) => {
      if (s.stats) {
        studentsWithStatsCount++;
        totalSolved += s.stats.solvedProblem;
        totalHard += s.stats.hardSolved;
        if (!topCoder || s.stats.solvedProblem > topCoder.solved) {
          topCoder = {
            name: s.name,
            username: s.leetcodeUsername || '',
            solved: s.stats.solvedProblem,
          };
        }
      }
    });

    const avgSolved = studentsWithStatsCount > 0 ? Math.round(totalSolved / studentsWithStatsCount) : 0;

    return {
      totalSolved,
      totalHard,
      studentsWithStatsCount,
      avgSolved,
      topCoder,
    };
  }, [studentsWithStats]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Super Admin Command Center
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              God Mode Active
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Full root authority over all instructors, learners, class cohorts, and real-time LeetCode performance telemetry across the entire institution.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => {
              fetchOverview(true);
              if (activeTab === 'god_mode') fetchGodModeStats();
            }}
            disabled={isRefreshing}
            className="flex-1 md:flex-initial px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 transition-all shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoadingGodMode ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={() => exportCSV('all')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Master CSV</span>
          </button>
        </div>
      </div>

      {/* Action Notice Messages */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Teachers */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Teachers</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : <AnimatedCounter value={data?.stats.totalTeachers || 0} />}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Faculty instructors</p>
          </div>
        </div>

        {/* Total Students */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : <AnimatedCounter value={data?.stats.totalStudents || 0} />}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Registered learners</p>
          </div>
        </div>

        {/* Total Classes */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Active Classes</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isLoading ? '...' : <AnimatedCounter value={data?.stats.totalClasses || 0} />}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Course cohorts</p>
          </div>
        </div>

        {/* God Mode LeetCode Solved aggregate */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700/80 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">LeetCode Solved</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
              {isLoadingGodMode ? '...' : <AnimatedCounter value={godModeAggregates.totalSolved} />}
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Across all students</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation Container */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          {/* Tab Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('teachers')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'teachers'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-blue-400" />
              <span>Teachers ({data?.teachers.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Students ({data?.students.length || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('classes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'classes'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>Classes ({data?.classes.length || 0})</span>
            </button>

            {/* Tab 4: God Mode Master LeetCode View */}
            <button
              type="button"
              onClick={() => setActiveTab('god_mode')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'god_mode'
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>God Mode: LeetCode Stats</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </button>
          </div>

          {/* Search bar & quick export */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'god_mode' ? 'student performance' : activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition-all"
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

            <button
              type="button"
              onClick={() => exportCSV(activeTab)}
              title={`Export ${activeTab} to CSV`}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 rounded-xl transition-all"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tab 1: TEACHERS TABLE */}
        {activeTab === 'teachers' && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Instructor</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-center">Classes Created</th>
                    <th className="py-3 px-4 text-center">Total Students</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        Loading teachers...
                      </td>
                    </tr>
                  ) : filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No teachers found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                            {t.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{t.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{t.email}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20">
                            {t.createdClassesCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                            {t.totalStudentsCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setItemToDelete({
                                type: 'user',
                                id: t.id,
                                name: `${t.name} (${t.email})`,
                              })
                            }
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete teacher account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: STUDENTS TABLE */}
        {activeTab === 'students' && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">LeetCode Handle</th>
                    <th className="py-3 px-4 text-center">Enrolled Classes</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        Loading students...
                      </td>
                    </tr>
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No students found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{s.name}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-zinc-400">{s.email}</td>
                        <td className="py-3.5 px-4">
                          {s.leetcodeUsername ? (
                            <a
                              href={`https://leetcode.com/u/${s.leetcodeUsername}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-amber-400 hover:text-amber-300 hover:underline"
                            >
                              <span>{s.leetcodeUsername}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-500 italic text-[11px]">Not linked</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
                            {s.enrolledClassesCount}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-400">
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setItemToDelete({
                                type: 'user',
                                id: s.id,
                                name: `${s.name} (${s.email})`,
                              })
                            }
                            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete student account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: CLASSES GRID */}
        {activeTab === 'classes' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                Loading classes...
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
                No classes found matching your query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-white text-base tracking-tight truncate">
                          {cls.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(cls.code)}
                          className="px-2 py-0.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-mono text-xs font-bold border border-orange-500/30 flex items-center gap-1 transition-all"
                          title="Click to copy 6-character class code"
                        >
                          <span>{cls.code}</span>
                          {copiedCode === cls.code ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {cls.description && (
                        <p className="text-xs text-zinc-400 mt-2 line-clamp-2">
                          {cls.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-2 border-t border-zinc-800/60 text-xs">
                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                          <span>Instructor:</span>
                        </span>
                        <span className="font-medium text-white truncate max-w-[150px]">
                          {cls.teacherName}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Enrolled:</span>
                        </span>
                        <span className="font-bold text-white">
                          {cls.studentCount} students
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClass(cls)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 border border-zinc-700/80 transition-all"
                        >
                          <Eye className="w-3.5 h-3.5 text-amber-400" />
                          <span>View Roster</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setItemToDelete({
                              type: 'class',
                              id: cls.id,
                              name: `${cls.name} (${cls.code})`,
                            })
                          }
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Delete class"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: GOD MODE - MASTER VIEW OF EVERY STUDENT'S LEETCODE STATS */}
        {activeTab === 'god_mode' && (
          <div className="space-y-4">
            {/* God Mode Performance Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-amber-950/20 border border-amber-800/30 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Institution Solved Total</div>
                  <div className="text-lg font-black text-white">
                    {godModeAggregates.totalSolved.toLocaleString()} Problems
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Average per Student</div>
                  <div className="text-lg font-black text-white">
                    ~{godModeAggregates.avgSolved} Solved
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Top Performer</div>
                  <div className="text-lg font-black text-white truncate max-w-[170px]">
                    {godModeAggregates.topCoder ? `${(godModeAggregates.topCoder as { name: string; solved: number }).name} (${(godModeAggregates.topCoder as { name: string; solved: number }).solved})` : 'None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-toolbar: Filters & Sorters */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-xs">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium text-[11px]">Filter:</span>
                <button
                  type="button"
                  onClick={() => setGodModeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    godModeFilter === 'all'
                      ? 'bg-zinc-800 text-white border border-zinc-700'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  All ({studentsWithStats.length})
                </button>
                <button
                  type="button"
                  onClick={() => setGodModeFilter('has_handle')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    godModeFilter === 'has_handle'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  With LeetCode Handle
                </button>
                <button
                  type="button"
                  onClick={() => setGodModeFilter('no_handle')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    godModeFilter === 'no_handle'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Unlinked Handle
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-zinc-400 font-medium text-[11px] flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  <span>Sort by:</span>
                </span>
                <select
                  value={godModeSort}
                  onChange={(e) => setGodModeSort(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="solved_desc">Total Solved (Highest First)</option>
                  <option value="solved_asc">Total Solved (Lowest First)</option>
                  <option value="hard_desc">Hard Solved (Highest First)</option>
                  <option value="name">Student Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* God Mode Table */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/90 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">LeetCode Handle</th>
                      <th className="py-3 px-4 text-center">Total Solved</th>
                      <th className="py-3 px-4">Difficulty Breakdown</th>
                      <th className="py-3 px-4 text-center">Global Ranking</th>
                      <th className="py-3 px-4 text-center">Enrolled Classes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                    {isLoadingGodMode ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500">
                          <RefreshCw className="w-5 h-5 animate-spin text-amber-400 mx-auto mb-2" />
                          <span>Querying LeetCode GraphQL API across student registry...</span>
                        </td>
                      </tr>
                    ) : filteredGodModeStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-zinc-500">
                          No student telemetry records found.
                        </td>
                      </tr>
                    ) : (
                      filteredGodModeStudents.map((s) => {
                        const isRefreshingThis = refreshingUsername === s.leetcodeUsername;
                        return (
                          <tr key={s.id} className="hover:bg-zinc-800/30 transition-colors">
                            {/* Student Name & Email */}
                            <td className="py-3.5 px-4 font-semibold text-white">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{s.name}</div>
                                  <div className="text-[11px] text-zinc-400 font-mono">{s.email}</div>
                                </div>
                              </div>
                            </td>

                            {/* LeetCode Handle */}
                            <td className="py-3.5 px-4">
                              {s.leetcodeUsername ? (
                                <a
                                  href={`https://leetcode.com/u/${s.leetcodeUsername}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 font-mono text-amber-400 hover:text-amber-300 hover:underline"
                                >
                                  <span>{s.leetcodeUsername}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-zinc-500 italic text-[11px]">Unlinked</span>
                              )}
                            </td>

                            {/* Total Solved */}
                            <td className="py-3.5 px-4 text-center">
                              {s.stats ? (
                                <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 font-extrabold text-xs border border-amber-500/30 shadow-sm shadow-amber-500/10">
                                  {s.stats.solvedProblem}
                                </span>
                              ) : s.leetcodeUsername ? (
                                <span className="text-zinc-500 text-[11px]">No data</span>
                              ) : (
                                <span className="text-zinc-600 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Difficulty Breakdown (Easy / Medium / Hard) */}
                            <td className="py-3.5 px-4">
                              {s.stats ? (
                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Easy Solved">
                                    E: {s.stats.easySolved}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20" title="Medium Solved">
                                    M: {s.stats.mediumSolved}
                                  </span>
                                  <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20" title="Hard Solved">
                                    H: {s.stats.hardSolved}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-600 text-[11px]">N/A</span>
                              )}
                            </td>

                            {/* Global Ranking */}
                            <td className="py-3.5 px-4 text-center font-mono text-[11px]">
                              {s.stats?.ranking ? (
                                <span className="text-zinc-300 font-semibold">
                                  #{s.stats.ranking.toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>

                            {/* Enrolled Classes */}
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700">
                                {s.enrolledClassesCount}
                              </span>
                            </td>

                            {/* Actions: Inspect & Refresh */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {s.stats && (
                                  <button
                                    type="button"
                                    onClick={() => setInspectStudent(s)}
                                    className="p-1.5 text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                    title="Inspect comprehensive analytics, radar & heatmap"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {s.leetcodeUsername && (
                                  <button
                                    type="button"
                                    onClick={() => handleRefreshStudentStats(s.leetcodeUsername!)}
                                    disabled={isRefreshingThis}
                                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                                    title="Force refresh LeetCode stats via direct GraphQL"
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
        )}
      </div>

      {/* Class Roster Inspection Modal */}
      {selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                  {selectedClass.code}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5">{selectedClass.name}</h3>
                <p className="text-xs text-zinc-400">
                  Instructor: {selectedClass.teacherName} ({selectedClass.teacherEmail})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-zinc-800/60 pr-1">
              {selectedClass.students.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4 text-center">No students currently enrolled in this class.</p>
              ) : (
                selectedClass.students.map((stu) => (
                  <div key={stu.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-white">{stu.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">{stu.email}</div>
                    </div>
                    <div>
                      {stu.leetcodeUsername ? (
                        <a
                          href={`https://leetcode.com/u/${stu.leetcodeUsername}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                        >
                          <span>{stu.leetcodeUsername}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-zinc-500 italic text-[11px]">No handle</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detailed Stats Inspection Modal */}
      {inspectStudent && inspectStudent.stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Student Profile
                  </span>
                  <h3 className="text-lg font-bold text-white">{inspectStudent.name}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                  <span>{inspectStudent.email}</span>
                  <span>•</span>
                  <span className="font-mono text-amber-400">@{inspectStudent.leetcodeUsername}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="text-zinc-500 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* StudentStatsCard Full View */}
            <StudentStatsCard
              stats={inspectStudent.stats}
              onRefresh={async () => {
                if (inspectStudent.leetcodeUsername) {
                  await handleRefreshStudentStats(inspectStudent.leetcodeUsername);
                }
              }}
              isRefreshing={refreshingUsername === inspectStudent.leetcodeUsername}
            />

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setInspectStudent(null)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                Delete {itemToDelete.type === 'user' ? 'User' : 'Class'}?
              </h3>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white">"{itemToDelete.name}"</strong>? This will cascade and remove all associated course enrollments and records.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 flex items-center gap-2"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
