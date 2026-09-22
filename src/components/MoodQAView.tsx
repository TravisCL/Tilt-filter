import React, { useState, useEffect } from 'react';
import {
  Activity,
  Moon,
  Compass,
  ShieldAlert,
  Check,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react';
import { AppState, DailyScoreRecord } from '../types';
import { FEEL_SCALE, DEFAULT_SCOREBOARD_TALLY, isMorningCheckInCompleted } from '../utils/initialData';

interface MoodQAViewProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  onGoToTally: () => void;
}

const SLEEP_OPTIONS = [
  {
    id: 'rested',
    title: 'Well Rested',
    subtitle: '7–9 hrs deep rest',
    description: 'High mental clarity, optimal patience and reaction time.',
    icon: '😴',
    level: 8,
  },
  {
    id: 'adequate',
    title: 'Adequate & Functional',
    subtitle: '6–7 hrs normal sleep',
    description: 'Good baseline energy. Steady discipline required.',
    icon: '☕',
    level: 6,
  },
  {
    id: 'broken',
    title: 'Light or Interrupted',
    subtitle: 'Short or broken sleep',
    description: 'Slight fatigue. Watch for early impatience or FOMO.',
    icon: '🥱',
    level: 4,
  },
  {
    id: 'exhausted',
    title: 'Low Sleep / Exhausted',
    subtitle: '<5 hrs / restless',
    description: 'High tilt risk. Recommend strict sizing or simulator.',
    icon: '⚡',
    level: 2,
  },
];

const PRESET_RULES = [
  'Wait for confirmed A+ setup confluence',
  'Honor stop-loss immediately without debate',
  'Zero revenge trades or chasing candles',
  'Process over P&L — execute like a machine',
  'Walk away after 2 executed setups',
];

const DISTRACTION_OPTIONS = [
  {
    id: 'clear',
    title: 'Clear Mind & Calm Space',
    subtitle: 'Zero notable distractions or hurry',
    icon: '🛡️',
  },
  {
    id: 'rushed',
    title: 'Time Pressure / Rushed',
    subtitle: 'Temptation to force a move before leaving',
    icon: '⏳',
  },
  {
    id: 'past_loss',
    title: 'Frustration from Past Days',
    subtitle: 'Urge to get back to breakeven quickly',
    icon: '📉',
  },
  {
    id: 'distracted',
    title: 'External Restlessness / Noise',
    subtitle: 'Scattered focus, phone or environment noise',
    icon: '📱',
  },
];

