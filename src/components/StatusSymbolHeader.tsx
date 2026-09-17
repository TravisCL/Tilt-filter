import React from 'react';
import {
  Shield,
  Gem,
  Award,
  Sparkles,
  Flame,
  Lock,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Crown,
} from 'lucide-react';
import { AppState, TierLevel } from '../types';
import { getNoTiltStats } from '../utils/tierProgression';

interface StatusSymbolHeaderProps {
  state: AppState;
  compact?: boolean;
}

export const StatusSymbolHeader: React.FC<StatusSymbolHeaderProps> = ({ state, compact = false }) => {
  const stats = getNoTiltStats(state);
  const { currentTier, tierInfo, nextTier, noTiltDays, daysToNextTier, progressPercent, isMaxTier, activeTiltTab } = stats;

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

  if (compact) {
    return (
      <div
        id="compact-status-symbol-bar"
        className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-[#081726] border border-[#163852] rounded-xl text-xs shadow-xs"
      >
        {/* Left: Status Symbol */}
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg bg-[#0b2133] border ${tierInfo.borderColor} flex items-center justify-center ${tierInfo.accentColor} shadow-inner`}>
            {getTierIcon(currentTier, 'w-4 h-4')}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">Status Symbol:</span>
              <span className={`font-black text-xs ${tierInfo.accentColor}`}>{tierInfo.title}</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Tier: <strong className="text-white uppercase">{currentTier}</strong>
            </div>
          </div>
        </div>

        {/* Right: No Tilt Days Counter */}
        <div className="flex items-center gap-2 bg-[#05111c] border border-[#133047] px-3 py-1.5 rounded-lg">
          <Flame className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-xs font-black text-white font-mono">{noTiltDays}</span>
          <span className="text-[11px] font-bold text-sky-300 uppercase tracking-wider">No Tilt Days</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="prestige-status-symbol-hero"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071624] via-[#091e30] to-[#06121c] border-2 border-sky-400/40 p-4 sm:p-5 lg:p-6 shadow-xl space-y-4"
    >
      {/* Decorative background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Top Grid */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Trader's Official Status Symbol Emblem */}
        <div className="flex items-start sm:items-center gap-4">
          <div className="relative shrink-0">
            {/* Crest Emblem with glowing aura */}
            <div
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${tierInfo.bgGradient} border-2 ${tierInfo.borderColor} flex items-center justify-center ${tierInfo.accentColor} shadow-lg ${tierInfo.glowColor}`}
            >
              {getTierIcon(currentTier, 'w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2]')}
            </div>
            {/* Little checkmark seal */}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#061420] border border-sky-400 flex items-center justify-center text-sky-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-950/80 border border-sky-600/40 px-2.5 py-0.5 rounded-md">
                TRADER STATUS SYMBOL
              </span>
              <span className={`text-[10px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-md bg-[#081b2b] border ${tierInfo.borderColor} ${tierInfo.accentColor}`}>
                {tierInfo.badgeLabel}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
              {tierInfo.title}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
              {tierInfo.description}
            </p>
          </div>
        </div>

        {/* Right: NO TILT DAYS Prominent Status Widget */}
        <div className="shrink-0 flex items-center sm:self-center">
          <div
            id="no-tilt-days-counter-card"
            className="w-full sm:w-auto p-4 rounded-xl bg-gradient-to-b from-[#0b2133] to-[#071522] border-2 border-sky-400/60 shadow-lg shadow-sky-950/50 space-y-1 min-w-[200px]"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#14334a] pb-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-sky-300">
                <Flame className="w-3.5 h-3.5 text-sky-400" />
                <span>CLEAN TRADING RECORD</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            </div>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {noTiltDays}
              </span>
              <span className="text-sm sm:text-base font-black text-sky-300 uppercase tracking-tight">
                {noTiltDays === 1 ? 'NO TILT DAY' : 'NO TILT DAYS'}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-0.5">
              <span>Consecutive clean sessions:</span>
              <strong className="text-white font-mono">{noTiltDays}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Progress Bar: Road to Next Rank */}
      <div className="relative z-10 pt-3 border-t border-[#122e44] space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-slate-200">
              {isMaxTier
                ? 'Apex Discipline Achieved: Diamond Master (90+ Days)'
                : nextTier
                ? `Next Status Unlock: ${nextTier.title} (${nextTier.subtitle})`
                : 'Current Status Validated'}
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {isMaxTier ? (
              <span className="text-cyan-300 font-bold">Max Rank Unlocked</span>
            ) : (
              <span>
                <strong className="text-sky-300">{daysToNextTier}</strong> days needed to rank up ({progressPercent}% complete)
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-[#05111a] border border-[#143247] h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400`}
            style={{ width: `${Math.max(5, Math.min(100, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
          <span>{tierInfo.badgeLabel} tier requires: {tierInfo.minDays}+ Days</span>
          <span className="text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Tiers are locked status symbols earned by logging tilt-free days</span>
          </span>
          <span>{nextTier ? `Next tier (${nextTier.badgeLabel}) requires: ${nextTier.minDays}+ Days` : 'Master Level'}</span>
        </div>
      </div>
    </div>
  );
};
