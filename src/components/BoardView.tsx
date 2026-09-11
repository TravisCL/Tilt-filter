import React from 'react';
import {
  Shield,
  Gem,
  Award,
  Sparkles,
  Flame,
  Lock,
  CheckCircle2,
  AlertCircle,
  Crown,
  Check,
} from 'lucide-react';
import { AppState, TierLevel } from '../types';
import { TradeManagementTally } from './TradeManagementTally';
import { StatusSymbolHeader } from './StatusSymbolHeader';
import { getNoTiltStats, TIER_MILESTONES, TIER_ORDER } from '../utils/tierProgression';

interface BoardViewProps {
  state: AppState;
  onSelectTier?: (tier: TierLevel) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ state }) => {
  const stats = getNoTiltStats(state);
  const { currentTier, noTiltDays, activeTiltTab } = stats;
  const hasActiveTiltTab = activeTiltTab > 0;

  const todayTrades = state.trades || [];
  const plannedCount = todayTrades.filter((t) => t.plannedStatus === 'planned').length;
  const unplannedCount = todayTrades.filter((t) => t.plannedStatus === 'unplanned').length;

  const weekPlanned = plannedCount;
  const weekUnplanned = unplannedCount;

  // Timeline bars: dynamic based on dailyScoreboard or fresh Day 1 timeline
  const rawScoreboard = state.dailyScoreboard || [];
  const timelineDates =
    rawScoreboard.length > 0
      ? rawScoreboard.slice(0, 7).reverse().map((s) => ({
          date: s.date.slice(5),
          clean: s.isCleanDay,
          height: s.isCleanDay ? 'h-8' : 'h-4',
        }))
      : [{ date: 'Day 1', clean: true, height: 'h-6' }];

  const getTierIcon = (level: TierLevel, className: string = 'w-5 h-5') => {
    switch (level) {
      case 'diamond':
        return <Gem className={className} />;
      case 'platinum':
        return <Award className={className} />;
      case 'gold':
        return <Crown className={className} />;
      case 'silver':
        return <Shield className={className} />;
      case 'bronze':
        return <Sparkles className={className} />;
      case 'copper':
        return <AlertCircle className={className} />;
      default:
        return <Shield className={className} />;
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-5xl mx-auto space-y-6 select-none">
      {/* 1. TOP PRESTIGE STATUS SYMBOL & NO TILT DAYS HERO BANNER */}
      <StatusSymbolHeader state={state} />

      {/* 2. AUTHENTIC EARNED TIER BOARD (LOCKED PROGRESSION ROADMAP) */}
      <div
        id="board-tier-progression-ladder"
        className="p-4 sm:p-5 bg-[#081726] border border-[#163852] rounded-2xl space-y-4 shadow-sm"
      >
        {/* Tier Board Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#143247] pb-3.5">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <h2 className="text-base font-black text-white tracking-tight">
                TIER STATUS PROGRESSION LADDER
              </h2>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Tiers are authentic status symbols earned by continuous no-tilt days. They cannot be manually clicked through.
            </p>
          </div>

          <div className="text-[11px] text-slate-300 font-mono bg-[#05111c] border border-[#15344a] px-3 py-1.5 rounded-xl flex items-center gap-2 shrink-0">
            <Flame className="w-3.5 h-3.5 text-sky-400" />
            <span>Active Record: <strong className="text-sky-300 font-black">{noTiltDays} No Tilt Days</strong></span>
          </div>
        </div>

        {/* 6 Tier Progression Cards - Strictly Earned / Locked */}
        <div className="space-y-3">
          {TIER_ORDER.map((tierLevel) => {
            const milestone = TIER_MILESTONES[tierLevel];
            const isCurrent = currentTier === tierLevel;
            const isCompleted = noTiltDays >= milestone.minDays && !isCurrent;
            const isLocked = noTiltDays < milestone.minDays;
            const daysRemaining = Math.max(0, milestone.minDays - noTiltDays);

            return (
              <div
                key={tierLevel}
                id={`tier-card-${tierLevel}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all relative overflow-hidden ${
                  isCurrent
                    ? `bg-gradient-to-r ${milestone.bgGradient} ${milestone.borderColor} ring-2 ${milestone.glowColor} shadow-lg shadow-sky-950/40`
                    : isCompleted
                    ? 'bg-[#091e2e] border-emerald-500/40 opacity-90'
                    : 'bg-[#06121c] border-[#132d3f] opacity-60'
                }`}
              >
                {/* Visual Status Indicator Strip on Current Tier */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400" />
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-start sm:items-center gap-3.5">
                    {/* Status Badge Icon / Crest */}
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                        isCurrent
                          ? `bg-gradient-to-br ${milestone.bgGradient} ${milestone.borderColor} ${milestone.accentColor} shadow-md`
                          : isCompleted
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                          : 'bg-[#091b26] border-[#183a50] text-slate-500'
                      }`}
                    >
                      {getTierIcon(tierLevel, 'w-5 h-5')}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm sm:text-base font-black tracking-tight ${isCurrent ? 'text-white' : isCompleted ? 'text-slate-200' : 'text-slate-400'}`}>
                          {milestone.title}
                        </span>

                        {/* Status Label Pill */}
                        {isCurrent ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3 h-3 stroke-[3]" />
                            <span>YOUR CURRENT STATUS</span>
                          </span>
                        ) : isCompleted ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-extrabold text-[10px] uppercase flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>COMPLETED MILESTONE</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#081724] border border-[#16354b] text-slate-400 font-bold text-[10px] uppercase flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>LOCKED STATUS</span>
                          </span>
                        )}

                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase ${isCurrent ? milestone.accentColor : 'text-slate-500'}`}>
                          {milestone.badgeLabel}
                        </span>
                      </div>

                      <p className={`text-xs ${isCurrent ? 'text-slate-200' : 'text-slate-400'} font-medium`}>
                        {milestone.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Milestone Requirement & Progression info */}
                  <div className="text-left sm:text-right pl-14 sm:pl-0 shrink-0">
                    <div className="space-y-1">
                      <span
                        className={`inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                          isCurrent
                            ? `bg-[#061420] ${milestone.borderColor} ${milestone.accentColor}`
                            : isCompleted
                            ? 'bg-[#071924] border-emerald-500/40 text-emerald-300'
                            : 'bg-[#050f17] border-[#132e42] text-slate-500'
                        }`}
                      >
                        {milestone.minDays === 0 ? 'Reset Tier' : `${milestone.minDays}+ No Tilt Days`}
                      </span>

                      <div className="text-[11px] font-mono">
                        {isCurrent ? (
                          <span className="text-sky-300 font-bold">★ Active Rank</span>
                        ) : isCompleted ? (
                          <span className="text-emerald-400 font-medium">Requirement Met</span>
                        ) : (
                          <span className="text-slate-500">{daysRemaining} more clean days needed</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Bar */}
        <div className="pt-3.5 border-t border-[#143247] space-y-2">
          <div className="text-xs text-slate-300 font-medium">
            {rawScoreboard.length > 0
              ? `Day ${state.dayCounter || 1} in progress • ${state.cleanStreak || 0} clean sessions logged`
              : `Day ${state.dayCounter || 1} • Clean slate session ready`}
          </div>

          <div className="flex items-end gap-2 h-16 pt-2 px-1 border-b border-[#143247]">
            {timelineDates.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full max-w-[28px] rounded-t-sm transition-all ${
                    item.clean ? 'bg-sky-400' : 'bg-rose-500/80'
                  } ${item.height}`}
                ></div>
                <span className="text-[9px] font-mono text-slate-500">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <div className={`grid grid-cols-2 ${hasActiveTiltTab ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
        {/* NO TILT DAYS / CLEAN STREAK */}
        <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-1 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>NO TILT DAYS</span>
            <span className="text-sky-400 font-mono text-[10px]">Day {state.dayCounter || 1}</span>
          </div>
          <div className="text-3xl font-black text-white font-mono">{noTiltDays}</div>
          <div className="text-xs text-slate-400 font-medium">consecutive tilt-free sessions</div>
        </div>

        {/* TILT SCORE */}
        <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-1 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            TILT SCORE
          </div>
          <div className="text-3xl font-black text-white">{state.tiltScore}</div>
          <div
            className={`text-xs font-bold ${
              state.tiltScore === 0
                ? 'text-sky-300'
                : state.tiltScore === 1
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {state.tiltScore === 0
              ? 'Calm'
              : state.tiltScore === 1
              ? 'Tension (Frustrated)'
              : 'High Tilt Risk (Chasing)'}
          </div>
        </div>

        {/* TILT TAB */}
        {hasActiveTiltTab && (
          <div className="p-4 bg-[#081726] border border-rose-900/40 bg-gradient-to-b from-[#1c0c14] to-[#081726] rounded-2xl space-y-1 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 flex items-center justify-between">
              <span>TILT TAB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-rose-400">
              ${activeTiltTab.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">from numbers you told me</div>
          </div>
        )}

        {/* TODAY */}
        <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-1 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            TODAY
          </div>
          <div className="text-3xl font-black text-white">{state.trades.length}</div>
          <div className="text-xs text-slate-400 font-medium">
            {plannedCount} planned &bull; {unplannedCount} unplanned
          </div>
        </div>
      </div>

      {/* Row 2: PLANNED and UNPLANNED Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-1 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            PLANNED
          </div>
          <div className="text-3xl font-black text-white">{weekPlanned}</div>
          <div className="text-xs text-slate-400 font-medium">this week &bull; through the rules</div>
        </div>

        <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-1 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            UNPLANNED
          </div>
          <div className="text-3xl font-black text-white">{weekUnplanned}</div>
          <div className="text-xs text-slate-400 font-medium">this week &bull; already clicked</div>
        </div>
      </div>

      {/* MONTHLY AGGREGATED TRADE MANAGEMENT TALLY */}
      <TradeManagementTally state={state} />
    </div>
  );
};
