import React from 'react';
import { User } from '../types/index.ts';
import { LogOut, GraduationCap, UserCheck, Terminal } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand: Mashcode */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 via-amber-500 to-blue-600 p-[1.5px] shadow-lg shadow-orange-500/15">
            <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-orange-400" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-white flex items-center">
              Mash<span className="text-orange-500">code</span>
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Classroom Pro
            </span>
          </div>
        </div>

        {/* Right Section: User & Logout */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* User Profile & Role */}
            <div className="flex items-center gap-3 pl-2">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-zinc-100 tracking-tight">{user.name}</div>
                <div className="text-[11px] text-zinc-400 font-mono truncate max-w-[170px]">{user.email}</div>
              </div>

              <div
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                  user.role === 'teacher'
                    ? 'bg-blue-950/60 text-blue-300 border-blue-800/50'
                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                }`}
              >
                {user.role === 'teacher' ? (
                  <>
                    <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
                    <span>Instructor</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Student</span>
                  </>
                )}
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                title="Sign out of Mashcode"
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded-xl transition-all"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
};
