import React from 'react';
import { Shield, Check, Calendar, RotateCcw } from 'lucide-react';
import { AppState } from '../types';
import { FEEL_SCALE } from '../utils/initialData';

interface TrackerViewProps {
  state: AppState;
  onUpdateEmotionalTracker: (data: AppState['emotionalTracker']) => void;
  onUpdateState?: (updater: (prev: AppState) => AppState) => void;
  onGoToSession?: () => void;
  onCleanSlate?: () => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  state,
  onUpdateEmotionalTracker,
  onUpdateState,
  onGoToSession,
  onCleanSlate,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const selectedFeel = state?.emotionalTracker?.feelLevel;
  const walkOutStatus = state?.emotionalTracker?.walkOutStatus;

  const handleSelectFeel = (level: number) => {
    const baseTracker = state?.emotionalTracker || {
      feelLevel: null,
      sleepLevel: null,
      sleepQuality: '',
      focusIntention: '',
      triggersDistractions: '',
      walkOutNotes: '',
      morningNotes: '',
      updatedAt: '',
      morningCheckInDate: '',
      morningCheckInCompleted: false,
      sessionOutcome: 'pending',
      sessionReflection: '',
    };

    onUpdateEmotionalTracker({
      ...baseTracker,
      feelLevel: level,
      morningCheckInCompleted: true,
      morningCheckInDate: todayStr,
    });

    if (onUpdateState) {
      onUpdateState((prev) => {
        // Also sync to today's scoreboard record if exists or prepend
        const list = prev.dailyScoreboard || [];
        const existingIndex = list.findIndex((r) => r.date === todayStr);
        const feelItem = FEEL_SCALE.find((f) => f.level === level);

        if (existingIndex >= 0) {
          const updated = [...list];
          updated[existingIndex] = {
            ...updated[existingIndex],
            feelLevel: level,
            morningNotes: feelItem?.title || '',
          };
          return { ...prev, dailyScoreboard: updated };
        } else {
          const newRecord = {
            id: `sb-${Date.now()}`,
            date: todayStr,
            dayLabel: 'Today',
            feelLevel: level,
            sleepLevel: 8,
            morningNotes: feelItem?.title || '',
            walkOutNotes: '',
            dailyProcessScore: 95,
            emotionalConsistencyPercent: 100,
            ruleAdherencePercent: 100,
            tradesCount: prev.trades.length,
            plannedTradesCount: prev.trades.length,
            unplannedTradesCount: 0,
            wellManagedExitsCount: prev.trades.length,
            emotionalExitsCount: 0,
            pnl: 0,
            isCleanDay: prev.tiltScore === 0,
            status: prev.tiltScore === 0 ? ('clean' as const) : ('tilted' as const),
          };
          return { ...prev, dailyScoreboard: [newRecord, ...list] };
        }
      });
    }
  };

  const handleSelectWalkOut = (status: 'disciplined' | 'minor_slip' | 'tilted') => {
    onUpdateEmotionalTracker({
      ...state.emotionalTracker,
      walkOutStatus: status,
    });

    if (onUpdateState) {
      onUpdateState((prev) => {
        const isClean = status === 'disciplined';
        const list = prev.dailyScoreboard || [];
        const existingIndex = list.findIndex((r) => r.date === todayStr);

        if (existingIndex >= 0) {
          const updated = [...list];
          updated[existingIndex] = {
            ...updated[existingIndex],
            isCleanDay: isClean,
            status: isClean ? 'clean' : 'tilted',
            walkOutNotes:
              status === 'disciplined'
                ? 'Disciplined. Process followed.'
                : status === 'minor_slip'
                ? 'Minor rule slip.'
                : 'Tilted / Revenge trade.',
          };
          return {
            ...prev,
            dailyScoreboard: updated,
            cleanStreak: isClean ? prev.cleanStreak + 1 : 0,
          };
        }
        return prev;
      });
    }
  };

