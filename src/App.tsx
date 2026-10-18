import React, { useState, useEffect } from 'react';
import { User } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { Terminal, Shield, GraduationCap, UserCheck, ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mashcode_auth_token') || localStorage.getItem('lc_auth_token'));
  const [isInitializing, setIsInitializing] = useState(true);
  const [adminView, setAdminView] = useState<'admin' | 'teacher_preview' | 'student_preview'>('admin');
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  // Sync route on popstate and hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
        setAdminView('admin');
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Load user profile on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('mashcode_auth_token') || localStorage.getItem('lc_auth_token');
      if (!storedToken) {
        setIsInitializing(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        const data = await res.json();
        if (res.ok && data.user) {
          setUser(data.user);
          setToken(storedToken);
          localStorage.setItem('mashcode_auth_token', storedToken);
        } else {
          localStorage.removeItem('mashcode_auth_token');
          localStorage.removeItem('lc_auth_token');
          setToken(null);
          setUser(null);
        }
      } catch {
        // Handled quietly
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (authenticatedUser: User, authToken: string) => {
    setUser(authenticatedUser);
    setToken(authToken);
    localStorage.setItem('mashcode_auth_token', authToken);

    const isUserAdmin =
      (authenticatedUser.role || '').toUpperCase() === 'ADMIN' ||
      authenticatedUser.email.toLowerCase().trim() === 'manishnagare258@gmail.com';

    if (isUserAdmin) {
      setAdminView('admin');
      window.history.pushState(null, '', '/admin');
      setCurrentPath('/admin');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mashcode_auth_token');
    localStorage.removeItem('lc_auth_token');
    window.history.pushState(null, '', '/');
    setCurrentPath('/');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 via-amber-500 to-blue-600 p-[1.5px] shadow-xl shadow-orange-500/20 mb-3 animate-pulse">
          <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
            <Terminal className="w-5 h-5 text-orange-400" />
          </div>
        </div>
        <p className="text-xs font-semibold text-zinc-300">Loading Mashcode...</p>
      </div>
    );
  }

  const isAdmin =
    user &&
    ((user.role || '').toUpperCase() === 'ADMIN' ||
      user.email.toLowerCase().trim() === 'manishnagare258@gmail.com');

  const isTryingToAccessAdminRoute =
    currentPath.startsWith('/admin') || window.location.hash === '#admin';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeView={isAdmin && adminView === 'admin' ? 'admin' : 'dashboard'}
        onNavigateView={(view) => {
          if (view === 'admin') {
            setAdminView('admin');
            window.history.pushState(null, '', '/admin');
            setCurrentPath('/admin');
          } else {
            setAdminView('teacher_preview');
            window.history.pushState(null, '', '/');
            setCurrentPath('/');
          }
        }}
      />

      {/* Admin Mode Switcher Bar (Only visible to authenticated Super Admin) */}
      {isAdmin && (
        <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-amber-300">Super Admin Mode Active:</span>
              <span className="text-zinc-400 font-mono text-[11px]">{user.email}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-950/80 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setAdminView('admin');
                  window.history.pushState(null, '', '/admin');
                  setCurrentPath('/admin');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  adminView === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin Panel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminView('teacher_preview');
                  window.history.pushState(null, '', '/');
                  setCurrentPath('/');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  adminView === 'teacher_preview'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Teacher View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAdminView('student_preview');
                  window.history.pushState(null, '', '/');
                  setCurrentPath('/');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  adminView === 'student_preview'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Student View</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user || !token ? (
          <AuthModal onSuccess={handleLoginSuccess} />
        ) : isTryingToAccessAdminRoute && !isAdmin ? (
          // 403 Forbidden Screen for unauthorized users trying to access /admin
          <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-zinc-900/90 border border-rose-500/30 text-center shadow-2xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-rose-400 uppercase bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                HTTP 403 Forbidden
              </span>
              <h2 className="text-2xl font-black text-white mt-3 tracking-tight">
                Super Admin Access Required
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto">
              The <span className="font-mono text-zinc-200 font-semibold">/admin</span> dashboard is strictly restricted to designated administrators (<span className="text-amber-400 font-mono">manishnagare258@gmail.com</span>). Your account is authenticated as <span className="text-white font-semibold">{user.email}</span> with role <span className="text-orange-400 font-bold uppercase">{user.role}</span>.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  window.history.pushState(null, '', '/');
                  setCurrentPath('/');
                }}
                className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 transition-all inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Classroom Dashboard</span>
              </button>
            </div>
          </div>
        ) : isAdmin ? (
          adminView === 'admin' ? (
            <AdminDashboard user={user} token={token} />
          ) : adminView === 'teacher_preview' ? (
            <TeacherDashboard user={user} token={token} />
          ) : (
            <StudentDashboard user={user} token={token} onUpdateUser={setUser} />
          )
        ) : user.role === 'teacher' ? (
          <TeacherDashboard user={user} token={token} />
        ) : (
          <StudentDashboard user={user} token={token} onUpdateUser={setUser} />
        )}
      </main>

      <footer className="border-t border-zinc-900/80 py-6 text-center text-xs text-zinc-500 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-zinc-300">Mash<span className="text-orange-500">code</span></span>
            <span className="text-zinc-600">•</span>
            <span>Production LeetCode Classroom Analytics</span>
          </div>
          <span className="font-mono text-zinc-600 text-[11px]">Next.js / Vite • Express • PostgreSQL & Prisma ready</span>
        </div>
      </footer>
    </div>
  );
}
