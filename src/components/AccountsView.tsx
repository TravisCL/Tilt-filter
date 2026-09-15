import React, { useState, useRef } from 'react';
import {
  CreditCard,
  Plus,
  ShieldCheck,
  Check,
  Trash2,
  Flame,
  RotateCcw,
  CheckCircle2,
  Zap,
  BookOpen,
  Image as ImageIcon,
  FileText,
  X,
  Upload,
  Maximize2,
  TrendingUp,
  TrendingDown,
  Percent,
  Scale,
  Target,
  Edit3,
  Info,
  AlertTriangle,
  Terminal,
  ChevronDown,
} from 'lucide-react';
import { AppState, TradingAccount, AccountDrawdownType, AccountCategory, CompletedTrade } from '../types';
import { broadcastTradeUpdated } from '../utils/syncService';

interface AccountsViewProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

// Helper to filter trades that belong strictly and exclusively to a specific account
export function getAccountTrades(
  account: TradingAccount,
  allTrades: CompletedTrade[],
  activeAccountId?: string,
  totalAccounts?: number
): CompletedTrade[] {
  if (!Array.isArray(allTrades) || allTrades.length === 0) return [];
  if (!account) return allTrades;

  return allTrades.filter((t) => {
    if (!t) return false;
    // 1. Exact ID match
    if (t.accountId && account.id && t.accountId === account.id) {
      return true;
    }
    // 2. Case-insensitive Account Name match
    if (
      t.accountName &&
      account.name &&
      t.accountName.trim().toLowerCase() === account.name.trim().toLowerCase()
    ) {
      return true;
    }
    // 3. Fallback only if there is solely one account created in the system
    if (!totalAccounts || totalAccounts <= 1) {
      return true;
    }
    // 4. If trade has no accountId or accountName, associate with active account
    if (!t.accountId && !t.accountName && (account.id === activeAccountId || !activeAccountId)) {
      return true;
    }
    return false;
  });
}

// Helper to calculate Win Rate, RR Ratio, and Profit Factor for an account
export function calculateAccountMetrics(trades: CompletedTrade[]) {
  const total = trades.length;
  const wins = trades.filter((t) => (t.pnl || 0) > 0);
  const losses = trades.filter((t) => (t.pnl || 0) < 0);
  const winCount = wins.length;
  const lossCount = losses.length;

  // 1. Win Rate
  const winRate = total > 0 ? (winCount / total) * 100 : 0;
  const winRateStr = total > 0 ? `${winRate.toFixed(1)}%` : '--%';

  // 2. RR Ratio (Risk-to-Reward Ratio)
  // Calculated as realized Average Reward / Average Risk (Avg Win / Avg Loss)
  const grossProfit = wins.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + (t.pnl || 0), 0));

  const avgWin = winCount > 0 ? grossProfit / winCount : 0;
  const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;

  let rrRatioStr = '--';
  if (avgLoss > 0 && avgWin > 0) {
    rrRatioStr = `1 : ${(avgWin / avgLoss).toFixed(2)}`;
  } else if (avgWin > 0 && avgLoss === 0) {
    // All wins
    rrRatioStr = '1 : ∞';
  } else if (lossCount > 0 && winCount === 0) {
    rrRatioStr = '1 : 0.00';
  }

  // Also calculate average R-Multiple for trades with rMultiple
  const validRMultiples = trades
    .map((t) => (typeof t.rMultiple === 'number' ? t.rMultiple : null))
    .filter((r): r is number => r !== null);
  const avgRMultiple =
    validRMultiples.length > 0
      ? validRMultiples.reduce((acc, r) => acc + r, 0) / validRMultiples.length
      : null;

  // 3. Profit Factor (Gross Profit / Gross Loss)
  let profitFactorStr = '--';
  if (total === 0) {
    profitFactorStr = '--';
  } else if (grossLoss === 0 && grossProfit > 0) {
    profitFactorStr = '∞ (Max)';
  } else if (grossLoss === 0 && grossProfit === 0) {
    profitFactorStr = '0.00';
  } else {
    profitFactorStr = (grossProfit / grossLoss).toFixed(2);
  }

  const netPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return {
    total,
    winCount,
    lossCount,
    winRate,
    winRateStr,
    grossProfit,
    grossLoss,
    avgWin,
    avgLoss,
    rrRatioStr,
    avgRMultiple,
    profitFactorStr,
    netPnl,
  };
}

