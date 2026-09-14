import React, { useState } from 'react';
import {
  Calendar,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ArrowRight,
  PenLine,
  Sparkles,
  Flame,
  Check,
  Clock,
} from 'lucide-react';
import { AppState, DailyScoreRecord } from '../types';
import { FEEL_SCALE, DEFAULT_SCOREBOARD_TALLY } from '../utils/initialData';
import { getESTDate } from '../utils/dailyRollover';

interface SessionTallyViewProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  onGoToCheckIn: () => void;
}

export const SessionTallyView: React.FC<SessionTallyViewProps> = ({
  state,
  onUpdateState,
  onGoToCheckIn,
}) => {
  const todayStr = getESTDate().dateStr;
  const scoreboard = state.dailyScoreboard || [];

  // Quick stats
  const totalDays = scoreboard.length;
  const cleanDays = scoreboard.filter((s) => s.isCleanDay || s.sessionOutcome === 'clean').length;
  const avgFeel =
    totalDays > 0
      ? (scoreboard.reduce((acc, s) => acc + (s.feelLevel || 5), 0) / totalDays).toFixed(1)
      : '5.0';

  const todayRecord = scoreboard.find((s) => s.date === todayStr);

  // Quick outcome editor for any item
  const [editingId, setEditingId] = useState<string | null>(null);
  const [outcomeSelect, setOutcomeSelect] = useState<'clean' | 'minor_slip' | 'tilted'>('clean');
  const [reflectionInput, setReflectionInput] = useState('');

  const handleStartEditOutcome = (record: DailyScoreRecord) => {
    setEditingId(record.id);
    setOutcomeSelect((record.sessionOutcome as 'clean' | 'minor_slip' | 'tilted') || 'clean');
    setReflectionInput(record.sessionReflection || record.walkOutNotes || '');
  };

  const handleSaveEditedOutcome = (recordId: string) => {
    onUpdateState((prev) => {
      const list = prev.dailyScoreboard || [];
      const isClean = outcomeSelect === 'clean';
      const updated = list.map((item) => {
        if (item.id === recordId) {
          return {
            ...item,
            sessionOutcome: outcomeSelect,
            sessionReflection: reflectionInput.trim(),
            isCleanDay: isClean,
            status: isClean ? ('clean' as const) : ('tilted' as const),
          };
        }
        return item;
      });

      return {
        ...prev,
        dailyScoreboard: updated,
        cleanStreak: isClean ? prev.cleanStreak : prev.cleanStreak,
      };
    });
    setEditingId(null);
  };

  const handleDeleteRecord = (recordId: string) => {
    if (window.confirm('Remove this session record?')) {
      onUpdateState((prev) => {
        const list = prev.dailyScoreboard || [];
        return {
          ...prev,
          dailyScoreboard: list.filter((item) => item.id !== recordId),
        };
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header */}
      <div className="bg-[#0b161b] border border-[#162b34] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Basic Session Tally
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Daily Mood & Session Tally
          </h1>
          <p className="text-xs text-slate-400">
            A clean, simple log tracking daily mood answers and session discipline outcomes.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToCheckIn}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <PenLine className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{todayRecord ? 'Update Today’s Check-In' : 'Start Today’s Check-In'}</span>
        </button>
      </div>

      {/* 3 Basic Tally Metrics (Clean, straightforward, no heavy overhead) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Clean Streak */}
        <div className="p-4 bg-[#0b161b] border border-[#162b34] rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Clean Streak
            </div>
            <div className="text-xl font-black text-white">
              {state.cleanStreak} {state.cleanStreak === 1 ? 'Day' : 'Days'}
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold">
              Disciplined sessions
            </div>
          </div>
        </div>

        {/* Average Mindset */}
        <div className="p-4 bg-[#0b161b] border border-[#162b34] rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Average Mood
            </div>
            <div className="text-xl font-black text-white">
              {avgFeel} / 10
            </div>
            <div className="text-[11px] text-teal-300 font-semibold">
              Target baseline: 5 (Cucumber 🥒)
            </div>
          </div>
        </div>

        {/* Total Sessions Recorded */}
        <div className="p-4 bg-[#0b161b] border border-[#162b34] rounded-2xl flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Total Logged
            </div>
            <div className="text-xl font-black text-white">
              {totalDays} {totalDays === 1 ? 'Session' : 'Sessions'}
            </div>
            <div className="text-[11px] text-slate-400 font-semibold">
              {cleanDays} clean disciplined outcomes
            </div>
          </div>
        </div>
      </div>

      {/* Today's Quick Status Box */}
      <div className="bg-[#0b161b] border border-[#162b34] rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#142630] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-black text-white uppercase tracking-wider">
              Today's Session Status
            </span>
          </div>

          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        {todayRecord ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-bold text-white">
                <span>Mood: Level {todayRecord.feelLevel}/10</span>
                {todayRecord.feelLevel === 5 && <span>🥒 Cool as a Cucumber</span>}
                <span className="text-slate-500">&bull;</span>
                <span className="text-slate-300">{todayRecord.sleepQuality || 'Rested'}</span>
              </div>
              <p className="text-slate-400">
                Rule: <strong className="text-emerald-300">{todayRecord.focusIntention || 'Follow verified plan'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-lg font-bold text-xs uppercase tracking-wider ${
                  todayRecord.sessionOutcome === 'clean'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : todayRecord.sessionOutcome === 'minor_slip'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : todayRecord.sessionOutcome === 'tilted'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-[#12252e] text-slate-300 border border-[#1b3644]'
                }`}
              >
                {todayRecord.sessionOutcome === 'clean'
                  ? '🟢 Clean Session'
                  : todayRecord.sessionOutcome === 'minor_slip'
                  ? '🟡 Minor Slip'
                  : todayRecord.sessionOutcome === 'tilted'
                  ? '🔴 Tilted'
                  : '⏳ In Progress'}
              </span>

              <button
                type="button"
                onClick={onGoToCheckIn}
                className="px-3 py-1 bg-[#122830] hover:bg-[#183642] text-emerald-300 border border-emerald-500/30 rounded-lg font-bold cursor-pointer transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
            <p className="text-xs text-slate-400">
              No check-in logged yet for today. Take 60 seconds to calibrate before your session starts.
            </p>
            <button
              type="button"
              onClick={onGoToCheckIn}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl transition-all cursor-pointer shrink-0"
            >
              Start Check-In →
            </button>
          </div>
        )}
      </div>

      {/* SESSION TALLY LIST (Plain, clean, and straightforward) */}
      <div className="bg-[#0b161b] border border-[#162b34] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#142630] pb-3">
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Daily Session History
            </h2>
            <p className="text-xs text-slate-400">
              Chronological log of mood ratings, focus rules, and discipline outcomes.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-bold">
            {scoreboard.length} {scoreboard.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {scoreboard.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No session tally entries yet. Complete a daily check-in to begin your streak.
          </div>
        ) : (
          <div className="space-y-3">
            {scoreboard.map((record) => {
              const isEditingThis = editingId === record.id;
              const feelObj = FEEL_SCALE.find((f) => f.level === record.feelLevel);

              return (
                <div
                  key={record.id}
                  className="p-4 bg-[#081317] border border-[#142732] hover:border-[#1c3846] rounded-xl space-y-3 transition-all"
                >
                  {/* Row Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-black text-white">
                        {record.dayLabel || record.date}
                      </span>

                      {/* Mood Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                          record.feelLevel === 5
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : record.feelLevel >= 6 && record.feelLevel <= 7
                            ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                            : record.feelLevel >= 8
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        <span>Level {record.feelLevel}/10</span>
                        {record.feelLevel === 5 && <span>🥒</span>}
                        <span className="text-[10px] opacity-80 hidden sm:inline">
                          ({feelObj?.title.split('&')[0].trim() || 'Baseline'})
                        </span>
                      </span>

                      {/* Sleep Tag */}
                      {record.sleepQuality && (
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          &bull; {record.sleepQuality}
                        </span>
                      )}
                    </div>

                    {/* Outcome Status Badge & Actions */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                          record.sessionOutcome === 'clean' || record.isCleanDay
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : record.sessionOutcome === 'minor_slip'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : record.sessionOutcome === 'tilted'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {record.sessionOutcome === 'clean' || record.isCleanDay
                          ? 'Clean Day'
                          : record.sessionOutcome === 'minor_slip'
                          ? 'Minor Slip'
                          : record.sessionOutcome === 'tilted'
                          ? 'Tilted'
                          : 'Pending'}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleStartEditOutcome(record)}
                        className="p-1 text-slate-400 hover:text-emerald-300 rounded cursor-pointer"
                        title="Edit outcome"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(record.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Focus Intention & Notes */}
                  <div className="text-xs space-y-1 text-slate-300 pt-0.5">
                    {record.focusIntention && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-slate-500 font-bold shrink-0">Focus:</span>
                        <span className="text-emerald-300 font-medium">
                          {record.focusIntention}
                        </span>
                      </div>
                    )}

                    {record.morningNotes && (
                      <div className="text-slate-400 text-[11px] italic">
                        "{record.morningNotes}"
                      </div>
                    )}

                    {record.sessionReflection && (
                      <div className="flex items-start gap-1.5 text-slate-300 pt-0.5">
                        <span className="text-slate-500 font-bold shrink-0">Reflection:</span>
                        <span>{record.sessionReflection}</span>
                      </div>
                    )}
                  </div>

                  {/* Inline Outcome Editor */}
                  {isEditingThis && (
                    <div className="p-3 bg-[#0c1a21] border border-[#183644] rounded-xl space-y-2.5 animate-in fade-in-50">
                      <div className="text-[11px] font-bold text-white">
                        Update Session Outcome:
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setOutcomeSelect('clean')}
                          className={`p-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            outcomeSelect === 'clean'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                              : 'bg-[#081317] border-[#142631] text-slate-400'
                          }`}
                        >
                          🟢 Clean
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutcomeSelect('minor_slip')}
                          className={`p-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            outcomeSelect === 'minor_slip'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                              : 'bg-[#081317] border-[#142631] text-slate-400'
                          }`}
                        >
                          🟡 Minor Slip
                        </button>
                        <button
                          type="button"
                          onClick={() => setOutcomeSelect('tilted')}
                          className={`p-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                            outcomeSelect === 'tilted'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-400'
                              : 'bg-[#081317] border-[#142631] text-slate-400'
                          }`}
                        >
                          🔴 Tilted
                        </button>
                      </div>

                      <input
                        type="text"
                        value={reflectionInput}
                        onChange={(e) => setReflectionInput(e.target.value)}
                        placeholder="Session notes / reflection..."
                        className="w-full bg-[#071115] border border-[#142831] text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                      />

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2.5 py-1 bg-[#091519] text-slate-400 hover:text-white rounded text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEditedOutcome(record.id)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
