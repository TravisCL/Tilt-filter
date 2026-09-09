import React from 'react';
import {
  Terminal,
  Activity,
  CreditCard,
  LayoutGrid,
  Shield,
  User,
  Gift,
  RefreshCw,
} from 'lucide-react';
import { AppState, TIERS_CONFIG } from '../types';

interface SidebarProps {
  currentView: AppState['currentView'];
  onSelectView: (view: AppState['currentView']) => void;
  syncVersion?: string;
  onCleanSlate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  syncVersion = '9.68',
  onCleanSlate,
}) => {
  const isSession = currentView === 'session' || currentView === 'checkin';
  const isBoard = currentView === 'board';
  const isAccounts = currentView === 'accounts';
  const isTracker = currentView === 'tracker' || currentView === 'tally';
  const isProfile = currentView === 'profile';
  const isInvites = currentView === 'invites';

  return (
    <aside className="w-56 shrink-0 bg-[#081216] border-r border-[#15242b] flex flex-col justify-between p-3.5 select-none min-h-screen">
      <div className="space-y-5">
        {/* Rules Student Badge Header - Matching Video 00:04 & 01:35 */}
        <div className="pt-2 px-1">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0c181f] border border-[#172d38] text-slate-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-white font-black text-xs">Rules student</span>
          </div>
        </div>

        {/* Navigation Links - Matching Video Order */}
        <nav className="space-y-1.5">
          {/* Session */}
          <button
            onClick={() => onSelectView('session')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isSession
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <Terminal
              className={`w-4 h-4 ${isSession ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Session</span>
          </button>

          {/* Board */}
          <button
            onClick={() => onSelectView('board')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isBoard
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <LayoutGrid
              className={`w-4 h-4 ${isBoard ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Board</span>
          </button>

          {/* Accounts */}
          <button
            onClick={() => onSelectView('accounts')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isAccounts
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <CreditCard
              className={`w-4 h-4 ${isAccounts ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Accounts</span>
          </button>

          {/* Tracker */}
          <button
            onClick={() => onSelectView('tracker')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isTracker
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <Activity
              className={`w-4 h-4 ${isTracker ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Tracker</span>
          </button>

          {/* Profile */}
          <button
            onClick={() => onSelectView('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isProfile
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <User
              className={`w-4 h-4 ${isProfile ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Profile</span>
          </button>

          {/* Invites */}
          <button
            onClick={() => onSelectView('invites')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              isInvites
                ? 'bg-[#122830] text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0e1b21]'
            }`}
          >
            <Gift
              className={`w-4 h-4 ${isInvites ? 'text-emerald-400' : 'text-slate-400'}`}
            />
            <span>Invites</span>
          </button>
        </nav>
      </div>

      {/* Sync 9.68 Button at bottom (Matching Video exactly!) */}
      <div className="pt-4 border-t border-[#15242b] space-y-2">
        <button
          onClick={() => {
            // Soft sync feedback
            const btn = document.getElementById('sync-btn-txt');
            if (btn) btn.innerText = 'Synced';
            setTimeout(() => {
              if (btn) btn.innerText = `Sync ${syncVersion}`;
            }, 1200);
          }}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#0e1c22] hover:bg-[#142831] text-slate-300 hover:text-white text-xs font-bold border border-[#162731] transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          <span id="sync-btn-txt">Sync {syncVersion}</span>
        </button>

        {onCleanSlate && (
          <button
            onClick={() => {
              if (window.confirm('Reset app data to clean slate?')) {
                onCleanSlate();
              }
            }}
            className="w-full text-center text-[10px] text-slate-600 hover:text-slate-400 py-1 cursor-pointer transition-colors"
          >
            Clean Slate Reset
          </button>
        )}
      </div>
    </aside>
  );
};