export const AccountsView: React.FC<AccountsViewProps> = ({ state, onUpdateState }) => {
  // Which eval book is currently shown (only one card at a time, picked via dropdown)
  const [selectedEvalId, setSelectedEvalId] = useState<string>('');

  // Deletion modal state
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null);

  // Journal modal state
  const [journalAccount, setJournalAccount] = useState<TradingAccount | null>(null);
  const [journalFilter, setJournalFilter] = useState<
    'all' | 'winner' | 'loser' | 'managed_well' | 'exited_emotionally' | 'unspecified'
  >('all');
  const [editingMemoTradeId, setEditingMemoTradeId] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Inline Risk Editing State
  const [editingRiskTradeId, setEditingRiskTradeId] = useState<string | null>(null);
  const [editRiskDraft, setEditRiskDraft] = useState('');

  // File input ref for screenshot attachments
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetTradeId, setUploadTargetTradeId] = useState<string | null>(null);

  // Filter accounts into categories
  const liveAccounts = state.accounts.filter(
    (acc) => acc.accountType === 'live' && acc.status !== 'blown'
  );
  const evalAccounts = state.accounts.filter(
    (acc) => acc.accountType !== 'live' && acc.status !== 'blown'
  );
  const blownAccounts = state.accounts.filter((acc) => acc.status === 'blown');

  const handleSetActive = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      activeAccountId: id,
    }));
  };

  // Move an account directly to the blown section
  const handleMarkAccountBlown = (id: string) => {
    const todayStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    onUpdateState((prev) => {
      const updatedAccounts = prev.accounts.map((acc) => {
        if (acc.id === id) {
          return {
            ...acc,
            status: 'blown' as const,
            blownDate: todayStr,
          };
        }
        return acc;
      });

      let nextActive = prev.activeAccountId;
      if (prev.activeAccountId === id) {
        const firstActive = updatedAccounts.find((a) => a.status !== 'blown') || updatedAccounts[0];
        nextActive = firstActive ? firstActive.id : '';
      }

      return {
        ...prev,
        accounts: updatedAccounts,
        activeAccountId: nextActive,
      };
    });
  };

  // Restore blown account to active
  const handleRestoreAccount = (id: string) => {
    onUpdateState((prev) => ({
      ...prev,
      accounts: prev.accounts.map((acc) => {
        if (acc.id === id) {
          return {
            ...acc,
            status: 'active' as const,
            currentBalance: acc.size,
            highWaterMark: acc.size,
            blownDate: undefined,
          };
        }
        return acc;
      }),
      activeAccountId: prev.activeAccountId || id,
    }));
  };

  // Execute deletion without window.confirm
  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    const targetId = accountToDelete.id;

    onUpdateState((prev) => {
      const remaining = prev.accounts.filter((a) => a.id !== targetId);
      let nextActive = prev.activeAccountId;
      if (prev.activeAccountId === targetId) {
        const firstActive = remaining.find((a) => a.status !== 'blown') || remaining[0];
        nextActive = firstActive ? firstActive.id : '';
      }
      return {
        ...prev,
        accounts: remaining,
        activeAccountId: nextActive,
        customRiskInput: '',
      };
    });

    if (journalAccount?.id === targetId) {
      setJournalAccount(null);
    }
    setAccountToDelete(null);
  };

  // Screenshot Upload handler
  const triggerFileUpload = (tradeId: string) => {
    setUploadTargetTradeId(tradeId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTargetTradeId) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onUpdateState((prev) => {
          const updatedTrades = prev.trades.map((t) =>
            t.id === uploadTargetTradeId ? { ...t, screenshotUrl: dataUrl } : t
          );
          const nextState = { ...prev, trades: updatedTrades };
          broadcastTradeUpdated(uploadTargetTradeId, nextState);
          return nextState;
        });
      }
    };
    reader.readAsDataURL(file);
    setUploadTargetTradeId(null);
  };

  // Remove Screenshot
  const handleRemoveScreenshot = (tradeId: string) => {
    onUpdateState((prev) => {
      const updatedTrades = prev.trades.map((t) =>
        t.id === tradeId ? { ...t, screenshotUrl: undefined } : t
      );
      const nextState = { ...prev, trades: updatedTrades };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });
  };

  // Memo editing
  const handleStartEditMemo = (trade: CompletedTrade) => {
    setEditingMemoTradeId(trade.id);
    setMemoDraft(trade.memo || trade.notes || '');
  };

  const handleSaveMemo = (tradeId: string) => {
    onUpdateState((prev) => {
      const updatedTrades = prev.trades.map((t) =>
        t.id === tradeId
          ? { ...t, memo: memoDraft.trim(), notes: memoDraft.trim() }
          : t
      );
      const nextState = { ...prev, trades: updatedTrades };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });
    setEditingMemoTradeId(null);
    setMemoDraft('');
  };

  // Inline Risk Editing Handlers
  const handleStartEditRisk = (trade: CompletedTrade) => {
    setEditingRiskTradeId(trade.id);
    setEditRiskDraft(String(trade.riskDollars || ''));
  };

  const handleCancelEditRisk = () => {
    setEditingRiskTradeId(null);
    setEditRiskDraft('');
  };

  const handleSaveTradeRisk = (tradeId: string, customVal?: number) => {
    const valToUse = typeof customVal === 'number' ? customVal : parseFloat(editRiskDraft);
    if (isNaN(valToUse) || valToUse <= 0) {
      return;
    }

    onUpdateState((prev) => {
      const updatedTrades = prev.trades.map((t) => {
        if (t.id === tradeId) {
          const acc = prev.accounts.find((a) => a.id === t.accountId);
          const maxDD = acc?.maxDrawdown || (journalAccount?.maxDrawdown || 2000);
          const newRiskPercent = Number(((valToUse / maxDD) * 100).toFixed(1));
          const newRMultiple =
            typeof t.pnl === 'number' ? Number((t.pnl / valToUse).toFixed(2)) : t.rMultiple;
          return {
            ...t,
            riskDollars: Math.round(valToUse),
            riskPercent: newRiskPercent,
            rMultiple: newRMultiple,
          };
        }
        return t;
      });
      const nextState = { ...prev, trades: updatedTrades };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });

    setEditingRiskTradeId(null);
    setEditRiskDraft('');
  };

  // Toggle or update trade discipline (Managed trade well vs Exited emotionally)
  const handleUpdateDiscipline = (tradeId: string, discipline: 'managed_well' | 'exited_emotionally') => {
    onUpdateState((prev) => {
      const updatedTrades = prev.trades.map((t) => {
        if (t.id !== tradeId) return t;
        const isCurrentActive = t.discipline === discipline && t.disciplineSelected !== false;
        return {
          ...t,
          discipline: isCurrentActive ? undefined : discipline,
          disciplineSelected: !isCurrentActive,
        };
      });
      const nextState = { ...prev, trades: updatedTrades };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });
  };

  // Hidden file input element
  const fileInputElement = (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleFileChange}
      accept="image/*"
      className="hidden"
    />
  );

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto space-y-6">
      {fileInputElement}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#142933] pb-4">
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-sky-400" />
            <span>Trading Books & Accounts</span>
          </h1>
          <p className="text-xs text-slate-400">
            Monitor overall performance metrics, risk-to-reward ratios, and journal trade executions per book.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onUpdateState((prev) => ({ ...prev, currentView: 'session' }))}
            className="px-3.5 py-2 bg-[#0c2233] hover:bg-[#11314a] text-sky-300 border border-[#1b4363] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Switch to Session tab where accounts are activated and managed"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>+ Add New Accounts in Session Tab</span>
          </button>
        </div>
      </div>

      {/* Drawdown Disclaimer Notice */}
      <div
        id="drawdown-disclaimer-banner"
        className="p-3 sm:px-4 sm:py-3 bg-[#0a1820] border border-[#18394a] rounded-xl flex items-center gap-3 text-xs text-slate-300 shadow-xs"
      >
        <div className="p-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="text-xs text-slate-300 font-medium">
            <strong className="text-cyan-300 font-bold uppercase tracking-wider text-[10px] mr-1.5 px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30">
              Notice
            </strong>
            Drawdown numbers might be off due to commissions and slippage.
          </p>
          <span className="text-[10px] text-slate-500 font-mono hidden md:inline">
            Execution Variance
          </span>
        </div>
      </div>

      {/* 3-COLUMN REORGANIZED LAYOUT:
          - Live accounts on the left (Column 1)
          - Evals in the middle (Column 2)
          - Blown accounts section positioned in the top right (Column 3)
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* =========================================================================
            COLUMN 1: LIVE ACCOUNTS (LEFT)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#142933] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                LIVE ACCOUNTS ({liveAccounts.length})
              </h2>
            </div>
          </div>

          {liveAccounts.length === 0 ? (
            <div className="p-5 bg-[#09151b] border border-[#142831] rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-bold">No Live Accounts Active</p>
                <p className="text-[11px] text-slate-400">
                  New accounts can only be added from the Session tab.
                </p>
              </div>
              <button
                onClick={() => onUpdateState((prev) => ({ ...prev, currentView: 'session' }))}
                className="px-3.5 py-1.5 bg-[#10242e] hover:bg-[#16313f] text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Go to Session Tab</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {liveAccounts.map((acc) => {
                const isActive = acc.id === state.activeAccountId;
                const accountTrades = getAccountTrades(
                  acc,
                  state.trades,
                  state.activeAccountId,
                  state.accounts.length
                );
                const metrics = calculateAccountMetrics(accountTrades);
                const currentProfit = acc.currentBalance - acc.size;

                return (
                  <div
                    key={acc.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                      isActive
                        ? 'bg-[#0c2229] border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/20'
                        : 'bg-[#0b161b] border-[#162b34] hover:border-[#204555]'
                    }`}
                  >
                    {/* Top Row: Tag, Name, Active Toggle & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                            LIVE
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-white truncate">
                            {acc.name}
                          </h3>
                        </div>

                        {/* Drawdown specs */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="uppercase font-semibold text-slate-300">
                            {acc.drawdownType === 'eod'
                              ? 'EOD Trailing'
                              : acc.drawdownType === 'intraday_trailing'
                              ? 'Intraday'
                              : 'Static'}
                          </span>
                          <span>&bull;</span>
                          <span>
                            Max DD: <strong className="text-slate-200">${acc.maxDrawdown.toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Active Selector Pill & Send to Blown */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetActive(acc.id)}
                            className="px-2 py-0.5 rounded-md bg-[#122832] text-slate-400 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMarkAccountBlown(acc.id)}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Send this account to the Blown section"
                        >
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>Send to Blown</span>
                        </button>

                        <button
                          onClick={() => setAccountToDelete(acc)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Current P&L / Balance Bar */}
                    <div className="p-2.5 rounded-xl bg-[#071318] border border-[#132731] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Net P&L
                        </span>
                        <div
                          className={`text-sm font-black font-mono ${
                            currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {currentProfit >= 0
                            ? `+$${currentProfit.toLocaleString()}`
                            : `-$${Math.abs(currentProfit).toLocaleString()}`}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Book Sizing
                        </span>
                        <div className="text-xs font-bold text-slate-300 font-mono">
                          ${acc.maxDrawdown.toLocaleString()} Max DD
                        </div>
                      </div>
                    </div>

                    {/* CORE PERFORMANCE METRICS: WIN RATE, RR RATIO, PROFIT FACTOR
                        (Replaces Passed/Go Live & Mark Blown buttons) */}
                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      {/* Metric 1: Win Rate */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Percent className="w-3 h-3 text-emerald-400" />
                          <span>Win Rate</span>
                        </div>
                        <div className="text-sm font-black text-white font-mono">
                          {metrics.winRateStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          {metrics.winCount}W &bull; {metrics.lossCount}L
                        </div>
                      </div>

                      {/* Metric 2: RR Ratio */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Scale className="w-3 h-3 text-cyan-400" />
                          <span>RR Ratio</span>
                        </div>
                        <div className="text-sm font-black text-cyan-300 font-mono">
                          {metrics.rrRatioStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Reward:Risk
                        </div>
                      </div>

                      {/* Metric 3: Profit Factor */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Target className="w-3 h-3 text-amber-400" />
                          <span>Profit Fact.</span>
                        </div>
                        <div
                          className={`text-sm font-black font-mono ${
                            metrics.profitFactorStr !== '--' && parseFloat(metrics.profitFactorStr) >= 1.5
                              ? 'text-emerald-400'
                              : metrics.profitFactorStr !== '--' && parseFloat(metrics.profitFactorStr) < 1.0
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          {metrics.profitFactorStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Gross P/L
                        </div>
                      </div>
                    </div>

                    {/* ACCOUNT JOURNAL BUTTON */}
                    <button
                      onClick={() => {
                        setJournalAccount(acc);
                        setJournalFilter('all');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#112733] hover:bg-[#173646] border border-[#1e4255] hover:border-emerald-500/40 text-xs font-black text-emerald-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
                    >
                      <BookOpen className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Open Trade Journal</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#0b1c24] border border-[#183645] text-[10px] text-slate-300 font-mono font-bold">
                        {accountTrades.length} {accountTrades.length === 1 ? 'trade' : 'trades'}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMN 2: EVALS (MIDDLE)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#142933] pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <h2 className="text-xs font-black uppercase tracking-wider text-cyan-400">
                EVALUATIONS ({evalAccounts.length})
              </h2>
            </div>
          </div>

          {evalAccounts.length === 0 ? (
            <div className="p-5 bg-[#09151b] border border-[#142831] rounded-2xl text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Target className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-300 font-bold">No Evaluations Configured</p>
                <p className="text-[11px] text-slate-400">
                  New evaluation books can only be added from the Session tab.
                </p>
              </div>
              <button
                onClick={() => onUpdateState((prev) => ({ ...prev, currentView: 'session' }))}
                className="px-3.5 py-1.5 bg-[#10242e] hover:bg-[#16313f] text-cyan-300 border border-cyan-500/30 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Go to Session Tab</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3.5">
              {evalAccounts.length > 1 && (
                <div className="relative">
                  <select
                    value={
                      evalAccounts.some((a) => a.id === selectedEvalId)
                        ? selectedEvalId
                        : evalAccounts[0].id
                    }
                    onChange={(e) => setSelectedEvalId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 pr-9 rounded-xl bg-[#0b161b] border border-[#204555] text-xs font-bold text-cyan-200 cursor-pointer"
                  >
                    {evalAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.id === state.activeAccountId ? ' (Active)' : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
              {(() => {
                const acc =
                  evalAccounts.find((a) => a.id === selectedEvalId) || evalAccounts[0];
                const isActive = acc.id === state.activeAccountId;
                const accountTrades = getAccountTrades(
                  acc,
                  state.trades,
                  state.activeAccountId,
                  state.accounts.length
                );
                const metrics = calculateAccountMetrics(accountTrades);
                const currentProfit = acc.currentBalance - acc.size;

                return (
                  <div
                    key={acc.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                      isActive
                        ? 'bg-[#09222c] border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/20'
                        : 'bg-[#0b161b] border-[#162b34] hover:border-[#204555]'
                    }`}
                  >
                    {/* Top Row: Tag, Name, Active Toggle & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider">
                            EVAL
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-white truncate">
                            {acc.name}
                          </h3>
                        </div>

                        {/* Drawdown specs */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="uppercase font-semibold text-slate-300">
                            {acc.drawdownType === 'eod'
                              ? 'EOD Trailing'
                              : acc.drawdownType === 'intraday_trailing'
                              ? 'Intraday'
                              : 'Static'}
                          </span>
                          <span>&bull;</span>
                          <span>
                            Max DD: <strong className="text-slate-200">${acc.maxDrawdown.toLocaleString()}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Active Selector Pill & Send to Blown */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-700 text-cyan-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            <span>ACTIVE</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetActive(acc.id)}
                            className="px-2 py-0.5 rounded-md bg-[#122832] text-slate-400 hover:text-white text-[10px] font-bold transition-colors cursor-pointer"
                          >
                            Set Active
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleMarkAccountBlown(acc.id)}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                          title="Send this account to the Blown section"
                        >
                          <Flame className="w-3 h-3 text-rose-400" />
                          <span>Send to Blown</span>
                        </button>

                        <button
                          onClick={() => setAccountToDelete(acc)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Current P&L / Balance Bar */}
                    <div className="p-2.5 rounded-xl bg-[#071318] border border-[#132731] flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Net P&L
                        </span>
                        <div
                          className={`text-sm font-black font-mono ${
                            currentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {currentProfit >= 0
                            ? `+$${currentProfit.toLocaleString()}`
                            : `-$${Math.abs(currentProfit).toLocaleString()}`}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Combine Buffer
                        </span>
                        <div className="text-xs font-bold text-slate-300 font-mono">
                          ${acc.maxDrawdown.toLocaleString()} Max DD
                        </div>
                      </div>
                    </div>

                    {/* CORE PERFORMANCE METRICS: WIN RATE, RR RATIO, PROFIT FACTOR
                        (Replaces Passed/Go Live & Mark Blown buttons) */}
                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      {/* Metric 1: Win Rate */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Percent className="w-3 h-3 text-cyan-400" />
                          <span>Win Rate</span>
                        </div>
                        <div className="text-sm font-black text-white font-mono">
                          {metrics.winRateStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          {metrics.winCount}W &bull; {metrics.lossCount}L
                        </div>
                      </div>

                      {/* Metric 2: RR Ratio */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Scale className="w-3 h-3 text-cyan-400" />
                          <span>RR Ratio</span>
                        </div>
                        <div className="text-sm font-black text-cyan-300 font-mono">
                          {metrics.rrRatioStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Reward:Risk
                        </div>
                      </div>

                      {/* Metric 3: Profit Factor */}
                      <div className="p-2.5 rounded-xl bg-[#08171f] border border-[#173342] text-center space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-center gap-1">
                          <Target className="w-3 h-3 text-amber-400" />
                          <span>Profit Fact.</span>
                        </div>
                        <div
                          className={`text-sm font-black font-mono ${
                            metrics.profitFactorStr !== '--' && parseFloat(metrics.profitFactorStr) >= 1.5
                              ? 'text-emerald-400'
                              : metrics.profitFactorStr !== '--' && parseFloat(metrics.profitFactorStr) < 1.0
                              ? 'text-rose-400'
                              : 'text-white'
                          }`}
                        >
                          {metrics.profitFactorStr}
                        </div>
                        <div className="text-[9px] text-slate-400 font-medium">
                          Gross P/L
                        </div>
                      </div>
                    </div>

                    {/* ACCOUNT JOURNAL BUTTON */}
                    <button
                      onClick={() => {
                        setJournalAccount(acc);
                        setJournalFilter('all');
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#0e2733] hover:bg-[#153444] border border-[#1c4355] hover:border-cyan-500/40 text-xs font-black text-cyan-300 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs group"
                    >
                      <BookOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                      <span>Open Trade Journal</span>
                      <span className="px-1.5 py-0.5 rounded-full bg-[#081c24] border border-[#153847] text-[10px] text-slate-300 font-mono font-bold">
                        {accountTrades.length} {accountTrades.length === 1 ? 'trade' : 'trades'}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMN 3: BLOWN ACCOUNTS (TOP RIGHT)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#142933] pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-rose-400">
                BLOWN ACCOUNTS ({blownAccounts.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Drawdown breaches</span>
          </div>

          {blownAccounts.length === 0 ? (
            <div className="p-5 bg-[#0a1216] border border-[#162731] rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <span>Clean Record</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    Zero accounts breached. Disciplined stop orders, quality sizing, and drawdown floors have preserved all capital.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              {blownAccounts.map((acc) => {
                const accountTrades = getAccountTrades(
                  acc,
                  state.trades,
                  state.activeAccountId,
                  state.accounts.length
                );
                const metrics = calculateAccountMetrics(accountTrades);

                return (
                  <div
                    key={acc.id}
                    className="p-4 sm:p-5 bg-[#140f13] border border-rose-950/70 rounded-2xl space-y-3.5"
                  >
                    {/* Top Row: Tag, Name, Reset & Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-rose-950 border border-rose-800 text-rose-400 text-[10px] font-black uppercase">
                            BLOWN
                          </span>
                          <h3 className="text-sm sm:text-base font-black text-slate-200 line-through truncate">
                            {acc.name}
                          </h3>
                        </div>
                        {acc.blownDate && (
                          <div className="text-[11px] text-rose-400/80 font-medium">
                            Breached on: {acc.blownDate}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setAccountToDelete(acc)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          title="Delete book"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metrics for post-mortem review */}
                    <div className="grid grid-cols-3 gap-2 pt-0.5">
                      <div className="p-2 rounded-xl bg-[#0d0a0c] border border-rose-950/60 text-center space-y-0.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Win Rate</div>
                        <div className="text-xs font-black text-white font-mono">{metrics.winRateStr}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0d0a0c] border border-rose-950/60 text-center space-y-0.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">RR Ratio</div>
                        <div className="text-xs font-black text-slate-300 font-mono">{metrics.rrRatioStr}</div>
                      </div>
                      <div className="p-2 rounded-xl bg-[#0d0a0c] border border-rose-950/60 text-center space-y-0.5">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Profit Fact.</div>
                        <div className="text-xs font-black text-slate-300 font-mono">{metrics.profitFactorStr}</div>
                      </div>
                    </div>

                    {/* Post-Mortem Journal Button */}
                    <button
                      onClick={() => {
                        setJournalAccount(acc);
                        setJournalFilter('all');
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-[#1c1216] hover:bg-[#27171d] border border-rose-950 hover:border-rose-800 text-xs font-black text-rose-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                      <span>Review Post-Mortem Journal ({accountTrades.length})</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          ACCOUNT JOURNAL MODAL / DETAILED TRADE VIEW
         ========================================================================= */}
      {journalAccount && (() => {
        // Resolve the live active account object directly from state.accounts to ensure balance and metadata never go stale
        const liveJournalAccount =
          state.accounts.find((a) => a.id === journalAccount.id) || journalAccount;

        const trades = getAccountTrades(
          liveJournalAccount,
          state.trades,
          state.activeAccountId,
          state.accounts.length
        );
        const metrics = calculateAccountMetrics(trades);

        const isManagedWellTrade = (t: CompletedTrade) =>
          t.discipline === 'managed_well' && t.disciplineSelected !== false;
        const isExitedEmotionallyTrade = (t: CompletedTrade) =>
          t.discipline === 'exited_emotionally' && t.disciplineSelected !== false;
        const isUnspecifiedTrade = (t: CompletedTrade) =>
          !isManagedWellTrade(t) && !isExitedEmotionallyTrade(t);

        const managedWellCount = trades.filter(isManagedWellTrade).length;
        const exitedEmotionallyCount = trades.filter(isExitedEmotionallyTrade).length;
        const unspecifiedCount = trades.filter(isUnspecifiedTrade).length;

        const filteredTrades = trades.filter((t) => {
          if (journalFilter === 'winner') return (t.pnl || 0) > 0;
          if (journalFilter === 'loser') return (t.pnl || 0) < 0;
          if (journalFilter === 'managed_well') return isManagedWellTrade(t);
          if (journalFilter === 'exited_emotionally') return isExitedEmotionallyTrade(t);
          if (journalFilter === 'unspecified') return isUnspecifiedTrade(t);
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in">
            <div className="w-full max-w-4xl max-h-[90vh] bg-[#09151b] border border-[#1b3a4a] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              {/* Journal Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#142d3b] bg-[#071116] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        liveJournalAccount.accountType === 'live'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : liveJournalAccount.status === 'blown'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}
                    >
                      {liveJournalAccount.status === 'blown'
                        ? 'BLOWN BOOK'
                        : liveJournalAccount.accountType === 'live'
                        ? 'LIVE BOOK'
                        : 'EVALUATION'}
                    </span>
                    <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                      <span>{liveJournalAccount.name} &bull; Trade Journal</span>
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Detailed trade history, realized RR ratios, trade screenshots, and execution memos.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {liveJournalAccount.status !== 'blown' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkAccountBlown(liveJournalAccount.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="Send this account to the Blown section"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                      <span>Send to Blown</span>
                    </button>
                  )}
                  <button
                    onClick={() => setJournalAccount(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-[#122834] rounded-xl transition-colors cursor-pointer"
                    title="Close journal"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Journal Metrics Bar */}
              <div className="p-3 sm:p-4 bg-[#0a1820] border-b border-[#142d3b] grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-2 rounded-xl bg-[#061015] border border-[#132c39] space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Net Realized P&L
                  </span>
                  <div
                    className={`text-sm sm:text-base font-black font-mono ${
                      metrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {metrics.netPnl >= 0
                      ? `+$${metrics.netPnl.toLocaleString()}`
                      : `-$${Math.abs(metrics.netPnl).toLocaleString()}`}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#061015] border border-[#132c39] space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Win Rate
                  </span>
                  <div className="text-sm sm:text-base font-black text-white font-mono flex items-center gap-1.5">
                    <span>{metrics.winRateStr}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      ({metrics.winCount}W / {metrics.lossCount}L)
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#061015] border border-[#132c39] space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Realized RR Ratio
                  </span>
                  <div className="text-sm sm:text-base font-black text-cyan-300 font-mono">
                    {metrics.rrRatioStr}
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#061015] border border-[#132c39] space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Profit Factor
                  </span>
                  <div
                    className={`text-sm sm:text-base font-black font-mono ${
                      metrics.profitFactorStr !== '--' && parseFloat(metrics.profitFactorStr) >= 1.5
                        ? 'text-emerald-400'
                        : 'text-white'
                    }`}
                  >
                    {metrics.profitFactorStr}
                  </div>
                </div>
              </div>

              {/* DEDICATED TRADE MANAGEMENT SUMMARY TALLY & UNCHECKED COUNTER */}
              <div
                id="journal-trade-management-tally"
                className="p-3.5 sm:p-4 bg-[#071319] border-b border-[#142d3b] flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Trade Management Tally
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      &bull; {trades.length} {trades.length === 1 ? 'Trade' : 'Trades'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Exit discipline evaluation: track trades marked Managed well vs. Exited emotionally vs. Unspecified.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Managed Well Counter */}
                  <button
                    type="button"
                    onClick={() =>
                      setJournalFilter((prev) => (prev === 'managed_well' ? 'all' : 'managed_well'))
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      journalFilter === 'managed_well'
                        ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500/50'
                        : 'bg-[#06141a] border-emerald-500/30 text-emerald-300 hover:border-emerald-500/60'
                    }`}
                    title="Filter trades: Managed well"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[11px] font-bold">Managed well:</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-white bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                      {managedWellCount}
                    </span>
                  </button>

                  {/* Exited Emotionally Counter */}
                  <button
                    type="button"
                    onClick={() =>
                      setJournalFilter((prev) => (prev === 'exited_emotionally' ? 'all' : 'exited_emotionally'))
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      journalFilter === 'exited_emotionally'
                        ? 'bg-rose-500/25 border-rose-500 text-rose-200 ring-1 ring-rose-500/50'
                        : 'bg-[#150a0f] border-rose-500/30 text-rose-300 hover:border-rose-500/60'
                    }`}
                    title="Filter trades: Exited emotionally"
                  >
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <span className="text-[11px] font-bold">Exited emotionally:</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-white bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/40">
                      {exitedEmotionallyCount}
                    </span>
                  </button>

                  {/* Unspecified Counter */}
                  <button
                    type="button"
                    onClick={() =>
                      setJournalFilter((prev) => (prev === 'unspecified' ? 'all' : 'unspecified'))
                    }
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                      journalFilter === 'unspecified'
                        ? 'bg-slate-700/40 border-slate-400 text-white ring-1 ring-slate-400/50'
                        : 'bg-[#081216] border-slate-700/60 text-slate-400 hover:border-slate-500'
                    }`}
                    title="Filter trades: Unspecified (not yet categorized)"
                  >
                    <div className="w-2 h-2 rounded-full bg-slate-500" />
                    <span className="text-[11px] font-bold">Unspecified:</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-slate-200 bg-[#0d1e26] px-2 py-0.5 rounded border border-slate-700">
                      {unspecifiedCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Quick Action */}
              <div className="px-4 py-2.5 bg-[#08151c] border-b border-[#132b38] flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setJournalFilter('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'all'
                        ? 'bg-emerald-500 text-black font-black'
                        : 'text-slate-400 hover:text-white bg-[#0e212b]'
                    }`}
                  >
                    All ({trades.length})
                  </button>
                  <button
                    onClick={() => setJournalFilter('winner')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'winner'
                        ? 'bg-emerald-500 text-black font-black'
                        : 'text-slate-400 hover:text-emerald-300 bg-[#0e212b]'
                    }`}
                  >
                    Winners ({metrics.winCount})
                  </button>
                  <button
                    onClick={() => setJournalFilter('loser')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'loser'
                        ? 'bg-rose-500 text-white font-black'
                        : 'text-slate-400 hover:text-rose-300 bg-[#0e212b]'
                    }`}
                  >
                    Losses ({metrics.lossCount})
                  </button>
                  <button
                    onClick={() => setJournalFilter('managed_well')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'managed_well'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/60 font-black'
                        : 'text-slate-400 hover:text-emerald-300 bg-[#0e212b]'
                    }`}
                  >
                    Managed well ({managedWellCount})
                  </button>
                  <button
                    onClick={() => setJournalFilter('exited_emotionally')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'exited_emotionally'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 font-black'
                        : 'text-slate-400 hover:text-rose-300 bg-[#0e212b]'
                    }`}
                  >
                    Exited emotionally ({exitedEmotionallyCount})
                  </button>
                  <button
                    onClick={() => setJournalFilter('unspecified')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      journalFilter === 'unspecified'
                        ? 'bg-slate-700/50 text-white border border-slate-500 font-black'
                        : 'text-slate-400 hover:text-slate-200 bg-[#0e212b]'
                    }`}
                  >
                    Unspecified ({unspecifiedCount})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Sorted by most recent</span>
                </div>
              </div>

              {/* Trades List View */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                {filteredTrades.length === 0 ? (
                  <div className="p-8 text-center space-y-4 rounded-2xl bg-[#061116] border border-[#132832]">
                    <div className="w-12 h-12 mx-auto rounded-full bg-[#0c222c] border border-[#193a4a] flex items-center justify-center text-slate-400">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h4 className="text-sm font-bold text-white">No trades found for this account</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Trades logged during the Pre-Trade Session will automatically record here with complete RR metrics, screenshots, and memos.
                      </p>
                    </div>
                  </div>
                ) : (
                  filteredTrades
                    .slice()
                    .reverse()
                    .map((trade, idx) => {
                      const isWin = (trade.pnl || 0) > 0;
                      const isLoss = (trade.pnl || 0) < 0;

                      // Calculate specific RR ratio for this trade
                      const tradeRRStr = (() => {
                        if (typeof trade.rMultiple === 'number' && !isNaN(trade.rMultiple)) {
                          return trade.rMultiple >= 0
                            ? `+${trade.rMultiple.toFixed(2)} R`
                            : `${trade.rMultiple.toFixed(2)} R`;
                        }
                        if (trade.riskDollars && trade.riskDollars > 0 && typeof trade.pnl === 'number') {
                          const r = trade.pnl / trade.riskDollars;
                          return r >= 0 ? `+${r.toFixed(2)} R` : `${r.toFixed(2)} R`;
                        }
                        return trade.pnl >= 0 ? '+1.00 R' : '-1.00 R';
                      })();

                      const tradeRatioStr = (() => {
                        if (trade.riskDollars && trade.riskDollars > 0 && typeof trade.pnl === 'number') {
                          const ratio = Math.abs(trade.pnl) / trade.riskDollars;
                          return `1 : ${ratio.toFixed(2)}`;
                        }
                        if (typeof trade.rMultiple === 'number') {
                          return `1 : ${Math.abs(trade.rMultiple).toFixed(2)}`;
                        }
                        return '1 : 1.00';
                      })();

                      return (
                        <div
                          key={trade.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
                            isWin
                              ? 'bg-[#08191f] border-[#153a47] hover:border-emerald-500/50'
                              : 'bg-[#140e12] border-rose-950/70 hover:border-rose-800/70'
                          }`}
                        >
                          {/* Row 1: Trade Number, Name, Time, PnL, and Specific RR Ratio */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md bg-[#051015] border border-[#142d39] text-slate-300 font-mono text-[10px] font-bold">
                                  #{trade.orderNumber || idx + 1}
                                </span>
                                <span className="text-sm font-black text-white">
                                  {trade.name || `${trade.symbol} Execution`}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    isWin
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {isWin ? 'WINNER' : isLoss ? 'LOSS' : 'BREAKEVEN'}
                                </span>

                                <span className="text-xs text-slate-400 font-medium">{trade.timestamp}</span>
                              </div>

                              {/* Below timestamp: Two distinct discipline buttons (Neutral unselected by default) */}
                              {(() => {
                                const isManagedWell = isManagedWellTrade(trade);
                                const isExitedEmotionally = isExitedEmotionallyTrade(trade);
                                const isUnspecified = isUnspecifiedTrade(trade);

                                return (
                                  <div className="flex items-center gap-2 pt-1 pb-0.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDiscipline(trade.id, 'managed_well')}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                        isManagedWell
                                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 ring-1 ring-emerald-500/30'
                                          : 'bg-[#08151c] text-slate-500 border border-[#142934] hover:border-slate-500 hover:text-slate-300 opacity-75 hover:opacity-100'
                                      }`}
                                      title={isManagedWell ? 'Selected: Click to unselect' : 'Click to select: Managed trade well'}
                                    >
                                      <CheckCircle2
                                        className={`w-3.5 h-3.5 ${
                                          isManagedWell ? 'text-emerald-400' : 'text-slate-600'
                                        }`}
                                      />
                                      <span>Managed trade well</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleUpdateDiscipline(trade.id, 'exited_emotionally')}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                        isExitedEmotionally
                                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/60 ring-1 ring-rose-500/30'
                                          : 'bg-[#08151c] text-slate-500 border border-[#142934] hover:border-slate-500 hover:text-slate-300 opacity-75 hover:opacity-100'
                                      }`}
                                      title={isExitedEmotionally ? 'Selected: Click to unselect' : 'Click to select: Exited emotionally'}
                                    >
                                      <AlertTriangle
                                        className={`w-3.5 h-3.5 ${
                                          isExitedEmotionally ? 'text-rose-400' : 'text-slate-600'
                                        }`}
                                      />
                                      <span>Exited emotionally</span>
                                    </button>

                                    {isUnspecified && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#071216] border border-[#142832] text-slate-500">
                                        Unspecified exit
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}

                              {editingRiskTradeId === trade.id ? (
                                <div className="p-3 rounded-xl bg-[#06141a] border border-cyan-500/50 space-y-2.5 my-1.5 animate-in fade-in-50 duration-150 shadow-lg">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                                      <Edit3 className="w-3.5 h-3.5" />
                                      <span>Correct Trade Risk Amount:</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      Current: ${trade.riskDollars} ({trade.riskPercent}%)
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1 max-w-[170px]">
                                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cyan-400 font-mono font-bold text-xs">
                                        $
                                      </span>
                                      <input
                                        type="number"
                                        value={editRiskDraft}
                                        onChange={(e) => setEditRiskDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveTradeRisk(trade.id);
                                          if (e.key === 'Escape') handleCancelEditRisk();
                                        }}
                                        placeholder="200"
                                        autoFocus
                                        className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#0b1b22] border border-cyan-500/60 text-white font-mono font-bold text-xs focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                      />
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleSaveTradeRisk(trade.id)}
                                      className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
                                      title="Save updated risk"
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                      <span>Save</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCancelEditRisk}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#0e1d24] hover:bg-[#162e3a] text-slate-400 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  {/* Quick Presets */}
                                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                    <span className="text-[9px] text-slate-400 font-medium">Quick Fill:</span>
                                    {[
                                      ...(journalAccount?.maxDrawdown
                                        ? [
                                            {
                                              label: `B ($${Math.max(5, Math.round(journalAccount.maxDrawdown * 0.05))})`,
                                              val: Math.max(5, Math.round(journalAccount.maxDrawdown * 0.05)),
                                            },
                                            {
                                              label: `A ($${Math.max(10, Math.round(journalAccount.maxDrawdown * 0.10))})`,
                                              val: Math.max(10, Math.round(journalAccount.maxDrawdown * 0.10)),
                                            },
                                            {
                                              label: `A+ ($${Math.max(15, Math.round(journalAccount.maxDrawdown * 0.15))})`,
                                              val: Math.max(15, Math.round(journalAccount.maxDrawdown * 0.15)),
                                            },
                                          ]
                                        : []),
                                      { label: '$50', val: 50 },
                                      { label: '$100', val: 100 },
                                      { label: '$150', val: 150 },
                                      { label: '$200', val: 200 },
                                      { label: '$250', val: 250 },
                                      { label: '$300', val: 300 },
                                      { label: '$500', val: 500 },
                                    ].map((p, pIdx) => (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => setEditRiskDraft(String(p.val))}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                                          editRiskDraft === String(p.val)
                                            ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                                            : 'bg-[#09181f] hover:bg-cyan-500/20 border-slate-700 hover:border-cyan-500/40 text-slate-300'
                                        }`}
                                      >
                                        {p.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                                  <span>
                                    Symbol: <strong className="text-slate-200">{trade.symbol}</strong>
                                  </span>
                                  <span>&bull;</span>
                                  <span className="flex items-center gap-1.5">
                                    <span>Risk:</span>
                                    <strong className="text-slate-200 font-mono font-bold">
                                      ${trade.riskDollars}
                                    </strong>
                                    <span className="text-slate-400">({trade.riskPercent}%)</span>
                                    <button
                                      type="button"
                                      onClick={() => handleStartEditRisk(trade)}
                                      className="ml-1 px-2 py-0.5 rounded-md bg-[#0b1d26] hover:bg-cyan-500/20 border border-[#163644] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title="Edit/Update risk amount for this trade"
                                    >
                                      <Edit3 className="w-3 h-3 text-cyan-400" />
                                      <span>Edit Risk</span>
                                    </button>
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* PnL & Prominent Risk-to-Reward (RR) Ratio Block */}
                            <div className="flex items-center gap-3 sm:text-right shrink-0">
                              <div className="space-y-0.5 pr-1">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  Realized P&L
                                </div>
                                <div
                                  className={`text-base sm:text-lg font-black font-mono ${
                                    isWin ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {trade.pnl >= 0
                                    ? `+$${trade.pnl.toLocaleString()}`
                                    : `-$${Math.abs(trade.pnl).toLocaleString()}`}
                                </div>
                              </div>

                              {/* PROMINENT RISK-TO-REWARD (RR) RATIO CARD */}
                              <div
                                className={`px-3 py-2 rounded-xl border flex flex-col items-center justify-center min-w-[125px] shadow-md transition-all ${
                                  isWin
                                    ? 'bg-gradient-to-b from-[#08232e] to-[#05161d] border-cyan-400/80 text-cyan-300 ring-1 ring-cyan-400/30'
                                    : 'bg-gradient-to-b from-[#220d15] to-[#14080d] border-rose-500/70 text-rose-300 ring-1 ring-rose-500/25'
                                }`}
                              >
                                <div className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 text-cyan-300 mb-0.5">
                                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>R : R RATIO</span>
                                </div>
                                <div className="text-lg font-black font-mono tracking-tight text-white leading-none my-0.5">
                                  {tradeRatioStr}
                                </div>
                                <div
                                  className={`text-[11px] font-extrabold font-mono px-2 py-0.5 rounded-md mt-0.5 ${
                                    isWin
                                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                                      : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                  }`}
                                >
                                  {tradeRRStr}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Row 2: Attachments Section (Screenshot & Memo) */}
                          <div className="pt-2 border-t border-[#122733] space-y-3">
                            {/* SCREENSHOT AREA */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>Chart Screenshot</span>
                                </span>

                                <div className="flex items-center gap-2">
                                  {trade.screenshotUrl ? (
                                    <>
                                      <button
                                        onClick={() => setLightboxImage(trade.screenshotUrl || null)}
                                        className="text-[10px] font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
                                      >
                                        <Maximize2 className="w-3 h-3" />
                                        <span>View Full</span>
                                      </button>
                                      <button
                                        onClick={() => triggerFileUpload(trade.id)}
                                        className="text-[10px] font-bold text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                                      >
                                        <Upload className="w-3 h-3" />
                                        <span>Replace</span>
                                      </button>
                                      <button
                                        onClick={() => handleRemoveScreenshot(trade.id)}
                                        className="text-[10px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        <span>Remove</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => triggerFileUpload(trade.id)}
                                      className="px-2.5 py-1 rounded-lg bg-[#0e2430] hover:bg-[#153444] border border-[#1a4154] text-[10px] font-bold text-cyan-300 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <Upload className="w-3 h-3" />
                                      <span>Upload File</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Screenshot Preview Image or Direct Attach Box */}
                              {trade.screenshotUrl ? (
                                <div
                                  onClick={() => setLightboxImage(trade.screenshotUrl || null)}
                                  className="relative max-w-sm rounded-xl overflow-hidden border border-[#1b3a4a] bg-[#051014] cursor-pointer group shadow-sm"
                                >
                                  <img
                                    src={trade.screenshotUrl}
                                    alt="Trade execution chart"
                                    className="w-full max-h-48 object-cover group-hover:opacity-90 transition-opacity"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold">
                                    <Maximize2 className="w-4 h-4" />
                                    <span>Click to view full size</span>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => triggerFileUpload(trade.id)}
                                  className="w-full py-2.5 px-3 border border-dashed border-[#1a3847] hover:border-cyan-500/50 rounded-xl bg-[#061217]/50 hover:bg-[#081d26] text-slate-400 hover:text-cyan-300 text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer group"
                                >
                                  <Upload className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:scale-110 transition-all" />
                                  <span>Click to attach chart screenshot (.png, .jpg)</span>
                                </button>
                              )}
                            </div>

                            {/* MEMO / NOTE AREA */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Trader Memo & Execution Notes</span>
                                </span>

                                {editingMemoTradeId !== trade.id && (
                                  <button
                                    onClick={() => handleStartEditMemo(trade)}
                                    className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>{trade.memo || trade.notes ? 'Edit Memo' : '+ Add Memo'}</span>
                                  </button>
                                )}
                              </div>

                              {/* Inline Memo Editor */}
                              {editingMemoTradeId === trade.id ? (
                                <div className="space-y-2 p-3 bg-[#061217] border border-[#163645] rounded-xl">
                                  <textarea
                                    value={memoDraft}
                                    onChange={(e) => setMemoDraft(e.target.value)}
                                    placeholder="Write your trade memo: entry trigger, why the stop was chosen, emotional observations, exit execution..."
                                    rows={3}
                                    autoFocus
                                    className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => setEditingMemoTradeId(null)}
                                      className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-white rounded-lg cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handleSaveMemo(trade.id)}
                                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                                    >
                                      Save Memo
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                (trade.memo || trade.notes) && (
                                  <div
                                    onClick={() => handleStartEditMemo(trade)}
                                    className="p-3 bg-[#061217] hover:bg-[#091b22] border border-[#142f3d] rounded-xl text-xs text-slate-300 leading-relaxed italic cursor-pointer transition-colors"
                                    title="Click to edit memo"
                                  >
                                    &ldquo;{trade.memo || trade.notes}&rdquo;
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Journal Modal Footer */}
              <div className="p-3 sm:p-4 bg-[#071116] border-t border-[#142d3b] flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {journalAccount.name} &bull; {trades.length} Total Executions Recorded
                </span>
                <button
                  onClick={() => setJournalAccount(null)}
                  className="px-4 py-2 bg-[#122834] hover:bg-[#193747] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close Journal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* =========================================================================
          SCREENSHOT LIGHTBOX MODAL
         ========================================================================= */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl max-h-[90vh] bg-[#071217] border border-[#193949] rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-[#050f14] border-b border-[#142f3d] flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Trade Chart Fullscreen View</span>
              </span>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="Trade Chart Fullscreen"
                className="max-h-[80vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          IN-APP ACCOUNT DELETION CONFIRMATION MODAL
         ========================================================================= */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#0c161b] border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-black text-white tracking-tight">
                Delete "{accountToDelete.name}"?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this trading account book? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setAccountToDelete(null)}
                className="flex-1 py-2.5 bg-[#12242c] hover:bg-[#18303a] text-slate-300 font-bold text-xs rounded-xl border border-[#1d3744] transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