  // Color mapping for badge circles
  const getBadgeStyle = (lvl: number, isSelected: boolean) => {
    switch (lvl) {
      case 1:
      case 2:
        return isSelected
          ? 'border-rose-500 bg-rose-500 text-white shadow-xs'
          : 'border-rose-600/60 text-rose-400 bg-[#160b0e]';
      case 3:
        return isSelected
          ? 'border-orange-500 bg-orange-500 text-black shadow-xs'
          : 'border-orange-500/60 text-orange-400 bg-[#170e0a]';
      case 4:
        return isSelected
          ? 'border-amber-500 bg-amber-500 text-black shadow-xs'
          : 'border-amber-500/60 text-amber-300 bg-[#16120a]';
      case 5:
        return isSelected
          ? 'border-emerald-400 bg-emerald-400 text-black shadow-xs ring-2 ring-emerald-500/40'
          : 'border-emerald-400/80 text-emerald-300 bg-[#0a1813]';
      case 6:
        return isSelected
          ? 'border-emerald-500 bg-emerald-500 text-black shadow-xs'
          : 'border-emerald-500/60 text-emerald-400 bg-[#0a1712]';
      case 7:
        return isSelected
          ? 'border-teal-400 bg-teal-400 text-black shadow-xs'
          : 'border-teal-500/60 text-teal-300 bg-[#0a1716]';
      case 8:
        return isSelected
          ? 'border-amber-500 bg-amber-500 text-black shadow-xs'
          : 'border-amber-500/60 text-amber-400 bg-[#171009]';
      case 9:
      case 10:
        return isSelected
          ? 'border-rose-600 bg-rose-600 text-white shadow-xs'
          : 'border-rose-600/70 text-rose-400 bg-[#18090d]';
      default:
        return 'border-slate-600 text-slate-300 bg-[#0e171b]';
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-4xl mx-auto space-y-6 select-none">
      {/* Header with Day Badge & Reset Option */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Emotional tracker
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-[#102934] border border-emerald-500/40 text-emerald-300 text-xs font-mono font-black">
              Day {state.dayCounter || 1}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Morning feel. Call it a day: how you walked out.
          </p>
        </div>

        {onCleanSlate && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset tracker and all session tallies back to initial Day 1 blank state?')) {
                onCleanSlate();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#140c10] border border-rose-900/50 hover:border-rose-700/80 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-xs"
            title="Reset to Day 1 Blank State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clean Slate Reset</span>
          </button>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
        {/* Section Label: FEEL */}
        <div>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
            FEEL
          </div>

          {/* 10 Vertical Level Rows */}
          <div className="space-y-2">
            {FEEL_SCALE.map((item) => {
              const isSelected = selectedFeel === item.level;
              const badgeStyle = getBadgeStyle(item.level, isSelected);

              return (
                <div
                  key={item.level}
                  onClick={() => handleSelectFeel(item.level)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#10242e] border-emerald-500/50 shadow-xs'
                      : 'bg-[#081317] border-[#13252f] hover:bg-[#0d1e25] hover:border-[#1a3745]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Number Badge */}
                    <div
                      className={`w-6 h-6 rounded-full border text-xs font-black flex items-center justify-center shrink-0 transition-transform ${badgeStyle}`}
                    >
                      {item.level}
                    </div>

                    {/* Text Label from Video */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}
                      >
                        {item.title}
                      </span>
                      {item.level === 5 && (
                        <span className="text-xs" title="Cool as a Cucumber">
                          🥒
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Status */}
                  <div className="flex items-center gap-2">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span className="hidden sm:inline">Selected</span>
                      </span>
                    ) : item.level === 5 ? (
                      <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-wider hidden sm:inline">
                        Target
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* End of Day Stamp - Matching Video Bottom */}
        <div className="pt-4 border-t border-[#142630] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-400 font-medium">
              End-of-day stamp. Close only updates how you walked out.
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 self-end sm:self-auto">
              {todayStr}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectWalkOut('disciplined')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'disciplined'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Disciplined. Process followed</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectWalkOut('minor_slip')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'minor_slip'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Minor rule slip</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectWalkOut('tilted')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'tilted'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Tilted / Revenge trade</span>
            </button>
          </div>
        </div>
      </div>

      {/* Clean Daily Session Tally */}
      <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#142630] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <span>Daily Session Tally</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                Clean Streak: {state.cleanStreak}d
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              History of daily mindset baseline check-ins, rule execution, and walk-out outcomes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Total Logged: <strong className="text-white">{(state.dailyScoreboard || []).length}</strong>
            </span>
          </div>
        </div>

        {/* Tally Rows */}
        <div className="space-y-2">
          {(state.dailyScoreboard || []).length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Day 1 Clean Slate. No daily session records logged yet. Your morning check-in and end-of-day walkout will tally here.
            </div>
          ) : (
            (state.dailyScoreboard || []).map((row) => {
              const feelItem = FEEL_SCALE.find((f) => f.level === row.feelLevel);
              const isClean = row.isCleanDay;
              const isAnchor = row.feelLevel === 5;

              return (
                <div
                  key={row.id}
                  className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isClean
                      ? 'bg-[#08151b] border-[#142934] hover:border-[#1e3c4c]'
                      : 'bg-[#150d10] border-rose-950/70 hover:border-rose-900/80'
                  }`}
                >
                  {/* Left: Date & Mood Baseline */}
                  <div className="flex items-center gap-3">
                    <div className="text-left min-w-[90px]">
                      <div className="text-xs font-black text-white">
                        {row.dayLabel || row.date}
                      </div>
                      <div className="text-[10px] font-mono text-slate-500">
                        {row.date}
                      </div>
                    </div>

                    {/* Mood Baseline Badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0b1d26] border border-[#163546]">
                      <span className="text-xs font-black text-emerald-400">
                        Lvl {row.feelLevel}
                      </span>
                      {isAnchor ? (
                        <span className="text-xs" title="Cool as a Cucumber">🥒</span>
                      ) : (
                        <span className="text-[10px] text-slate-300 font-medium truncate max-w-[120px]">
                          {feelItem?.title || 'Baseline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Notes / Walkout Outcome */}
                  <div className="flex-1 text-xs text-slate-300 min-w-0">
                    <div className="truncate font-medium text-[11px] text-slate-300">
                      {row.walkOutNotes || row.morningNotes || (isClean ? 'Disciplined session' : 'Rule slip')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {row.tradesCount} trade{row.tradesCount === 1 ? '' : 's'} &bull; {row.plannedTradesCount} planned
                      {row.unplannedTradesCount > 0 && (
                        <span className="text-rose-400 ml-1">&bull; {row.unplannedTradesCount} unplanned</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Clean / Tilted Badge */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        isClean
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isClean ? 'Clean Day ✓' : 'Tilted ✗'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {row.dailyProcessScore}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick link back to trading */}
      {onGoToSession && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onGoToSession}
            className="px-4 py-2 bg-[#0b161b] hover:bg-[#12242c] text-emerald-300 text-xs font-bold border border-emerald-500/30 rounded-xl transition-all cursor-pointer"
          >
            ← Back to Session & Trade
          </button>
        </div>
      )}
    </div>
  );
};
