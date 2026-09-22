import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Activity,
  CreditCard,
  LayoutGrid,
  Shield,
  User,
  Gift,
  RefreshCw,
  Maximize2,
  Minimize2,
  Lock,
  Flame,
  Gem,
  Award,
  Crown,
  Sparkles,
  AlertCircle,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';
import { AppState, TierLevel } from '../types';
import { getNoTiltStats } from '../utils/tierProgression';

interface SidebarProps {
  currentView: AppState['currentView'];
  onSelectView: (view: AppState['currentView']) => void;
  syncVersion?: string;
  onCleanSlate?: () => void;
  isCheckInCompletedToday?: boolean;
  state?: AppState;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  syncVersion = '9.68',
  onCleanSlate,
  isCheckInCompletedToday,
  state,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stats = state ? getNoTiltStats(state) : null;
  const currentTier = stats?.currentTier || 'silver';
  const tierInfo = stats?.tierInfo;
  const noTiltDays = stats?.noTiltDays ?? 0;

  const getTierIcon = (level: TierLevel) => {
    switch (level) {
      case 'diamond':
        return <Gem className="w-3.5 h-3.5 text-cyan-400" />;
      case 'platinum':
        return <Award className="w-3.5 h-3.5 text-teal-400" />;
      case 'gold':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'silver':
        return <Shield className="w-3.5 h-3.5 text-sky-400" />;
      case 'bronze':
        return <Sparkles className="w-3.5 h-3.5 text-orange-400" />;
      case 'copper':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Shield className="w-3.5 h-3.5 text-sky-400" />;
    }
  };

  useEffect(() => {
    const checkFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', checkFs);
    return () => document.removeEventListener('fullscreenchange', checkFs);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isSession = currentView === 'session' || currentView === 'checkin';
  const isBoard = currentView === 'board';
  const isAccounts = currentView === 'accounts';
  const isTracker = currentView === 'tracker' || currentView === 'tally';
  const isProfile = currentView === 'profile';
  const isInvites = currentView === 'invites';

  return (
    <aside className="w-56 shrink-0 bg-[var(--c-081522)] border-r border-[var(--c-132c3f)] flex flex-col justify-between p-3.5 select-none min-h-screen">
      <div className="space-y-5">
        {/* Status Symbol Badge Header */}
        <div className="pt-2 px-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[var(--c-0c1e30)] border border-[var(--c-173752)] text-slate-300 text-xs font-bold shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              {getTierIcon(currentTier)}
              <span className="text-white font-black text-xs">{tierInfo?.title || 'Rules student'}</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[var(--c-05111c)] border border-[var(--c-122e44)] text-[10px] font-mono font-bold text-slate-300">
            <span className="flex items-center gap-1 text-sky-400">
              <Flame className="w-3 h-3" />
              <span>{noTiltDays} No Tilt Days</span>
            </span>
            <span className="text-[9px] uppercase tracking-wider text-slate-400">{currentTier}</span>
          </div>
        </div>

        {/* Navigation Links - Matching Video Order */}
        <nav className="space-y-1.5">
          {/* Session */}
          <button
            onClick={() => onSelectView('session')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSession
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Terminal
                className={`w-4 h-4 ${isSession ? 'text-sky-400' : 'text-slate-400'}`}
              />
              <span>Session</span>
            </div>
            {isCheckInCompletedToday === false && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/40 flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                <span>Locked</span>
              </span>
            )}
          </button>

          {/* Board */}
          <button
            onClick={() => onSelectView('board')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isBoard
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <LayoutGrid
              className={`w-4 h-4 ${isBoard ? 'text-sky-400' : 'text-slate-400'}`}
            />
            <span>Board</span>
          </button>

          {/* Accounts */}
          <button
            onClick={() => onSelectView('accounts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isAccounts
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <CreditCard
              className={`w-4 h-4 ${isAccounts ? 'text-sky-400' : 'text-slate-400'}`}
            />
            <span>Accounts</span>
          </button>

          {/* Mood Tracker */}
          <button
            onClick={() => onSelectView('tracker')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTracker
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <Activity
              className={`w-4 h-4 ${isTracker ? 'text-sky-400' : 'text-slate-400'}`}
            />
            <span>Mood Tracker</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => onSelectView('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isProfile
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <User
              className={`w-4 h-4 ${isProfile ? 'text-sky-400' : 'text-slate-400'}`}
            />
            <span>Profile</span>
          </button>

          {/* Invites */}
          <button
            onClick={() => onSelectView('invites')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isInvites
                ? 'bg-[var(--c-102d45)] text-sky-200 border border-sky-400/50 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--c-0c1f30)]'
            }`}
          >
            <Gift
              className={`w-4 h-4 ${isInvites ? 'text-sky-400' : 'text-slate-400'}`}
            />
            <span>Invites</span>
          </button>
        </nav>
      </div>

      {/* Footer Controls */}
      <div className="pt-4 border-t border-[var(--c-132c3f)] space-y-2">
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg bg-[var(--c-0c1f30)] hover:bg-[var(--c-122e47)] text-slate-300 hover:text-white border border-[var(--c-183a54)] text-xs font-bold transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg bg-[var(--c-0c1f30)] hover:bg-[var(--c-122e47)] text-slate-300 hover:text-white border border-[var(--c-183a54)] text-xs font-bold transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-sky-400" />}
            <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>

        <button
          onClick={() => {
            // Soft sync feedback
            const btn = document.getElementById('sync-btn-txt');
            if (btn) btn.innerText = 'Synced';
            setTimeout(() => {
              if (btn) btn.innerText = `Sync ${syncVersion}`;
            }, 1200);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--c-0c1f30)] hover:bg-[var(--c-122e47)] text-slate-300 hover:text-white text-xs font-bold border border-[var(--c-183a54)] transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span id="sync-btn-txt">Sync {syncVersion}</span>
        </button>

        {onCleanSlate && (
          <button
            onClick={() => {
              if (window.confirm('Refresh Everything (Clean Slate)? This will reset your accounts, trades, scoreboard, and tilt streaks back to Day 1.')) {
                onCleanSlate();
              }
            }}
            className="w-full text-center text-[10px] text-slate-500 hover:text-rose-300 py-1 cursor-pointer transition-colors flex items-center justify-center gap-1"
            title="Wipe all accounts, trades, and streaks back to Day 1"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Refresh Everything (Clean Slate)</span>
          </button>
        )}
      </div>
    </aside>
  );
};
