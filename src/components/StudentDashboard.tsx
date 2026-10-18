import React, { useState, useEffect } from 'react';
import { User, ClassItem, LeetCodeStats } from '../types/index.ts';
import { StudentStatsCard } from './StudentStatsCard.tsx';
import { validateLeetcodeUsername } from '../utils/classroom-logic.ts';
import {
  BookOpen,
  Plus,
  UserCheck,
  Edit2,
  Check,
  AlertCircle,
  RefreshCw,
  Layers,
  GraduationCap,
  Sparkles,
  BarChart2,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';

interface StudentDashboardProps {
  user: User;
  token: string;
  onUpdateUser: (updatedUser: User) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, token, onUpdateUser }) => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [stats, setStats] = useState<LeetCodeStats | null>(null);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tab navigation: 'classes' | 'stats' | 'profile'
  const [activeTab, setActiveTab] = useState<'classes' | 'stats' | 'profile'>('classes');

  // Join Class Modal State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // LeetCode Username Edit State
  const [isEditingUsername, setIsEditingUsername] = useState(!user.leetcodeUsername);
  const [newUsername, setNewUsername] = useState(user.leetcodeUsername || '');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Fetch enrolled classes
  const fetchClasses = async () => {
    setIsLoadingClasses(true);
    try {
      const res = await fetch('/api/classes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setClasses(data.classes || []);
      }
    } catch {
      // Quiet error handling
    } finally {
      setIsLoadingClasses(false);
    }
  };

  // Fetch student's own stats
  const fetchMyStats = async (username: string) => {
    if (!username) {
      setStats(null);
      return;
    }
    setIsLoadingStats(true);
    setError(null);
    try {
      const res = await fetch(`/api/leetcode-stats?username=${encodeURIComponent(username)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to fetch LeetCode data right now');
      setStats(data.stats || data);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch LeetCode data right now');
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    if (user.leetcodeUsername) {
      fetchMyStats(user.leetcodeUsername);
    }
  }, [user.leetcodeUsername]);

  // Handle Save LeetCode username
  const handleSaveUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim();
    if (!validateLeetcodeUsername(clean)) {
      setUsernameError('Invalid username. Please use 2-35 alphanumeric characters or dashes/underscores.');
      return;
    }

    setIsSavingUsername(true);
    setUsernameError(null);
    try {
      const res = await fetch('/api/auth/update-leetcode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leetcodeUsername: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update username');

      onUpdateUser(data.user);
      setIsEditingUsername(false);
      fetchMyStats(clean);
    } catch (err: any) {
      setUsernameError(err.message);
    } finally {
      setIsSavingUsername(false);
    }
  };

  // Handle Join Class
  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.leetcodeUsername) {
      setJoinError('Please link your LeetCode username first before joining a class.');
      return;
    }

    const cleanCode = joinCode.trim().toUpperCase();
    if (cleanCode.length !== 6) {
      setJoinError('Class codes are exactly 6 characters (e.g., ALGO24).');
      return;
    }

    setIsJoining(true);
    setJoinError(null);
    setJoinSuccess(null);
    try {
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: cleanCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join class');

      setJoinSuccess(data.message || 'Successfully joined classroom!');
      fetchClasses();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinCode('');
        setJoinSuccess(null);
      }, 1500);
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  // Refresh Stats
  const handleRefreshStats = async (username: string) => {
    setIsRefreshingStats(true);
    try {
      const res = await fetch(`/api/leetcode-stats?username=${encodeURIComponent(username)}&refresh=true`);
      const data = await res.json();
      if (res.ok && (data.stats || data.solvedProblem !== undefined)) {
        setStats(data.stats || data);
      }
    } catch {
      // Handled quietly
    } finally {
      setIsRefreshingStats(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Student Workspace
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active Student
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Join instructor classrooms with your 6-character code and monitor your live problem-solving performance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setJoinError(null);
            setJoinSuccess(null);
            setShowJoinModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Join Classroom</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 text-xs font-bold uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setActiveTab('classes')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>My Classes ({classes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'stats'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-orange-400" />
          <span>LeetCode Stats</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <UserIcon className="w-3.5 h-3.5 text-blue-400" />
          <span>Profile & Handle</span>
        </button>
      </div>

      {/* Profile & LeetCode Handle Card (Always visible or in Profile tab) */}
      <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">Linked LeetCode Account</span>
              {user.leetcodeUsername ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Synchronized
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Handle Required
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Your instructor monitors your problem counts, contest rankings, and activity through this handle.
            </p>
          </div>

          {!isEditingUsername && user.leetcodeUsername && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-orange-400 bg-orange-400/10 px-3 py-1.5 rounded-xl border border-orange-400/20">
                {user.leetcodeUsername}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNewUsername(user.leetcodeUsername || '');
                  setIsEditingUsername(true);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center gap-1.5 transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Change Handle</span>
              </button>
            </div>
          )}
        </div>

        {/* Username form */}
        {(isEditingUsername || !user.leetcodeUsername) && (
          <form onSubmit={handleSaveUsername} className="pt-2 border-t border-zinc-800/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter your LeetCode username (e.g. neal_wu or tourist)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingUsername}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50 shrink-0"
              >
                {isSavingUsername ? 'Saving...' : 'Save LeetCode Handle'}
              </button>
              {user.leetcodeUsername && (
                <button
                  type="button"
                  onClick={() => setIsEditingUsername(false)}
                  className="px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                >
                  Cancel
                </button>
              )}
            </div>
            {usernameError && (
              <p className="text-xs text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {usernameError}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Tab 1: Joined Classes Section */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-400" />
              My Enrolled Classrooms
            </h2>
            <button
              type="button"
              onClick={() => {
                setJoinError(null);
                setJoinSuccess(null);
                setShowJoinModal(true);
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Join Another Class
            </button>
          </div>

          {isLoadingClasses ? (
            <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
              <p className="text-xs text-zinc-400">Loading enrolled classrooms...</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center bg-zinc-900/80 border border-dashed border-zinc-800 rounded-3xl">
              <BookOpen className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-zinc-200">No classes joined yet</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto mb-4">
                Ask your instructor for their 6-character class code to join their classroom dashboard!
              </p>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enter Class Code</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-3xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all space-y-3 flex flex-col justify-between shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Instructor: {c.teacherName || 'Instructor'}</span>
                      <span className="font-mono px-2 py-0.5 rounded-lg bg-zinc-950 text-orange-400 font-bold border border-zinc-800">
                        {c.code}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-2">{c.name}</h3>
                    {c.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{c.description}</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                    <span>{c.studentCount ?? 1} students enrolled</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Enrolled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: LeetCode Live Performance Section */}
      {(activeTab === 'stats' || activeTab === 'classes') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-400" />
              Live LeetCode Performance Analytics
            </h2>
            {user.leetcodeUsername && (
              <span className="text-xs text-zinc-400 font-mono">
                Synced with LeetCode
              </span>
            )}
          </div>

          {!user.leetcodeUsername ? (
            <div className="p-8 text-center bg-zinc-900/80 border border-zinc-800 rounded-3xl">
              <UserCheck className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-zinc-200">No LeetCode Handle Linked</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Enter your LeetCode username above to automatically generate your problem breakdown, contest ratings, recent submissions, and calendar heatmap.
              </p>
            </div>
          ) : (
            <StudentStatsCard
              stats={stats}
              isLoading={isLoadingStats}
              onRefresh={handleRefreshStats}
              isRefreshing={isRefreshingStats}
            />
          )}
        </div>
      )}

      {/* Tab 3: Profile Details */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-zinc-900/90 border border-zinc-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-blue-400" />
            Mashcode Student Profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500">Student Name</span>
              <div className="text-sm font-bold text-white">{user.name}</div>
            </div>
            <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500">Account Email</span>
              <div className="text-sm font-mono text-white">{user.email}</div>
            </div>
            <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500">LeetCode Username</span>
              <div className="text-sm font-mono text-orange-400 font-bold">{user.leetcodeUsername || 'Not set'}</div>
            </div>
            <div className="p-4 bg-zinc-950/70 rounded-2xl border border-zinc-800 space-y-1">
              <span className="text-zinc-500">Active Enrollments</span>
              <div className="text-sm font-bold text-white">{classes.length} Classrooms</div>
            </div>
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Join a Classroom
              </h3>
              <button
                type="button"
                onClick={() => setShowJoinModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            {joinError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  6-Character Class Code <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ALGO24"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-orange-400 font-mono font-bold tracking-widest text-center text-lg placeholder-zinc-600 focus:outline-none focus:border-emerald-500 uppercase"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <p>
                  Your instructor will be able to monitor your problems solved count, contest rating, and submissions.
                </p>
                {!user.leetcodeUsername && (
                  <p className="text-orange-400 font-bold">
                    ⚠️ You must save a LeetCode username to your profile before you can join.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining || !joinCode}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isJoining ? 'Joining...' : 'Join Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
