import React, { useState } from 'react';
import { Shield, Check, Calendar, RotateCcw, HeartPulse, Sparkles, Moon, Sun, PenLine, Smile, HelpCircle } from 'lucide-react';
import { AppState, DailyScoreRecord } from '../types';
import { FEEL_SCALE, SLEEP_SCALE } from '../utils/initialData';

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
  const [morningNotesDraft, setMorningNotesDraft] = useState<string>(
    state?.emotionalTracker?.morningNotes || ''
  );
  const [selectedSleep, setSelectedSleep] = useState<number>(
    state?.emotionalTracker?.sleepLevel ?? 8
  );

  const handleSelectFeel = (level: number) => {
    const baseTracker = state?.emotionalTracker || {
      feelLevel: null,
      sleepLevel: 8,
      sleepQuality: 'Well Rested',
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

    const feelItem = FEEL_SCALE.find((f) => f.level === level);
    const feelDeviation = Math.abs(level - 5);
    const emoScore = Math.max(40, 100 - feelDeviation * 12);

    onUpdateEmotionalTracker({
      ...baseTracker,
      feelLevel: level,
      morningCheckInCompleted: true,
      morningCheckInDate: todayStr,
      updatedAt: todayStr,
    });

    if (onUpdateState) {
      onUpdateState((prev) => {
        const list = prev.dailyScoreboard || [];
        const existingIndex = list.findIndex((r) => r.date === todayStr);

        if (existingIndex >= 0) {
          const updated = [...list];
          updated[existingIndex] = {
            ...updated[existingIndex],
            feelLevel: level,
            emotionalConsistencyPercent: emoScore,
            morningNotes: morningNotesDraft.trim() || feelItem?.title || '',
          };
          return { ...prev, dailyScoreboard: updated };
        } else {
          const currentDayNum = prev.dayCounter || 1;
          const formattedDate = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const newRecord: DailyScoreRecord = {
            id: `sb-${Date.now()}`,
            date: todayStr,
            dayLabel: `Day ${currentDayNum} (${formattedDate})`,
            feelLevel: level,
            sleepLevel: selectedSleep,
            morningNotes: morningNotesDraft.trim() || feelItem?.title || '',
            walkOutNotes: '',
            dailyProcessScore: Math.round(100 * 0.55 + emoScore * 0.45),
            emotionalConsistencyPercent: emoScore,
            ruleAdherencePercent: 100,
            tradesCount: prev.trades.length,
            plannedTradesCount: prev.trades.length,
            unplannedTradesCount: 0,
            wellManagedExitsCount: prev.trades.length,
            emotionalExitsCount: 0,
            pnl: 0,
            isCleanDay: true,
            status: 'clean',
          };
          return { ...prev, dailyScoreboard: [newRecord, ...list] };
        }
      });
    }
  };

  const handleSaveMorningNotes = () => {
    onUpdateEmotionalTracker({
      ...state.emotionalTracker,
      morningNotes: morningNotesDraft.trim(),
      sleepLevel: selectedSleep,
      updatedAt: todayStr,
    });

    if (onUpdateState) {
      onUpdateState((prev) => {
        const list = prev.dailyScoreboard || [];
        const existingIndex = list.findIndex((r) => r.date === todayStr);
        if (existingIndex >= 0) {
          const updated = [...list];
          updated[existingIndex] = {
            ...updated[existingIndex],
            morningNotes: morningNotesDraft.trim(),
            sleepLevel: selectedSleep,
          };
          return { ...prev, dailyScoreboard: updated };
        }
        return prev;
      });
    }
  };

  const handleSelectWalkOut = (status: 'disciplined' | 'minor_slip' | 'tilted') => {
    onUpdateEmotionalTracker({
      ...state.emotionalTracker,
      walkOutStatus: status,
      updatedAt: todayStr,
    });

    if (onUpdateState) {
      onUpdateState((prev) => {
        const list = prev.dailyScoreboard || [];
        const existingIndex = list.findIndex((r) => r.date === todayStr);

        if (existingIndex >= 0) {
          const updated = [...list];
          updated[existingIndex] = {
            ...updated[existingIndex],
            sessionOutcome: status === 'disciplined' ? ('clean' as const) : status,
            walkOutNotes:
              status === 'disciplined'
                ? 'Disciplined session. Followed trade rules.'
                : status === 'minor_slip'
                ? 'Minor rule slip noted.'
                : 'Tilted / Challenging session.',
          };
          return {
            ...prev,
            dailyScoreboard: updated,
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
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-400" />
              <span>Mood Tracker</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-md bg-[#102934] border border-emerald-500/40 text-emerald-300 text-xs font-mono font-black">
              Day {state.dayCounter || 1}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            Daily mindset baseline &amp; emotional reflection &bull; <span className="text-emerald-300 font-semibold">Separate from trade tilt &amp; streaks</span>
          </p>
        </div>

        {onCleanSlate && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Refresh Everything (Clean Slate)? This will reset your accounts, trades, scoreboard, and tilt streaks back to Day 1.')) {
                onCleanSlate();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#140c10] border border-rose-900/50 hover:border-rose-700/80 text-rose-300 hover:text-white text-xs font-bold transition-all cursor-pointer self-start sm:self-auto shadow-xs"
            title="Reset all accounts, trades, and streaks to Day 1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh Everything (Clean Slate)</span>
          </button>
        )}
      </div>

      {/* Mood Separation Notice Box */}
      <div className="p-3 bg-[#081822] border border-[#16384d] rounded-2xl flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-slate-300">
          <Smile className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Independent Psychological Tracking:</strong> Recording your honest emotional state (even if tired or frustrated) helps build self-awareness and does <span className="text-emerald-300 font-bold">not</span> penalize your trading tilt record or status ladder.
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 sm:p-6 space-y-5 shadow-xs">
        {/* Section Label: FEEL (1 - 10) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>MORNING EMOTIONAL BASELINE (FEEL)</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              Anchor 5: Cool as a Cucumber 🥒
            </span>
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
                      ? 'bg-[#10242e] border-emerald-500/50 shadow-xs ring-1 ring-emerald-400/40'
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

                    {/* Text Label */}
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
                        <span className="hidden sm:inline">Active Feel</span>
                      </span>
                    ) : item.level === 5 ? (
                      <span className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-wider hidden sm:inline">
                        Target Baseline
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Morning Mindset & Sleep Reflection */}
        <div className="pt-4 border-t border-[#142630] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <PenLine className="w-3.5 h-3.5 text-cyan-400" />
              <span>Daily Mindset &amp; Sleep Notes</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {todayStr}
            </span>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={morningNotesDraft}
              onChange={(e) => setMorningNotesDraft(e.target.value)}
              placeholder="e.g. Slept 8 hrs, feeling calm, focused on waiting for high-conviction 15m levels..."
              className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-emerald-500"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveMorningNotes}
                className="px-3 py-1 bg-[#10242e] hover:bg-[#163442] text-emerald-300 text-xs font-bold border border-emerald-500/40 rounded-lg transition-all cursor-pointer"
              >
                Save Mindset Note
              </button>
            </div>
          </div>
        </div>

        {/* End of Day Emotional State */}
        <div className="pt-4 border-t border-[#142630] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-teal-400" />
              <span>End-of-day reflection: How you walked out emotionally</span>
            </span>
            <span className="text-[10px] text-slate-500">
              Self-awareness log
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectWalkOut('disciplined')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'disciplined'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-xs ring-1 ring-emerald-400/40'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Calm &amp; Disciplined</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectWalkOut('minor_slip')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'minor_slip'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs ring-1 ring-amber-400/40'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Slightly Off / Tense</span>
            </button>

            <button
              type="button"
              onClick={() => handleSelectWalkOut('tilted')}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                walkOutStatus === 'tilted'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs ring-1 ring-rose-400/40'
                  : 'bg-[#081216] border-[#142831] text-slate-400 hover:text-white hover:bg-[#0e1b21]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Frustrated / Overstimulated</span>
            </button>
          </div>
        </div>
      </div>

      {/* Daily Mood & Mindset History Log */}
      <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#142630] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Daily Mood &amp; Mindset History</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical record of morning mindset ratings and daily reflections.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">
              Total Logged: <strong className="text-white">{(state.dailyScoreboard || []).length}</strong>
            </span>
          </div>
        </div>

        {/* Mood History Rows */}
        <div className="space-y-2">
          {(state.dailyScoreboard || []).length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              Day 1 Clean Slate. No daily mood check-ins logged yet. Your ratings and notes will tally here.
            </div>
          ) : (
            (state.dailyScoreboard || []).map((row) => {
              const feelItem = FEEL_SCALE.find((f) => f.level === row.feelLevel);
              const isAnchor = row.feelLevel === 5;

              return (
                <div
                  key={row.id}
                  className="p-3 rounded-xl border bg-[#08151b] border-[#142934] hover:border-[#1e3c4c] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                        <span className="text-[10px] text-slate-300 font-medium truncate max-w-[130px]">
                          {feelItem?.title || 'Baseline'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Mindset & Reflection */}
                  <div className="flex-1 text-xs text-slate-300 min-w-0">
                    <div className="truncate font-medium text-[11px] text-slate-200">
                      {row.morningNotes || feelItem?.title || 'Check-in recorded'}
                    </div>
                    {row.walkOutNotes && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Walkout: {row.walkOutNotes}
                      </div>
                    )}
                  </div>

                  {/* Right: Emotional Consistency */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-[#0e2430] border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                      {row.emotionalConsistencyPercent || 100}% Consistency
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
            ← Back to Session &amp; Trade
          </button>
        </div>
      )}
    </div>
  );
};
