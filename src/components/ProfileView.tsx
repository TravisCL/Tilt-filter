import React, { useState } from 'react';
import { User, Shield, RotateCcw, AlertTriangle, CheckCircle2, RefreshCw, Webhook } from 'lucide-react';
import { AppState } from '../types';
import { getNoTiltStats } from '../utils/tierProgression';

interface ProfileViewProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onCleanSlate: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ state, onUpdateState, onCleanSlate }) => {
  const stats = getNoTiltStats(state);
  const { currentTier, tierInfo, noTiltDays } = stats;
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [webhookUrlDraft, setWebhookUrlDraft] = useState(state.discordWebhookUrl || '');

  const handleExecuteReset = () => {
    onCleanSlate();
    setShowConfirmModal(false);
    setToastMessage('All trading books, history, and records refreshed to clean slate.');
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const activeBooksCount = state.accounts.filter((a) => a.status !== 'blown').length;
  const liveBooksCount = state.accounts.filter(
    (a) => a.accountType === 'live' && a.status !== 'blown'
  ).length;

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-3xl mx-auto space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl flex items-center justify-between gap-3 text-emerald-200 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-400 hover:text-white text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-400" />
          <span>Trader Profile</span>
        </h1>
        <p className="text-xs text-slate-400">
          Account identity, discipline credentials, and system management.
        </p>
      </div>

      <div className="p-6 bg-[#0b161b] border border-[#162b34] rounded-2xl space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-emerald-500/50">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
              alt="Travis"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Travis</h2>
            <p className="text-xs text-slate-400">Trading with Travis &bull; Desk Operator</p>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 mt-1 rounded-md bg-[#11252e] border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
              <Shield className="w-3 h-3" />
              <span>{tierInfo.badgeLabel} ({noTiltDays} {noTiltDays === 1 ? 'clean day' : 'clean days'})</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-[#081216] border border-[#142831] rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Primary Market</div>
            <div className="text-xs font-black text-white mt-0.5">MNQ / NQ Futures</div>
          </div>
          <div className="p-3 bg-[#081216] border border-[#142831] rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Active Live Books</div>
            <div className="text-xs font-black text-emerald-400 mt-0.5">{liveBooksCount} Live</div>
          </div>
          <div className="p-3 bg-[#081216] border border-[#142831] rounded-xl">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Books</div>
            <div className="text-xs font-black text-white mt-0.5">{activeBooksCount} Accounts</div>
          </div>
        </div>
      </div>

      {/* SYSTEM & DATA MANAGEMENT / REFRESH EVERYTHING SECTION */}
      <div className="p-6 bg-[#0c1318] border border-[#1a2e38] rounded-2xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-rose-400" />
            <span>System & Data Management</span>
          </h3>
          <p className="text-xs text-slate-400">
            Reset or refresh your workstation data back to a completely clean slate.
          </p>
        </div>

        <div className="p-4 bg-[#140c10] border border-rose-950/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <div className="text-xs font-bold text-rose-300">Refresh Everything (Clean Slate)</div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Wipe all accounts, logged trades, daily check-ins, and tilt tab records back to Day 1. Use this when starting fresh with new funding rules.
            </p>
          </div>

          <button
            onClick={() => setShowConfirmModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Refresh Everything</span>
          </button>
        </div>
      </div>

      {/* DISCORD WEBHOOK SETTINGS */}
      <div className="p-6 bg-[#0c1318] border border-[#1a2e38] rounded-2xl space-y-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Webhook className="w-4 h-4 text-indigo-400" />
            <span>Discord Webhook</span>
          </h3>
          <p className="text-xs text-slate-400">
            Post each trade to a Discord channel automatically after it saves. If the post fails, the trade is unaffected — it's already saved.
          </p>
        </div>

        <div className="p-4 bg-[#081216] border border-[#142831] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Enable Discord posting</span>
            <button
              type="button"
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  discordWebhookEnabled: !prev.discordWebhookEnabled,
                }))
              }
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
                state.discordWebhookEnabled ? 'bg-indigo-500' : 'bg-[#1e3646]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  state.discordWebhookEnabled ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Webhook URL
            </label>
            <input
              type="text"
              value={webhookUrlDraft}
              onChange={(e) => setWebhookUrlDraft(e.target.value)}
              onBlur={() =>
                onUpdateState((prev) => ({ ...prev, discordWebhookUrl: webhookUrlDraft.trim() }))
              }
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 rounded-lg bg-[#0b161b] border border-[#1e3a4a] text-xs font-mono text-slate-200 placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* REFRESH EVERYTHING CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c161b] border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-5 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white tracking-tight">
                Refresh Everything back to Day 1?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                This will permanently clear all recorded trades, evaluation and live accounts, tilt tab scores, and reflections.
              </p>
              <p className="text-[11px] text-rose-400 font-semibold">
                This action is permanent and cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-[#12242c] hover:bg-[#18303a] text-slate-300 font-bold text-xs rounded-xl border border-[#1d3744] transition-all cursor-pointer"
              >
                Cancel / Keep Data
              </button>

              <button
                onClick={handleExecuteReset}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yes, Refresh Everything</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
