import React, { useState, useEffect } from 'react';
import { User } from './types/index.ts';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { TeacherDashboard } from './components/TeacherDashboard.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { Terminal } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mashcode_auth_token') || localStorage.getItem('lc_auth_token'));
  const [isInitializing, setIsInitializing] = useState(true);

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
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mashcode_auth_token');
    localStorage.removeItem('lc_auth_token');
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      <Navbar
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!user || !token ? (
          <AuthModal onSuccess={handleLoginSuccess} />
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