export const MoodQAView: React.FC<MoodQAViewProps> = ({
  state,
  onUpdateState,
  onGoToTally,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const isCheckedInToday = isMorningCheckInCompleted(state?.emotionalTracker, todayStr);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedFeel, setSelectedFeel] = useState<number>(
    state?.emotionalTracker?.feelLevel ?? 5
  );
  const [selectedSleep, setSelectedSleep] = useState<string>(
    state?.emotionalTracker?.sleepQuality || 'Well Rested'
  );
  const [sleepNote, setSleepNote] = useState<string>(
    state?.emotionalTracker?.morningNotes || ''
  );
  const [selectedFocusRule, setSelectedFocusRule] = useState<string>(
    state?.emotionalTracker?.focusIntention || PRESET_RULES[0]
  );
  const [customFocusRule, setCustomFocusRule] = useState<string>('');
  const [selectedTrigger, setSelectedTrigger] = useState<string>(
    state?.emotionalTracker?.triggersDistractions || DISTRACTION_OPTIONS[0].title
  );
  const [triggerNote, setTriggerNote] = useState<string>('');

  // Outcome wrap-up state
  const [sessionOutcome, setSessionOutcome] = useState<'clean' | 'minor_slip' | 'tilted'>(
    (state?.emotionalTracker?.sessionOutcome as 'clean' | 'minor_slip' | 'tilted') || 'clean'
  );
  const [reflectionNote, setReflectionNote] = useState<string>(
    state?.emotionalTracker?.sessionReflection || ''
  );
  const [outcomeSavedMessage, setOutcomeSavedMessage] = useState(false);

  // Sync wizard state with incoming state updates (e.g. from popped-out window)
  useEffect(() => {
    if (state?.emotionalTracker?.feelLevel !== null && state?.emotionalTracker?.feelLevel !== undefined) {
      setSelectedFeel(state.emotionalTracker.feelLevel);
    }
    if (state?.emotionalTracker?.sleepQuality) {
      setSelectedSleep(state.emotionalTracker.sleepQuality);
    }
    if (state?.emotionalTracker?.morningNotes !== undefined) {
      setSleepNote(state.emotionalTracker.morningNotes || '');
    }
    if (state?.emotionalTracker?.focusIntention) {
      setSelectedFocusRule(state.emotionalTracker.focusIntention);
    }
    if (state?.emotionalTracker?.triggersDistractions) {
      setSelectedTrigger(state.emotionalTracker.triggersDistractions);
    }
    if (state?.emotionalTracker?.sessionOutcome) {
      setSessionOutcome(state.emotionalTracker.sessionOutcome as 'clean' | 'minor_slip' | 'tilted');
    }
    if (state?.emotionalTracker?.sessionReflection !== undefined) {
      setReflectionNote(state.emotionalTracker.sessionReflection || '');
    }
  }, [state?.emotionalTracker]);

  const selectedFeelItem =
    FEEL_SCALE.find((f) => f.level === selectedFeel) || FEEL_SCALE[4];

  // Save the complete check-in
  const handleCompleteCheckIn = () => {
    const finalFocus = customFocusRule.trim() || selectedFocusRule;
    const finalSleepRating =
      SLEEP_OPTIONS.find((s) => s.title === selectedSleep)?.level || 7;

    const feelDist = Math.abs(selectedFeel - 5);
    const emotionalScore = Math.max(40, 100 - feelDist * 12);
    const dailyProcess = Math.round(100 * 0.55 + emotionalScore * 0.45);

    onUpdateState((prev) => {
      const existingScoreboard = prev.dailyScoreboard || DEFAULT_SCOREBOARD_TALLY;
      const todayIndex = existingScoreboard.findIndex((s) => s.date === todayStr);

      const updatedRecord: DailyScoreRecord = {
        id: todayIndex >= 0 ? existingScoreboard[todayIndex].id : `sb-${Date.now()}`,
        date: todayStr,
        dayLabel: dayName,
        feelLevel: selectedFeel,
        sleepLevel: finalSleepRating,
        sleepQuality: selectedSleep,
        focusIntention: finalFocus,
        triggersDistractions: selectedTrigger,
        morningNotes: sleepNote.trim() || undefined,
        walkOutNotes: triggerNote.trim() || undefined,
        dailyProcessScore: dailyProcess,
        emotionalConsistencyPercent: emotionalScore,
        ruleAdherencePercent: 100,
        tradesCount: todayIndex >= 0 ? existingScoreboard[todayIndex].tradesCount : 0,
        plannedTradesCount: todayIndex >= 0 ? existingScoreboard[todayIndex].plannedTradesCount : 0,
        unplannedTradesCount: 0,
        wellManagedExitsCount: 0,
        emotionalExitsCount: 0,
        pnl: todayIndex >= 0 ? existingScoreboard[todayIndex].pnl : 0,
        isCleanDay: todayIndex >= 0 ? existingScoreboard[todayIndex].isCleanDay : true,
        status: todayIndex >= 0 ? existingScoreboard[todayIndex].status : 'active',
        sessionOutcome: prev.emotionalTracker.sessionOutcome || 'pending',
        sessionReflection: prev.emotionalTracker.sessionReflection || '',
      };

      let nextScoreboard = [...existingScoreboard];
      if (todayIndex >= 0) {
        nextScoreboard[todayIndex] = {
          ...nextScoreboard[todayIndex],
          ...updatedRecord,
        };
      } else {
        nextScoreboard = [updatedRecord, ...nextScoreboard];
      }

      return {
        ...prev,
        emotionalTracker: {
          ...prev.emotionalTracker,
          feelLevel: selectedFeel,
          sleepLevel: finalSleepRating,
          sleepQuality: selectedSleep,
          focusIntention: finalFocus,
          triggersDistractions: selectedTrigger,
          morningNotes: sleepNote.trim(),
          walkOutNotes: triggerNote.trim(),
          updatedAt: todayStr,
          morningCheckInDate: todayStr,
          morningCheckInCompleted: true,
        },
        dailyScoreboard: nextScoreboard,
      };
    });
  };

  // Save session wrap-up outcome
  const handleSaveSessionOutcome = () => {
    onUpdateState((prev) => {
      const existingScoreboard = prev.dailyScoreboard || DEFAULT_SCOREBOARD_TALLY;
      const todayIndex = existingScoreboard.findIndex((s) => s.date === todayStr);

      const isClean = sessionOutcome === 'clean';
      const newStreak = isClean ? Math.max(1, prev.cleanStreak + 1) : 0;

      let nextScoreboard = [...existingScoreboard];
      if (todayIndex >= 0) {
        nextScoreboard[todayIndex] = {
          ...nextScoreboard[todayIndex],
          sessionOutcome,
          sessionReflection: reflectionNote.trim(),
          isCleanDay: isClean,
          status: isClean ? 'clean' : 'tilted',
        };
      }

      return {
        ...prev,
        cleanStreak: newStreak,
        tiltScore: isClean ? 0 : prev.tiltScore + 1,
        emotionalTracker: {
          ...prev.emotionalTracker,
          sessionOutcome,
          sessionReflection: reflectionNote.trim(),
        },
        dailyScoreboard: nextScoreboard,
      };
    });

    setOutcomeSavedMessage(true);
    setTimeout(() => setOutcomeSavedMessage(false), 2500);
  };

  const handleRetake = () => {
    setCurrentStep(1);
    onUpdateState((prev) => ({
      ...prev,
      emotionalTracker: {
        ...prev.emotionalTracker,
        morningCheckInCompleted: false,
      },
    }));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-[var(--c-0b161b)] border border-[var(--c-162b34)] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
              Daily Mood Check-In
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Mindset & Emotional Baseline
          </h1>
          <p className="text-xs text-slate-400">
            A plain, step-by-step check-in to calibrate your mindset and stay disciplined.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 bg-[var(--c-081317)] border border-[var(--c-142631)] rounded-xl text-left">
            <div className="text-[10px] uppercase font-bold text-slate-400">Today</div>
            <div className="text-xs font-black text-white">{dayName}</div>
          </div>

          <button
            type="button"
            onClick={onGoToTally}
            className="px-3.5 py-2 bg-[var(--c-122830)] hover:bg-[var(--c-183642)] text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span>Session Tally</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* IF ALREADY CHECKED IN TODAY: Display Clean Summary & Wrap-up */}
      {isCheckedInToday ? (
        <div className="space-y-6 animate-in fade-in-50">
          {/* Summary Card */}
          <div className="bg-[var(--c-0b161b)] border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--c-142630)] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white">
                    Today's Check-In Logged
                  </h2>
                  <span className="text-[11px] text-emerald-300 font-semibold">
                    Calibrated and ready for a disciplined day
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRetake}
                className="px-3 py-1.5 bg-[var(--c-081317)] hover:bg-[var(--c-12252e)] text-slate-300 hover:text-white border border-[var(--c-162e3a)] rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Update Answers</span>
              </button>
            </div>

            {/* 4 Clean Answer Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Question 1 Answer */}
              <div className="p-3.5 bg-[var(--c-081317)] border border-[var(--c-142631)] rounded-xl space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Emotional Baseline</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-lg font-black text-white">
                    Level {state.emotionalTracker.feelLevel}/10
                  </span>
                  {state.emotionalTracker.feelLevel === 5 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      🥒 Cool as a Cucumber
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {selectedFeelItem.title}
                </p>
              </div>

              {/* Question 2 Answer */}
              <div className="p-3.5 bg-[var(--c-081317)] border border-[var(--c-142631)] rounded-xl space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Sleep & Rest</span>
                </div>
                <div className="text-sm font-black text-white pt-0.5">
                  {state.emotionalTracker.sleepQuality || 'Well Rested'}
                </div>
                {state.emotionalTracker.morningNotes && (
                  <p className="text-xs text-slate-400 italic truncate">
                    "{state.emotionalTracker.morningNotes}"
                  </p>
                )}
              </div>

              {/* Question 3 Answer */}
              <div className="p-3.5 bg-[var(--c-081317)] border border-[var(--c-142631)] rounded-xl space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>3. Primary Focus Rule</span>
                </div>
                <p className="text-xs font-bold text-emerald-300 pt-0.5 leading-relaxed">
                  {state.emotionalTracker.focusIntention || PRESET_RULES[0]}
                </p>
              </div>

              {/* Question 4 Answer */}
              <div className="p-3.5 bg-[var(--c-081317)] border border-[var(--c-142631)] rounded-xl space-y-1">
                <div className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-teal-400" />
                  <span>4. Trigger Guard</span>
                </div>
                <p className="text-xs font-bold text-slate-200 pt-0.5">
                  {state.emotionalTracker.triggersDistractions || 'Clear Mind & Calm Space'}
                </p>
                {state.emotionalTracker.walkOutNotes && (
                  <p className="text-xs text-slate-400 italic truncate">
                    "{state.emotionalTracker.walkOutNotes}"
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Simple Session Outcome Logger Card */}
          <div className="bg-[var(--c-0b161b)] border border-[var(--c-162b34)] rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[var(--c-142630)] pb-3">
              <div className="space-y-0.5">
                <h3 className="text-sm font-black text-white">
                  Session Wrap-Up & Outcome
                </h3>
                <p className="text-xs text-slate-400">
                  When you are done trading or working today, record how well you adhered to your process.
                </p>
              </div>

              {outcomeSavedMessage && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold animate-in fade-in">
                  Saved!
                </span>
              )}
            </div>

            {/* Outcome options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setSessionOutcome('clean')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionOutcome === 'clean'
                    ? 'bg-emerald-950/40 border-emerald-400 text-white ring-1 ring-emerald-400'
                    : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1e3b4a)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-300">
                    🟢 Disciplined / Clean
                  </span>
                  {sessionOutcome === 'clean' && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Honored all entry and exit rules, zero emotional trades.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSessionOutcome('minor_slip')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionOutcome === 'minor_slip'
                    ? 'bg-amber-950/40 border-amber-400 text-white ring-1 ring-amber-400'
                    : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1e3b4a)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300">
                    🟡 Minor Slip / Hesitation
                  </span>
                  {sessionOutcome === 'minor_slip' && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Felt mild impulse or hesitation, but recovered composure.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSessionOutcome('tilted')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  sessionOutcome === 'tilted'
                    ? 'bg-rose-950/40 border-rose-400 text-white ring-1 ring-rose-400'
                    : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1e3b4a)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-rose-300">
                    🔴 Tilted / Broke Rules
                  </span>
                  {sessionOutcome === 'tilted' && <Check className="w-4 h-4 text-rose-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Chased losses, oversized position, or revenge traded.
                </p>
              </button>
            </div>

            {/* Reflection note input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-300 block">
                Session Reflection Note (Optional)
              </label>
              <input
                type="text"
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                placeholder="e.g. Took only 1 clean trade, respected target, stepped away calmly..."
                className="w-full bg-[var(--c-081216)] border border-[var(--c-152a34)] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleSaveSessionOutcome}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Outcome to Session Tally</span>
              </button>

              <button
                type="button"
                onClick={onGoToTally}
                className="text-xs font-bold text-slate-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <span>View All Tallies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE STEP-BY-STEP Q&A FLOW */
        <div className="bg-[var(--c-0b161b)] border border-[var(--c-162b34)] rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
          {/* Step Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-400 uppercase tracking-wider">
                Question {currentStep} of 4
              </span>
              <span className="text-slate-400 font-medium">
                {currentStep === 1
                  ? 'Emotional Baseline'
                  : currentStep === 2
                  ? 'Sleep & Energy'
                  : currentStep === 3
                  ? 'Primary Focus Rule'
                  : 'Triggers & Distractions'}
              </span>
            </div>

            <div className="w-full bg-[var(--c-081317)] h-1.5 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              />
            </div>
          </div>

          {/* ================= STEP 1: EMOTIONAL STATE ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 1 &bull; Mindset
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  How are you feeling right now?
                </h2>
                <p className="text-xs text-slate-400">
                  Select your state on the 1–10 scale. Anchor 5 is{' '}
                  <strong className="text-emerald-300">Cool as a Cucumber 🥒</strong> (ideal baseline).
                </p>
              </div>

              {/* 10 Scale Buttons */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {FEEL_SCALE.map((item) => {
                  const isSelected = selectedFeel === item.level;
                  const isAnchor5 = item.level === 5;

                  return (
                    <button
                      key={item.level}
                      type="button"
                      onClick={() => setSelectedFeel(item.level)}
                      className={`h-13 rounded-xl font-black text-xs transition-all cursor-pointer flex flex-col items-center justify-center border relative ${
                        isSelected
                          ? isAnchor5
                            ? 'bg-emerald-500 text-black border-emerald-300 shadow-md ring-2 ring-emerald-400 scale-105'
                            : 'bg-[var(--c-153442)] text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/50 scale-105'
                          : isAnchor5
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:border-emerald-400'
                          : 'bg-[var(--c-081317)] border-[var(--c-142732)] text-slate-400 hover:border-[var(--c-1d3b4b)] hover:text-white'
                      }`}
                    >
                      <span className="text-sm font-black">{item.level}</span>
                      {isAnchor5 ? (
                        <span className="text-[10px] -mt-0.5 leading-none">🥒</span>
                      ) : (
                        <span className="text-[8px] text-slate-500 font-bold -mt-0.5">
                          {item.level <= 2
                            ? 'Fear'
                            : item.level <= 4
                            ? 'Tense'
                            : item.level <= 7
                            ? 'Alert'
                            : 'Greed'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Explanation Card */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  selectedFeel === 5
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : selectedFeel < 5
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-black flex items-center gap-1.5">
                    {selectedFeel === 5 && <span className="text-base">🥒</span>}
                    <span>
                      Level {selectedFeel}: {selectedFeelItem.title}
                    </span>
                  </div>
                  {selectedFeel === 5 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase">
                      Target Baseline
                    </span>
                  )}
                </div>
                <p className="text-xs leading-relaxed opacity-95">
                  {selectedFeelItem.description}
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 2: SLEEP & ENERGY ================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 2 &bull; Physical Readiness
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  How was your sleep and energy level?
                </h2>
                <p className="text-xs text-slate-400">
                  Rest directly influences patience and emotional resilience under pressure.
                </p>
              </div>

              {/* 4 Sleep Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {SLEEP_OPTIONS.map((opt) => {
                  const isSelected = selectedSleep === opt.title;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedSleep(opt.title)}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[var(--c-102a35)] border-emerald-400 text-white ring-1 ring-emerald-400 shadow-sm'
                          : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1b3846)]'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{opt.icon}</span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">
                            {opt.title}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-400">
                          {opt.subtitle}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {opt.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional sleep notes */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Sleep Note (Optional)
                </label>
                <input
                  type="text"
                  value={sleepNote}
                  onChange={(e) => setSleepNote(e.target.value)}
                  placeholder="e.g. Slept 8 hours, woke up early with clear head..."
                  className="w-full bg-[var(--c-081216)] border border-[var(--c-152a34)] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 3: PRIMARY FOCUS RULE ================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 3 &bull; Intention
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  What is your primary focus rule today?
                </h2>
                <p className="text-xs text-slate-400">
                  Anchoring your mind to a single clear rule prevents impulsive decisions.
                </p>
              </div>

              {/* Preset Rule Chips */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase">
                  Select a rule or type your own:
                </div>
                <div className="space-y-2">
                  {PRESET_RULES.map((rule) => {
                    const isSelected = selectedFocusRule === rule && !customFocusRule;
                    return (
                      <button
                        key={rule}
                        type="button"
                        onClick={() => {
                          setSelectedFocusRule(rule);
                          setCustomFocusRule('');
                        }}
                        className={`w-full p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[var(--c-102a35)] border-emerald-400 text-emerald-300 ring-1 ring-emerald-400'
                            : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1e3d4c)] hover:text-white'
                        }`}
                      >
                        <span>{rule}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Rule Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Or write your own custom rule:
                </label>
                <input
                  type="text"
                  value={customFocusRule}
                  onChange={(e) => setCustomFocusRule(e.target.value)}
                  placeholder="e.g. Only take trade if 15m candle closes outside range..."
                  className="w-full bg-[var(--c-081216)] border border-[var(--c-152a34)] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 4: TRIGGERS & DISTRACTIONS ================= */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-in fade-in-50">
              <div className="space-y-1">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  Step 4 &bull; Distraction Guard
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  Are there any emotional triggers or distractions today?
                </h2>
                <p className="text-xs text-slate-400">
                  Anticipating pitfalls helps you spot emotional impulses before you act on them.
                </p>
              </div>

              {/* 4 Distraction Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DISTRACTION_OPTIONS.map((opt) => {
                  const isSelected = selectedTrigger === opt.title;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTrigger(opt.title)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[var(--c-102a35)] border-emerald-400 text-white ring-1 ring-emerald-400 shadow-sm'
                          : 'bg-[var(--c-081317)] border-[var(--c-142631)] text-slate-300 hover:border-[var(--c-1b3846)]'
                      }`}
                    >
                      <span className="text-2xl shrink-0 mt-0.5">{opt.icon}</span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">
                            {opt.title}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 leading-snug">
                          {opt.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Optional trigger note */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Quick Note / Strategy for Today (Optional)
                </label>
                <input
                  type="text"
                  value={triggerNote}
                  onChange={(e) => setTriggerNote(e.target.value)}
                  placeholder="e.g. Taking a 5-minute break after each trade..."
                  className="w-full bg-[var(--c-081216)] border border-[var(--c-152a34)] text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Summary of choices preview */}
              <div className="p-3 bg-[var(--c-081317)] border border-[var(--c-142732)] rounded-xl flex items-center justify-between text-xs text-slate-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <span>Level {selectedFeel}/10</span> &bull; <span>{selectedSleep}</span> &bull;{' '}
                  <span className="truncate max-w-[200px] text-emerald-300">
                    {customFocusRule || selectedFocusRule}
                  </span>
                </span>
                <span className="text-emerald-400 font-bold">Ready to Save</span>
              </div>
            </div>
          )}

          {/* Bottom Step Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--c-142630)]">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-4 py-2.5 bg-[var(--c-091519)] hover:bg-[var(--c-10242c)] text-slate-300 border border-[var(--c-142631)] rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToTally}
                className="text-xs text-slate-400 hover:text-white font-medium cursor-pointer"
              >
                View Session Tally
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCompleteCheckIn}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer ml-auto"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save Today's Check-In</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
