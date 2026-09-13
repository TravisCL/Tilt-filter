import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Plus,
  Check,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Camera,
  AlertOctagon,
  CreditCard,
  Shield,
  Sparkles,
  Zap,
  X,
  Calculator,
  MessageSquareText,
  PenLine,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  Activity,
  Calendar,
  TrendingUp,
  BarChart3,
  Trophy,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  HeartPulse,
  Tag,
  Edit3,
  Download,
  Lock,
  BookOpen,
  XCircle,
} from 'lucide-react';
import {
  AppState,
  RuleItem,
  CompletedTrade,
  DailyScoreRecord,
  TradeQualityGrade,
  TradingAccount,
  AccountCategory,
  AccountDrawdownType,
  DeskMessage,
  LossFeeling,
  TiltRiskLevel,
} from '../types';
import { FEEL_SCALE, SLEEP_SCALE, DEFAULT_SCOREBOARD_TALLY, DEFAULT_SYSTEM_TAGS, isMorningCheckInCompleted } from '../utils/initialData';
import { broadcastTradeUpdated, broadcastStateChange } from '../utils/syncService';

interface SessionViewProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onLogTrade: (trade: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'>) => void;
  onDeleteTrade?: (tradeId: string) => void;
  onCleanDuplicates?: () => void;
}

export interface BuddyCoachInfo {
  id: string;
  label: string;
  title: string;
  shortPrompt: string;
  question: string;
  tips: string[];
  notePlaceholder: string;
}

export const getBuddyCoachingInfo = (
  ruleId: string,
  ruleText?: string,
  idx?: number
): BuddyCoachInfo => {
  if (ruleId === 'r1' || idx === 0) {
    return {
      id: ruleId,
      label: 'Rule 1',
      title: 'HTF Trend vs Chop',
      shortPrompt:
        'Is higher timeframe (15m/1h) clearly trending or chopping inside prior day range? Note your narrative & key level.',
      question:
        "Look at your 15m and 1h charts. Are candles overlapping inside yesterday's range, or is price actively expanding? What is your directional thesis and what key level confirms it before entering?",
      tips: [
        'Check 15m/1h market structure & EMA slope',
        'Identify key support/resistance pivot level',
        'If chop: stay flat and protect your drawdown limit',
      ],
      notePlaceholder: 'Custom notes: 15m trend bias, key level 21,450, avoid chop...',
    };
  }
  if (ruleId === 'r2' || idx === 1) {
    return {
      id: ruleId,
      label: 'Rule 2',
      title: 'Setup Identification',
      shortPrompt:
        'IB sweep/breakout or FRB? Confirm the trigger bar has closed before clicking.',
      question:
        'Which specific pattern are you executing? Is this an Initial Balance (IB) sweep/breakout or a First Reversal Bar (FRB)? Has the trigger bar completely printed and closed, or are you front-running?',
      tips: [
        'Confirm the candle close before executing',
        'Specify pattern name and trigger price in notes',
        'Never enter on anticipation of an unconfirmed bar',
      ],
      notePlaceholder: 'Custom notes: IB high sweep, 5m FVG retest, trigger at 21,460...',
    };
  }
  if (ruleId === 'r3' || idx === 2) {
    return {
      id: ruleId,
      label: 'Rule 3',
      title: 'Market Structure',
      shortPrompt:
        'Are HH/HLs (long) or LH/LLs (short) confirmed on execution timeframe?',
      question:
        'Are you seeing confirmed Higher Highs & Higher Lows (for longs) or Lower Highs & Lower Lows (for shorts) on your 1m/5m timeframe? Or are you trying to catch a falling knife?',
      tips: [
        'Confirm structural break, not just a wick',
        'Verify swing pivot invalidation point',
        'Trade in the direction of the confirmed shift',
      ],
      notePlaceholder: 'Custom notes: 1m higher lows confirmed, swing pivot 21,435...',
    };
  }
  if (ruleId === 'q4') {
    return {
      id: 'q4',
      label: 'Q4',
      title: 'Risk & Sizing',
      shortPrompt:
        'Where is your hard stop loss and dollar risk? Sized to protect your floor?',
      question:
        'Where is your invalidation point? Have you calculated your exact dollar risk if stopped out? Ensure your contract count complies with your sizing tier and account drawdown limit.',
      tips: [
        'Set stop order immediately upon entry',
        'Dollar risk must fit within your active tier',
        'Never widen your stop loss once in a trade',
      ],
      notePlaceholder: 'Risk notes: stop distance, size, price levels...',
    };
  }
  if (ruleId === 'q5') {
    return {
      id: 'q5',
      label: 'Q5',
      title: 'FOMO & Revenge Check',
      shortPrompt:
        'Are you chasing green/red candles or eager to win back a loss? Be 100% honest.',
      question:
        'Gut-check your emotional temperature: Are you feeling urgency because the market moved without you? Did you just suffer a loss? If your heart rate is up or you feel rushed, STEP AWAY.',
      tips: [
        'Missing a move costs $0; FOMO costs real capital',
        'If you feel urgency, take 3 deep breaths and wait',
        'Discipline is what separates funded pros from blown accounts',
      ],
      notePlaceholder: 'Discipline check: emotional state, clarity, mindset...',
    };
  }
  return {
    id: ruleId,
    label: `Rule ${(idx ?? 0) + 1}`,
    title: ruleText || 'Custom Rule',
    shortPrompt: `What exact technical condition validates "${ruleText || 'this rule'}" before entry?`,
    question: `What specific technical or execution condition validates "${ruleText || 'this rule'}"? Have all confirmation criteria been satisfied?`,
    tips: [
      'Ensure objective, non-discretionary criteria',
      'Record your verification in the custom note box',
      'Do not compromise on your checklist rules',
    ],
    notePlaceholder: 'Custom notes: validation criteria, confirmation triggers...',
  };
};

export const SessionView: React.FC<SessionViewProps> = ({
  state,
  onUpdateState,
  onLogTrade,
  onDeleteTrade,
  onCleanDuplicates,
}) => {
  const isSubmittingTradeRef = useRef<boolean>(false);
  const activeAccount: TradingAccount | null =
    state.accounts.find((a) => a.id === state.activeAccountId && a.status !== 'blown') ||
    state.accounts.find((a) => a.id === state.activeAccountId) ||
    (state.accounts.length > 0 && !state.activeAccountId
      ? state.accounts.find((a) => a.status !== 'blown') || state.accounts[0]
      : null);

  const hasValidAccountAndDrawdown = Boolean(
    activeAccount &&
    activeAccount.id &&
    activeAccount.name &&
    activeAccount.drawdownType &&
    typeof activeAccount.maxDrawdown === 'number' &&
    activeAccount.maxDrawdown > 0
  );

  const [showSwitchAccount, setShowSwitchAccount] = useState(false);

  // New Account Modal State - Completely blank form by default
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccType, setNewAccType] = useState<AccountCategory>('live');
  const [newAccName, setNewAccName] = useState('');
  const [newAccDrawdownType, setNewAccDrawdownType] = useState<AccountDrawdownType>('eod');
  const [newAccMaxDD, setNewAccMaxDD] = useState('');
  const [newAccStopFloor, setNewAccStopFloor] = useState(true);

  const resetAndOpenAddAccountModal = (type: AccountCategory = 'live') => {
    setNewAccType(type);
    setNewAccName('');
    setNewAccMaxDD('');
    setNewAccDrawdownType('eod');
    setNewAccStopFloor(true);
    setShowAddAccountModal(true);
  };

  const handleCreateAccountFromSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim()) {
      alert('Please enter an account name.');
      return;
    }

    const maxDD = parseFloat(newAccMaxDD);
    if (isNaN(maxDD) || maxDD <= 0) {
      alert('Please enter a valid max drawdown amount.');
      return;
    }

    const newAccount: TradingAccount = {
      id: `acc-${Date.now()}`,
      name: newAccName.trim(),
      size: 0,
      drawdownType: newAccDrawdownType,
      maxDrawdown: maxDD,
      floorLevel: 0,
      stopTrailingAtFloor: newAccStopFloor,
      currentBalance: 0,
      highWaterMark: 0,
      active: true,
      accountType: newAccType,
      status: 'active',
    };

    onUpdateState((prev) => ({
      ...prev,
      accounts: [...prev.accounts, newAccount],
      activeAccountId: newAccount.id,
    }));

    setNewAccName('');
    setNewAccMaxDD('');
    setShowAddAccountModal(false);
  };

  // Ensure activeAccountId is properly set when accounts exist
  useEffect(() => {
    if (state.accounts.length > 0) {
      const activeExists = state.accounts.some((a) => a.id === state.activeAccountId);
      if (!state.activeAccountId || !activeExists) {
        const preferred = state.accounts.find((a) => a.status !== 'blown') || state.accounts[0];
        if (preferred && preferred.id !== state.activeAccountId) {
          onUpdateState((prev) => ({ ...prev, activeAccountId: preferred.id }));
        }
      }
    }
  }, [state.accounts, state.activeAccountId, onUpdateState]);

  // Morning Emotional Check-In State (Anchor 5: Cool as a Cucumber, Sleep Notes via Memo)
  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckInCompletedToday = isMorningCheckInCompleted(state?.emotionalTracker, todayStr);

  // Trigger morning check-in prompt automatically at the start of the trading day or session view if not completed today
  const [showMorningCheckInModal, setShowMorningCheckInModal] = useState<boolean>(() => !isCheckInCompletedToday);
  const [morningFeelLevel, setMorningFeelLevel] = useState<number>(() => state?.emotionalTracker?.feelLevel ?? 5);
  const [morningNotesInput, setMorningNotesInput] = useState<string>(() => state?.emotionalTracker?.morningNotes || '');
  const [morningCheckInDismissed, setMorningCheckInDismissed] = useState<boolean>(false);

  // Auto-dismiss or sync modal if check-in was completed in another window
  useEffect(() => {
    if (isCheckInCompletedToday) {
      setShowMorningCheckInModal(false);
    }
  }, [isCheckInCompletedToday]);

  useEffect(() => {
    if (state?.emotionalTracker?.feelLevel !== null && state?.emotionalTracker?.feelLevel !== undefined) {
      setMorningFeelLevel(state.emotionalTracker.feelLevel);
    }
    if (state?.emotionalTracker?.morningNotes !== undefined) {
      setMorningNotesInput(state.emotionalTracker.morningNotes || '');
    }
  }, [state?.emotionalTracker?.feelLevel, state?.emotionalTracker?.morningNotes]);

  const handleCompleteMorningCheckIn = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const feelItem = FEEL_SCALE.find((f) => f.level === morningFeelLevel);
    const feelDeviation = Math.abs(morningFeelLevel - 5);
    const emoConsistency = Math.max(40, 100 - feelDeviation * 12);
    // Process score derived from rule readiness and emotional baseline consistency (sleep captured via memo)
    const dailyScore = Math.min(100, Math.round(100 * 0.55 + emoConsistency * 0.45));

    onUpdateState((prev) => {
      const updatedEmotionalTracker = {
        ...prev.emotionalTracker,
        feelLevel: morningFeelLevel,
        morningNotes: morningNotesInput,
        updatedAt: todayStr,
        morningCheckInDate: todayStr,
        morningCheckInCompleted: true,
      };

      const memoSnippet = morningNotesInput
        ? ` • Memo & Sleep: "${morningNotesInput.slice(0, 50)}${morningNotesInput.length > 50 ? '...' : ''}"`
        : '';

      const deskMsg: DeskMessage = {
        id: `m-morning-${Date.now()}`,
        sender: 'BUDDY',
        time: timeStr,
        text: `☀️ Morning check-in logged: Emotional baseline at ${morningFeelLevel}/10 (${feelItem?.title || 'Cool as a Cucumber'})${memoSnippet}. Session unlocked. Hold process today.`,
      };

      const existingScoreboard = prev.dailyScoreboard || DEFAULT_SCOREBOARD_TALLY;
      const todayIndex = existingScoreboard.findIndex((s) => s.date === todayStr);

      let updatedScoreboard = [...existingScoreboard];
      if (todayIndex >= 0) {
        updatedScoreboard[todayIndex] = {
          ...updatedScoreboard[todayIndex],
          feelLevel: morningFeelLevel,
          morningNotes: morningNotesInput,
          emotionalConsistencyPercent: emoConsistency,
          dailyProcessScore: dailyScore,
        };
      } else {
        updatedScoreboard = [
          {
            id: `sb-today-${todayStr}`,
            date: todayStr,
            dayLabel: `Today (${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`,
            feelLevel: morningFeelLevel,
            morningNotes: morningNotesInput,
            walkOutNotes: '',
            dailyProcessScore: dailyScore,
            emotionalConsistencyPercent: emoConsistency,
            ruleAdherencePercent: 100,
            tradesCount: prev.trades.length,
            plannedTradesCount: prev.trades.filter((t) => t.plannedStatus === 'planned').length,
            unplannedTradesCount: prev.trades.filter((t) => t.plannedStatus === 'unplanned').length,
            wellManagedExitsCount: prev.trades.filter((t) => t.discipline === 'managed_well').length,
            emotionalExitsCount: prev.trades.filter((t) => t.discipline === 'exited_emotionally').length,
            pnl: prev.trades.reduce((acc, t) => acc + (t.pnl || 0), 0),
            isCleanDay: prev.tiltScore === 0,
            status: 'clean',
          },
          ...existingScoreboard,
        ];
      }

      return {
        ...prev,
        emotionalTracker: updatedEmotionalTracker,
        dailyScoreboard: updatedScoreboard,
        deskMessages: [...prev.deskMessages, deskMsg],
      };
    });

    setShowMorningCheckInModal(false);
    setMorningCheckInDismissed(false);
    setShowSwitchAccount(true);
  };

  // Trade Filter Form State
  const [ruleCheckboxes, setRuleCheckboxes] = useState<Record<string, boolean>>({});
  const [overriddenRules, setOverriddenRules] = useState<Record<string, boolean>>({});
  const [overridePromptFor, setOverridePromptFor] = useState<string | null>(null);
  const [consolidatedNote, setConsolidatedNote] = useState('');
  const [ruleNotes, setRuleNotes] = useState<Record<string, string>>({});
  const [q4Risk, setQ4Risk] = useState<boolean | null>(null);
  const [q5NotFomo, setQ5NotFomo] = useState<boolean | null>(null);
  const [activeRuleFocus, setActiveRuleFocus] = useState<string>('r1');

  // Question list helper for the sequential control box
  const checklistQuestions = [
    ...state.rules.map((r, idx) => ({
      id: r.id,
      stepNum: idx + 1,
      title: `Rule ${idx + 1}`,
      shortTitle: `R${idx + 1}`,
      text: r.text,
      type: 'rule' as const,
    })),
    {
      id: 'q4',
      stepNum: state.rules.length + 1,
      title: `Question ${state.rules.length + 1}: Risk Sizing`,
      shortTitle: 'Q4 Risk',
      text: 'Have you calculated your risk?',
      type: 'q4' as const,
    },
    {
      id: 'q5',
      stepNum: state.rules.length + 2,
      title: `Question ${state.rules.length + 2}: Emotional Filter`,
      shortTitle: 'Q5 FOMO',
      text: 'This is not a revenge or FOMO click',
      type: 'q5' as const,
    },
  ];

  const questionOrder = checklistQuestions.map((q) => q.id);
  const currentQuestionIndex = Math.max(
    0,
    checklistQuestions.findIndex((q) => q.id === activeRuleFocus)
  );
  const currentQuestion = checklistQuestions[currentQuestionIndex] || checklistQuestions[0];
  const totalQuestions = checklistQuestions.length;

  const getCurrentStatus = (qId: string): boolean | null => {
    if (qId === 'q4') return q4Risk;
    if (qId === 'q5') return q5NotFomo;
    return ruleCheckboxes[qId] ?? null;
  };

  const advanceToNextQuestion = (currentQuestionId: string) => {
    const currentIndex = questionOrder.indexOf(currentQuestionId);
    if (currentIndex >= 0 && currentIndex < questionOrder.length - 1) {
      setActiveRuleFocus(questionOrder[currentIndex + 1]);
    }
  };

  // Consolidated Control Box: logs answer and advances in sequence
  const handleControlAnswer = (answer: boolean) => {
    if (answer === true) {
      setOverridePromptFor(null);
      if (activeRuleFocus === 'q4') {
        setQ4Risk(true);
      } else if (activeRuleFocus === 'q5') {
        setQ5NotFomo(true);
      } else {
        setRuleCheckboxes((prev) => ({ ...prev, [activeRuleFocus]: true }));
      }
      setOverriddenRules((prev) => ({ ...prev, [activeRuleFocus]: false }));
      advanceToNextQuestion(activeRuleFocus);
    } else {
      // Prompt immediate inline override question: "Not all criteria met. Take it anyway?"
      setOverridePromptFor(activeRuleFocus);
    }
  };

  // Confirm "Take It Anyway" override for current rule
  const handleConfirmOverride = () => {
    const targetId = overridePromptFor || activeRuleFocus;
    if (targetId === 'q4') {
      setQ4Risk(false);
    } else if (targetId === 'q5') {
      setQ5NotFomo(false);
    } else {
      setRuleCheckboxes((prev) => ({ ...prev, [targetId]: false }));
    }
    setOverriddenRules((prev) => ({ ...prev, [targetId]: true }));
    setOverridePromptFor(null);
    advanceToNextQuestion(targetId);
  };

  const handleCancelOverride = () => {
    setOverridePromptFor(null);
  };

  const handleResetFilter = () => {
    setRuleCheckboxes({});
    setOverriddenRules({});
    setOverridePromptFor(null);
    setQ4Risk(null);
    setQ5NotFomo(null);
    setConsolidatedNote('');
    setOptionalTakeProfitInput('');
    setCustomRiskInput('');
    setActiveRuleFocus(state.rules[0]?.id || 'r1');
  };

  // Calculator State - Dynamically connected to active account or manual entry
  const [maxDrawdownInput, setMaxDrawdownInput] = useState<string>(() => {
    if (activeAccount && activeAccount.maxDrawdown) {
      return activeAccount.maxDrawdown.toString();
    }
    return '2000';
  });
  const [selectedQuality, setSelectedQuality] = useState<'B' | 'A' | 'A_PLUS'>('A_PLUS');
  const [riskAmounts, setRiskAmounts] = useState<{
    B: number;
    A: number;
    A_PLUS: number;
  }>(() => {
    const initDD = activeAccount?.maxDrawdown || 2000;
    return {
      B: Math.max(5, Math.round(initDD * 0.05)),
      A: Math.max(10, Math.round(initDD * 0.10)),
      A_PLUS: Math.max(15, Math.round(initDD * 0.15)),
    };
  });
  const [customRiskInput, setCustomRiskInput] = useState('');
  const [optionalTakeProfitInput, setOptionalTakeProfitInput] = useState('');
  const [filterSavedFeedback, setFilterSavedFeedback] = useState(false);
  const [skipTradeFeedback, setSkipTradeFeedback] = useState(false);
  const [unplannedFeedback, setUnplannedFeedback] = useState(false);

  // Outcome Tracker state
  const [outcomeMode, setOutcomeMode] = useState<'idle' | 'winner' | 'loser'>('idle');
  const [winAmountInput, setWinAmountInput] = useState<string>('');
  const [lossAmountInput, setLossAmountInput] = useState<string>('');
  const [tradeInPosition, setTradeInPosition] = useState<boolean>(false);
  const [outcomeStatus, setOutcomeStatus] = useState<{
    type: 'winner' | 'loser';
    pnl: number;
    feeling?: LossFeeling;
    message: string;
  } | null>(null);

  // Dynamic Sizing Sync: When an account is created or selected, connect and populate active account values
  useEffect(() => {
    if (activeAccount && activeAccount.maxDrawdown && activeAccount.maxDrawdown > 0) {
      const dd = activeAccount.maxDrawdown;
      setMaxDrawdownInput(dd.toString());
      setRiskAmounts({
        B: Math.max(5, Math.round(dd * 0.05)),
        A: Math.max(10, Math.round(dd * 0.10)),
        A_PLUS: Math.max(15, Math.round(dd * 0.15)),
      });
    }
  }, [activeAccount?.id, activeAccount?.maxDrawdown]);

  const handleMaxDrawdownChange = (newVal: string) => {
    setMaxDrawdownInput(newVal);
    const parsed = parseFloat(newVal);
    if (!isNaN(parsed) && parsed > 0) {
      setRiskAmounts({
        B: Math.max(5, Math.round(parsed * 0.05)),
        A: Math.max(10, Math.round(parsed * 0.10)),
        A_PLUS: Math.max(15, Math.round(parsed * 0.15)),
      });
      if (activeAccount) {
        onUpdateState((prev) => ({
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === activeAccount.id ? { ...a, maxDrawdown: parsed } : a
          ),
        }));
      }
    }
  };

  // Trade review trade naming local state
  const [tradeNames, setTradeNames] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    state.trades.forEach((t) => {
      initial[t.id] = t.name;
    });
    return initial;
  });
  const [showAnswersMap, setShowAnswersMap] = useState<Record<string, boolean>>({});

  // Inline Rule Editing State
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleText, setEditingRuleText] = useState<string>('');

  // Quick Restore & Manual Add Trade Modal State
  const [showRestoreTradeModal, setShowRestoreTradeModal] = useState(false);
  const [restoreTradeName, setRestoreTradeName] = useState('Trade #1');
  const [restoreTradePnl, setRestoreTradePnl] = useState('-250');
  const [restoreTradeQuality, setRestoreTradeQuality] = useState<TradeQualityGrade>('A_PLUS');
  const [restoreTradeDiscipline, setRestoreTradeDiscipline] = useState<'managed_well' | 'exited_emotionally'>('managed_well');
  const [restoreTradePlanned, setRestoreTradePlanned] = useState<'planned' | 'unplanned'>('planned');
  const [restoreTradeAccountId, setRestoreTradeAccountId] = useState(activeAccount?.id || '');
  const [restoreTradeNotes, setRestoreTradeNotes] = useState('');
  const [restoreTradeFeeling, setRestoreTradeFeeling] = useState<LossFeeling>('fine');

  // Inline Risk Editing State for Running Trade Log
  const [editingRiskTradeId, setEditingRiskTradeId] = useState<string | null>(null);
  const [editRiskDraft, setEditRiskDraft] = useState<string>('');

  // Centralized System Tag Editing & Creation State (Max 10 total across system)
  const [editingSystemTagIndex, setEditingSystemTagIndex] = useState<number | null>(null);
  const [editingSystemTagText, setEditingSystemTagText] = useState<string>('');
  const [newSystemTagInput, setNewSystemTagInput] = useState<string>('');
  const [tagErrorFeedback, setTagErrorFeedback] = useState<string | null>(null);

  // Derived current system tags, strictly capped at 10
  const currentSystemTags: string[] =
    state.systemTags && state.systemTags.length > 0
      ? state.systemTags.slice(0, 10)
      : (DEFAULT_SYSTEM_TAGS || [
          'Structure',
          '15m/1h Trend',
          'IB / FRB',
          'Trigger',
          'Execution',
          'IB Sweep',
          'FVG Retest',
        ]).slice(0, 10);

  // Calculations for running header
  const totalProfit = state.trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const winnersCount = state.trades.filter((t) => t.pnl > 0).length;
  const winRate =
    state.trades.length > 0
      ? Math.round((winnersCount / state.trades.length) * 100)
      : 0;
  const aPlusCount = state.trades.filter((t) => t.quality === 'A_PLUS').length;
  const aCount = state.trades.filter((t) => t.quality === 'A').length;

  // Quick Action Take A Trade
  const handleCallAPlus = () => {
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }
    if (!hasValidAccountAndDrawdown) {
      resetAndOpenAddAccountModal('live');
      return;
    }
    setSelectedQuality('A_PLUS');
    setRuleCheckboxes({
      r1: true,
      r2: true,
      r3: true,
    });
    setOverriddenRules({});
    setOverridePromptFor(null);
    setQ4Risk(true);
    setQ5NotFomo(true);
    const filterEl = document.getElementById('trade-filter-section');
    if (filterEl) {
      filterEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Quick Action Unplanned
  const handleCallUnplanned = () => {
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      tiltScore: prev.tiltScore + 1,
    }));
    setUnplannedFeedback(true);
    setTimeout(() => setUnplannedFeedback(false), 2500);
  };

  // Sizing Calculation helper: NEVER auto-assumes or presets a default risk amount
  const explicitRiskAmount =
    customRiskInput.trim() !== '' &&
    !isNaN(parseFloat(customRiskInput)) &&
    parseFloat(customRiskInput) > 0
      ? parseFloat(customRiskInput)
      : null;

  // Accepted risk value for sizing calculations (null when not yet explicitly input or pulled)
  const acceptedRisk = explicitRiskAmount;

  // Global check if all rules in the pre-trade checklist and emotional filter are met
  const isAllRulesMet =
    state.rules.length > 0 &&
    state.rules.every((r) => ruleCheckboxes[r.id] === true) &&
    q4Risk === true &&
    q5NotFomo === true;

  // Helper to check if a specific step is resolved (YES or confirmed override)
  const isStepResolved = (stepId: string): boolean => {
    if (stepId === 'q4') {
      const isOverridden = overriddenRules['q4'] === true;
      if (q4Risk === true && explicitRiskAmount && explicitRiskAmount > 0) return true;
      if (q4Risk === false && isOverridden) return true;
      return false;
    }
    if (stepId === 'q5') {
      const isOverridden = overriddenRules['q5'] === true;
      if (q5NotFomo === true) return true;
      if (q5NotFomo === false && isOverridden) return true;
      return false;
    }
    const ans = ruleCheckboxes[stepId];
    const isOverridden = overriddenRules[stepId] === true;
    if (ans === true) return true;
    if (ans === false && isOverridden) return true;
    return false;
  };

  // Helper to check if a step is unlocked in strict sequential order
  const isStepUnlocked = (stepId: string): boolean => {
    const targetIndex = checklistQuestions.findIndex((q) => q.id === stepId);
    if (targetIndex <= 0) return true; // Rule 1 is always unlocked
    for (let i = 0; i < targetIndex; i++) {
      if (!isStepResolved(checklistQuestions[i].id)) {
        return false;
      }
    }
    return true;
  };

  // Helper to determine the first unverified question in sequence
  const getFirstUnverifiedQuestion = () => {
    for (let i = 0; i < state.rules.length; i++) {
      const rule = state.rules[i];
      const ans = ruleCheckboxes[rule.id];
      const isOverridden = overriddenRules[rule.id] === true;
      if (ans === undefined || ans === null || (ans === false && !isOverridden)) {
        return {
          id: rule.id,
          stepNum: i + 1,
          title: `Rule ${i + 1}`,
          text: rule.text,
          isNoUnconfirmed: ans === false && !isOverridden,
        };
      }
    }
    if (
      q4Risk === undefined ||
      q4Risk === null ||
      (q4Risk === false && !overriddenRules['q4']) ||
      (q4Risk === true && (!explicitRiskAmount || explicitRiskAmount <= 0))
    ) {
      return {
        id: 'q4',
        stepNum: state.rules.length + 1,
        title: `Question ${state.rules.length + 1} (Risk)`,
        text: 'Have you calculated your risk?',
        isNoUnconfirmed: q4Risk === false && !overriddenRules['q4'],
      };
    }
    if (
      q5NotFomo === undefined ||
      q5NotFomo === null ||
      (q5NotFomo === false && !overriddenRules['q5'])
    ) {
      return {
        id: 'q5',
        stepNum: state.rules.length + 2,
        title: `Question ${state.rules.length + 2} (FOMO)`,
        text: 'This is not a revenge or FOMO click',
        isNoUnconfirmed: q5NotFomo === false && !overriddenRules['q5'],
      };
    }
    return null;
  };

  const firstUnverifiedQuestion = getFirstUnverifiedQuestion();
  const isAllPreTradeCompleted = firstUnverifiedQuestion === null;

  // Handle user selecting a step card or pip: prevents skipping ahead out of order
  const handleSelectStep = (stepId: string) => {
    if (isStepUnlocked(stepId)) {
      setOverridePromptFor(null);
      setActiveRuleFocus(stepId);
    } else {
      const firstUnverified = getFirstUnverifiedQuestion();
      if (firstUnverified) {
        setActiveRuleFocus(firstUnverified.id);
        const targetEl =
          document.getElementById(`rule-card-${firstUnverified.id}`) ||
          (firstUnverified.id === 'q4' ? document.getElementById('account-sizing-tier-cards') : null) ||
          (firstUnverified.id === 'q5' ? document.getElementById('rule-card-q5') : null) ||
          document.getElementById('consolidated-interactive-control-box');
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  // Handle "TAKE THE TRADE" - strictly enforces verifying checklist rules sequentially (Rule 1 through Rule 5)
  const handleTakeTheTrade = () => {
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }

    // One trade at a time enforcement: if already in a trade, scroll to Outcome Tracker
    if (tradeInPosition) {
      const trackerEl = document.getElementById('outcome-tracker-box');
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 1. Enforce verifying setup rules (Rule 1, Rule 2, Rule 3...) sequentially
    for (let i = 0; i < state.rules.length; i++) {
      const rule = state.rules[i];
      const ans = ruleCheckboxes[rule.id];
      const isOverridden = overriddenRules[rule.id] === true;

      // If this rule hasn't been answered yet (pending)
      if (ans === undefined || ans === null) {
        setActiveRuleFocus(rule.id);
        setOverridePromptFor(null);
        const ruleEl =
          document.getElementById(`rule-card-${rule.id}`) ||
          document.getElementById('consolidated-interactive-control-box');
        if (ruleEl) {
          ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }

      // If answered NO without an override, prompt override confirmation
      if (ans === false && !isOverridden) {
        setActiveRuleFocus(rule.id);
        setOverridePromptFor(rule.id);
        const ruleEl =
          document.getElementById('inline-override-prompt') ||
          document.getElementById(`rule-card-${rule.id}`) ||
          document.getElementById('consolidated-interactive-control-box');
        if (ruleEl) {
          ruleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
    }

    // 2. Enforce Question 4: Risk Sizing (Have you calculated your risk?)
    if (q4Risk === undefined || q4Risk === null) {
      setActiveRuleFocus('q4');
      setOverridePromptFor(null);
      const calcEl =
        document.getElementById('account-sizing-tier-cards') ||
        document.getElementById('consolidated-interactive-control-box');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (q4Risk === false && !overriddenRules['q4']) {
      setActiveRuleFocus('q4');
      setOverridePromptFor('q4');
      const calcEl =
        document.getElementById('inline-override-prompt') ||
        document.getElementById('account-sizing-tier-cards') ||
        document.getElementById('consolidated-interactive-control-box');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // If Q4 is marked YES but risk is not yet set, scroll to sizing tiers
    if (q4Risk === true && (!explicitRiskAmount || explicitRiskAmount <= 0)) {
      setActiveRuleFocus('q4');
      const calcEl = document.getElementById('account-sizing-tier-cards');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // 3. Enforce Question 5: Emotional Filter (This is not a revenge or FOMO click)
    if (q5NotFomo === undefined || q5NotFomo === null) {
      setActiveRuleFocus('q5');
      setOverridePromptFor(null);
      const q5El =
        document.getElementById('rule-card-q5') ||
        document.getElementById('consolidated-interactive-control-box');
      if (q5El) {
        q5El.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (q5NotFomo === false && !overriddenRules['q5']) {
      setActiveRuleFocus('q5');
      setOverridePromptFor('q5');
      const q5El =
        document.getElementById('inline-override-prompt') ||
        document.getElementById('rule-card-q5') ||
        document.getElementById('consolidated-interactive-control-box');
      if (q5El) {
        q5El.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // All checklist rules and risk sizing have been verified in sequence!
    setTradeInPosition(true);
    setFilterSavedFeedback(true);
    const riskToUse = explicitRiskAmount || (riskAmounts[selectedQuality] ?? 200);
    if (!winAmountInput) {
      if (optionalTakeProfitInput && parseFloat(optionalTakeProfitInput) > 0) {
        setWinAmountInput(optionalTakeProfitInput);
      } else {
        setWinAmountInput(String(riskToUse));
      }
    }
    if (!lossAmountInput) {
      setLossAmountInput(String(riskToUse));
    }

    setTimeout(() => {
      const trackerEl = document.getElementById('outcome-tracker-box');
      if (trackerEl) {
        trackerEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);

    setTimeout(() => setFilterSavedFeedback(false), 2500);
  };

  // Handle "SKIPPED THE TRADE" - cancel the current trade setup and reset checklist
  const handleSkipTheTrade = () => {
    // 1. Reset all checklist rule verification states and overrides
    setRuleCheckboxes({});
    setOverriddenRules({});
    setOverridePromptFor(null);
    setQ4Risk(null);
    setQ5NotFomo(null);
    setActiveRuleFocus('r1');
    setConsolidatedNote('');
    setRuleNotes({});
    setTradeInPosition(false);
    setFilterSavedFeedback(false);

    // 2. Clear out manual/staged pricing or outcome inputs
    setOutcomeMode('idle');
    setOutcomeStatus(null);
    setWinAmountInput('');
    setLossAmountInput('');
    setCustomRiskInput('');
    setOptionalTakeProfitInput('');

    // 3. Show clear confirmation banner
    setSkipTradeFeedback(true);
    setTimeout(() => setSkipTradeFeedback(false), 3500);

    // 4. Record disciplined standing down note to Buddy message stream
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const deskMsg: DeskMessage = {
      id: `m-skip-${Date.now()}`,
      sender: 'BUDDY',
      time: timeStr,
      text: `🛡️ Trade setup cancelled / skipped. Deciding to stand down and protect your capital is an essential disciplined trading habit. Missing a move costs $0.`,
    };
    onUpdateState((prev) => ({
      ...prev,
      deskMessages: [...prev.deskMessages, deskMsg],
    }));
  };

  // Outcome Tracker: Select Winner
  const handleSelectWin = () => {
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }
    if (!winAmountInput) {
      if (optionalTakeProfitInput && parseFloat(optionalTakeProfitInput) > 0) {
        setWinAmountInput(optionalTakeProfitInput);
      } else {
        setWinAmountInput(String(acceptedRisk));
      }
    }
    setOutcomeMode('winner');
  };

  // Outcome Tracker: Confirm Win
  const handleConfirmWin = () => {
    if (isSubmittingTradeRef.current) return;
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }
    const winAmount = parseFloat(winAmountInput);
    if (isNaN(winAmount) || winAmount <= 0) {
      alert('Please enter a valid profit amount (e.g. 200).');
      return;
    }

    isSubmittingTradeRef.current = true;
    setTimeout(() => {
      isSubmittingTradeRef.current = false;
    }, 1200);

    const riskPercent =
      selectedQuality === 'A_PLUS' ? 15 : selectedQuality === 'A' ? 10 : 5;

    const activeNote = consolidatedNote.trim();
    const tradeTitle = activeNote
      ? `${selectedQuality === 'A_PLUS' ? 'A+' : selectedQuality === 'A' ? 'A' : 'B'} — ${activeNote.slice(0, 32)}`
      : `${selectedQuality === 'A_PLUS' ? 'A+ ' : selectedQuality === 'A' ? 'A ' : 'B '}Setup`;

    const allRulesMet =
      state.rules.every((r) => ruleCheckboxes[r.id] === true) &&
      q4Risk === true &&
      q5NotFomo === true;

    const rMult = Number((winAmount / (acceptedRisk || 1)).toFixed(2));

    const newTrade: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'> = {
      plannedStatus: 'planned',
      quality: selectedQuality,
      symbol: 'MNQ',
      riskDollars: acceptedRisk,
      riskPercent,
      pnl: winAmount,
      rMultiple: rMult,
      rulesHeld: allRulesMet,
      discipline: undefined,
      disciplineSelected: false,
      takeProfitTarget:
        optionalTakeProfitInput && parseFloat(optionalTakeProfitInput) > 0
          ? parseFloat(optionalTakeProfitInput)
          : undefined,
      name: tradeTitle,
      outcome: 'winner',
      notes: activeNote,
      accountId: activeAccount?.id,
      accountName: activeAccount?.name,
      checklistAnswers: {
        rule1: !!ruleCheckboxes.r1,
        rule2: !!ruleCheckboxes.r2,
        rule3: !!ruleCheckboxes.r3,
        q4CalculatedRisk: q4Risk === true,
        q5NotFomo: q5NotFomo === true,
      },
      ruleNotes: {
        consolidated: activeNote,
        overridden: Object.keys(overriddenRules).filter((k) => overriddenRules[k]).join(', '),
        ...ruleNotes,
      },
    };

    onLogTrade(newTrade);
    setTradeInPosition(false);
    setOutcomeMode('idle');
    setOutcomeStatus({
      type: 'winner',
      pnl: winAmount,
      message: `Winner logged: +$${winAmount} (+${rMult}R). Balance & High Water Mark updated.`,
    });
    setTimeout(() => setOutcomeStatus(null), 5000);
  };

  // Outcome Tracker: Select Loss
  const handleSelectLoss = (overrideAmount?: number) => {
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }
    const amt = overrideAmount !== undefined ? overrideAmount : acceptedRisk;
    setLossAmountInput(String(amt));
    setOutcomeMode('loser');
  };

  // Outcome Tracker: Confirm Loss & Honest Emotional State
  const handleConfirmLoss = (feeling: LossFeeling) => {
    if (isSubmittingTradeRef.current) return;
    if (!isCheckInCompletedToday) {
      setShowMorningCheckInModal(true);
      return;
    }

    isSubmittingTradeRef.current = true;
    setTimeout(() => {
      isSubmittingTradeRef.current = false;
    }, 1200);

    const lossAmount = parseFloat(lossAmountInput) || acceptedRisk;
    const riskPercent =
      selectedQuality === 'A_PLUS' ? 15 : selectedQuality === 'A' ? 10 : 5;

    const activeNote = consolidatedNote.trim();
    const tradeTitle = activeNote
      ? `${selectedQuality === 'A_PLUS' ? 'A+' : selectedQuality === 'A' ? 'A' : 'B'} — ${activeNote.slice(0, 32)}`
      : `${selectedQuality === 'A_PLUS' ? 'A+ ' : selectedQuality === 'A' ? 'A ' : 'B '}Setup`;

    const allRulesMet =
      state.rules.every((r) => ruleCheckboxes[r.id] === true) &&
      q4Risk === true &&
      q5NotFomo === true;

    const tiltRiskLevel: TiltRiskLevel =
      feeling === 'feel_like_chasing'
        ? 'high'
        : feeling === 'frustrated'
        ? 'moderate'
        : 'low';

    const rMult = -Number((lossAmount / (acceptedRisk || 1)).toFixed(2));

    const newTrade: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'> = {
      plannedStatus: 'planned',
      quality: selectedQuality,
      symbol: 'MNQ',
      riskDollars: acceptedRisk,
      riskPercent,
      pnl: -Math.abs(lossAmount),
      rMultiple: rMult,
      rulesHeld: allRulesMet,
      discipline: undefined,
      disciplineSelected: false,
      takeProfitTarget:
        optionalTakeProfitInput && parseFloat(optionalTakeProfitInput) > 0
          ? parseFloat(optionalTakeProfitInput)
          : undefined,
      name: tradeTitle,
      notes: activeNote,
      accountId: activeAccount?.id,
      accountName: activeAccount?.name,
      outcome: 'loser',
      emotionalState: feeling,
      tiltRisk: tiltRiskLevel,
      checklistAnswers: {
        rule1: !!ruleCheckboxes.r1,
        rule2: !!ruleCheckboxes.r2,
        rule3: !!ruleCheckboxes.r3,
        q4CalculatedRisk: q4Risk === true,
        q5NotFomo: q5NotFomo === true,
      },
      ruleNotes: {
        consolidated: activeNote,
        overridden: Object.keys(overriddenRules).filter((k) => overriddenRules[k]).join(', '),
        ...ruleNotes,
      },
    };

    onLogTrade(newTrade);
    setTradeInPosition(false);
    setOutcomeMode('idle');

    const feelingLabel =
      feeling === 'feel_like_chasing'
        ? 'Feel like chasing'
        : feeling === 'frustrated'
        ? "I'm frustrated"
        : "I'm fine";

    setOutcomeStatus({
      type: 'loser',
      pnl: -Math.abs(lossAmount),
      feeling,
      message: `Loss logged: -$${lossAmount}. "${feelingLabel}" routed to Board tab for tilt monitoring.`,
    });
    setTimeout(() => setOutcomeStatus(null), 7000);
  };

  // Toggle Discipline on trade card
  const handleUpdateDiscipline = (tradeId: string, disc: 'managed_well' | 'exited_emotionally') => {
    onUpdateState((prev) => {
      const updated = prev.trades.map((t) => {
        if (t.id === tradeId) {
          const isCurrentActive = t.discipline === disc && t.disciplineSelected !== false;
          return {
            ...t,
            discipline: isCurrentActive ? undefined : disc,
            disciplineSelected: !isCurrentActive,
          };
        }
        return t;
      });
      const nextState = { ...prev, trades: updated };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });
  };

  // Save Trade Name
  const handleSaveTradeName = (tradeId: string) => {
    const updatedName = tradeNames[tradeId] || '';
    onUpdateState((prev) => {
      const updated = prev.trades.map((t) => (t.id === tradeId ? { ...t, name: updatedName } : t));
      const nextState = { ...prev, trades: updated };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });
  };

  // Inline Risk Editing Handlers in Session Log
  const handleStartEditTradeRisk = (trade: CompletedTrade) => {
    setEditingRiskTradeId(trade.id);
    setEditRiskDraft(String(trade.riskDollars || ''));
  };

  const handleCancelEditTradeRisk = () => {
    setEditingRiskTradeId(null);
    setEditRiskDraft('');
  };

  const handleSaveTradeRisk = (tradeId: string, customVal?: number) => {
    const valToUse = typeof customVal === 'number' ? customVal : parseFloat(editRiskDraft);
    if (isNaN(valToUse) || valToUse <= 0) return;

    onUpdateState((prev) => {
      const updated = prev.trades.map((t) => {
        if (t.id === tradeId) {
          const acc = prev.accounts.find((a) => a.id === t.accountId);
          const maxDD = acc?.maxDrawdown || (activeAccount?.maxDrawdown || 2000);
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
      const nextState = { ...prev, trades: updated };
      broadcastTradeUpdated(tradeId, nextState);
      return nextState;
    });

    setEditingRiskTradeId(null);
    setEditRiskDraft('');
  };

  // Rule up/down reorder
  const handleMoveRule = (index: number, direction: 'up' | 'down') => {
    onUpdateState((prev) => {
      const newRules = [...prev.rules];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newRules.length) return prev;
      const temp = newRules[index];
      newRules[index] = newRules[targetIndex];
      newRules[targetIndex] = temp;
      return { ...prev, rules: newRules };
    });
  };

  // Start inline editing rule text
  const handleStartEditRule = (ruleId: string, currentText: string) => {
    setEditingRuleId(ruleId);
    setEditingRuleText(currentText);
  };

  // Save rule text
  const handleSaveRuleText = (ruleId: string) => {
    const trimmed = editingRuleText.trim();
    if (!trimmed) {
      setEditingRuleId(null);
      return;
    }
    onUpdateState((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, text: trimmed } : r)),
    }));
    setEditingRuleId(null);
  };

  // Cancel rule text editing
  const handleCancelEditRule = () => {
    setEditingRuleId(null);
    setEditingRuleText('');
  };

  // Centralized System Tag Creation (Strict Max 10 limit)
  const handleAddSystemTag = () => {
    const trimmed = newSystemTagInput.trim().replace(/^#+/, '');
    if (!trimmed) return;

    if (currentSystemTags.length >= 10) {
      setTagErrorFeedback('Maximum limit of 10 tags reached. Delete a tag to add a new one.');
      setTimeout(() => setTagErrorFeedback(null), 4000);
      return;
    }

    if (currentSystemTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagErrorFeedback(`Tag "${trimmed}" already exists.`);
      setTimeout(() => setTagErrorFeedback(null), 3000);
      return;
    }

    const updated = [...currentSystemTags, trimmed].slice(0, 10);
    onUpdateState((prev) => ({
      ...prev,
      systemTags: updated,
    }));
    setNewSystemTagInput('');
    setTagErrorFeedback(null);
  };

  // Centralized System Tag Edit/Save
  const handleSaveSystemTag = (index: number) => {
    const trimmed = editingSystemTagText.trim().replace(/^#+/, '');
    if (!trimmed) {
      setEditingSystemTagIndex(null);
      return;
    }

    if (
      currentSystemTags.some(
        (t, idx) => idx !== index && t.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      setTagErrorFeedback(`Tag "${trimmed}" already exists.`);
      setTimeout(() => setTagErrorFeedback(null), 3000);
      return;
    }

    const updated = [...currentSystemTags];
    updated[index] = trimmed;
    onUpdateState((prev) => ({
      ...prev,
      systemTags: updated,
    }));
    setEditingSystemTagIndex(null);
    setEditingSystemTagText('');
    setTagErrorFeedback(null);
  };

  // Centralized System Tag Delete
  const handleDeleteSystemTag = (index: number) => {
    const updated = currentSystemTags.filter((_, idx) => idx !== index);
    onUpdateState((prev) => ({
      ...prev,
      systemTags: updated,
    }));
    if (editingSystemTagIndex === index) {
      setEditingSystemTagIndex(null);
      setEditingSystemTagText('');
    }
    setTagErrorFeedback(null);
  };

  // Apply Tag To Trade Notes
  const handleApplyTagToNote = (tagName: string) => {
    const cleanTag = `#${tagName.replace(/^#+/, '')}`;
    setConsolidatedNote((prev) => {
      if (!prev || !prev.trim()) return cleanTag;
      if (prev.includes(cleanTag)) return prev;
      return `${prev.trim()} ${cleanTag}`;
    });
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    if (confirm('Restore default pre-trade checklist rules?')) {
      onUpdateState((prev) => ({
        ...prev,
        rules: [
          { id: 'r1', text: 'HTF IS CLEAR NOT CHOP?', checked: false },
          { id: 'r2', text: 'IB OR FRB SETUP', checked: false },
          { id: 'r3', text: "HH/HL's or LH/LL's", checked: false },
        ].slice(0, 5),
      }));
    }
  };

  // Live Daily Scoreboard Tally Calculations for Session View
  const todayTradesCount = state.trades.length;
  const todayPlannedTradesCount = state.trades.filter((t) => t.plannedStatus === 'planned').length;
  const todayUnplannedTradesCount = state.trades.filter((t) => t.plannedStatus === 'unplanned').length;
  const todayWellManagedExitsCount = state.trades.filter((t) => t.discipline === 'managed_well').length;
  const todayEmotionalExitsCount = state.trades.filter((t) => t.discipline === 'exited_emotionally').length;
  const todaySessionPnl = state.trades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  const todayRuleAdherence =
    todayTradesCount === 0
      ? 100
      : Math.round((todayPlannedTradesCount / todayTradesCount) * 100);

  const activeFeel = state.emotionalTracker.feelLevel ?? morningFeelLevel ?? 5;
  const activeFeelItem = FEEL_SCALE.find((f) => f.level === activeFeel);
  const activeFeelDeviation = Math.abs(activeFeel - 5);
  const todayEmoConsistency = Math.max(40, 100 - activeFeelDeviation * 12);
  const todayProcessScore = Math.min(
    100,
    Math.round(todayRuleAdherence * 0.55 + todayEmoConsistency * 0.45)
  );
  const isCleanSession = state.tiltScore === 0 && todayUnplannedTradesCount === 0;

  const handleQuickCalibrateFeel = (level: number) => {
    setMorningFeelLevel(level);
    const feelItem = FEEL_SCALE.find((f) => f.level === level);
    const feelDeviation = Math.abs(level - 5);
    const emoConsistency = Math.max(40, 100 - feelDeviation * 12);
    const dailyScore = Math.min(100, Math.round(todayRuleAdherence * 0.55 + emoConsistency * 0.45));

    onUpdateState((prev) => {
      const updatedEmotionalTracker = {
        ...prev.emotionalTracker,
        feelLevel: level,
        updatedAt: todayStr,
        morningCheckInDate: todayStr,
        morningCheckInCompleted: true,
      };

      const existingScoreboard = prev.dailyScoreboard || DEFAULT_SCOREBOARD_TALLY;
      const todayIndex = existingScoreboard.findIndex((s) => s.date === todayStr);
      let updatedScoreboard = [...existingScoreboard];

      if (todayIndex >= 0) {
        updatedScoreboard[todayIndex] = {
          ...updatedScoreboard[todayIndex],
          feelLevel: level,
          emotionalConsistencyPercent: emoConsistency,
          dailyProcessScore: dailyScore,
        };
      } else {
        updatedScoreboard = [
          {
            id: `sb-today-${todayStr}`,
            date: todayStr,
            dayLabel: `Today (${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`,
            feelLevel: level,
            morningNotes: prev.emotionalTracker.morningNotes || '',
            walkOutNotes: '',
            dailyProcessScore: dailyScore,
            emotionalConsistencyPercent: emoConsistency,
            ruleAdherencePercent: todayRuleAdherence,
            tradesCount: prev.trades.length,
            plannedTradesCount: prev.trades.filter((t) => t.plannedStatus === 'planned').length,
            unplannedTradesCount: prev.trades.filter((t) => t.plannedStatus === 'unplanned').length,
            wellManagedExitsCount: prev.trades.filter((t) => t.discipline === 'managed_well').length,
            emotionalExitsCount: prev.trades.filter((t) => t.discipline === 'exited_emotionally').length,
            pnl: prev.trades.reduce((acc, t) => acc + (t.pnl || 0), 0),
            isCleanDay: prev.tiltScore === 0,
            status: 'clean',
          },
          ...existingScoreboard,
        ];
      }

      return {
        ...prev,
        emotionalTracker: updatedEmotionalTracker,
        dailyScoreboard: updatedScoreboard,
      };
    });
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto space-y-6">
      {/* Unplanned Trade Feedback Toast */}
      {unplannedFeedback && (
        <div className="p-3 bg-amber-950/90 border border-amber-500/50 rounded-2xl flex items-center gap-2 text-amber-200 text-xs font-bold animate-in fade-in">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Unplanned trade clicked. Tilt score raised by 1. Step back and breathe before your next click.</span>
        </div>
      )}

      {/* PENDING / LOCKED MORNING CHECK-IN PROMINENT BANNER */}
      {!isCheckInCompletedToday && (
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/90 via-[#142329] to-[#0a181e] border-2 border-amber-500/70 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md bg-amber-500 text-black font-black text-[10px] uppercase tracking-wider">
                  Trading Locked
                </span>
                <span className="text-xs font-bold text-amber-300">
                  Morning Mood Check-In Required for Today
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white">
                Answer today's 1-question mindset check-in to unlock trading &amp; logging
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Calibrate your emotional baseline (Anchor 5: <span className="text-emerald-300 font-bold">Cool as a Cucumber 🥒</span>) before trading. Checklist rules, position sizing, and trade logging are locked until submitted.
              </p>
            </div>
          </div>
          <button
            type="button"
            id="unlock-session-banner-btn"
            onClick={() => setShowMorningCheckInModal(true)}
            className="w-full md:w-auto px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Sun className="w-4 h-4 fill-black" />
            <span>Answer Check-In (1 Question) &amp; Unlock →</span>
          </button>
        </div>
      )}

      {/* TOP DESK CONTROL BAR */}
      <div className="p-4 bg-[#081726] border border-[#163852] rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#143247] pb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            {isCheckInCompletedToday ? (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                <span className="text-xs font-black tracking-wider text-sky-400 uppercase">
                  READY
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#0e273a] border border-sky-500/30 text-sky-200 font-mono text-[11px] font-bold">
                  Day {state.dayCounter || 1}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-xs font-black tracking-wider text-amber-400 uppercase flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  LOCKED &bull; CHECK-IN REQUIRED
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#221a0d] border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold">
                  Day {state.dayCounter || 1}
                </span>
              </div>
            )}

            {/* Status Symbol Badge & No Tilt Days Tracker */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#061420] border border-[#153850] text-[11px] font-bold text-slate-200">
              <Shield className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-sky-300 font-black">Status:</span>
              <span className="text-white capitalize">{state.currentTier || 'Rules Student'}</span>
              <span className="text-slate-500">&bull;</span>
              <Flame className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-mono text-sky-300 font-black">{state.cleanStreak || 0} No Tilt Days</span>
            </div>
          </div>

          {/* Account Indicator & Two Distinct Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Morning Check-In Status Button */}
            <button
              id="header-morning-checkin-btn"
              onClick={() => setShowMorningCheckInModal(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                isCheckInCompletedToday
                  ? 'bg-[#0a232b] hover:bg-[#0f2e38] text-emerald-300 border border-emerald-500/40 shadow-xs'
                  : 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400 font-black shadow-md animate-pulse'
              }`}
              title="Record or review your morning emotional check-in & sleep memo"
            >
              <Sun className={`w-3.5 h-3.5 ${isCheckInCompletedToday ? 'text-emerald-400' : 'text-black fill-black'}`} />
              {isCheckInCompletedToday ? (
                <span>
                  Check-In: {state.emotionalTracker.feelLevel === 5 ? '🥒 Cool as a Cucumber (5)' : `Level ${state.emotionalTracker.feelLevel}/10`}
                </span>
              ) : (
                <span>🔒 Complete Check-In to Unlock</span>
              )}
            </button>

            {hasValidAccountAndDrawdown && activeAccount && (
              <div className="px-3 py-1.5 bg-[#071318] border border-[#183442] rounded-xl text-xs flex items-center gap-2">
                <span className="text-slate-400 font-medium">Active Book:</span>
                <span className="font-bold text-white">
                  {activeAccount.name}
                </span>
                {activeAccount.maxDrawdown && (
                  <span className="text-emerald-400 font-semibold text-[11px]">
                    (${activeAccount.maxDrawdown?.toLocaleString()} Max DD)
                  </span>
                )}
              </div>
            )}

            {/* Primary + New Account Button */}
            <button
              id="header-new-account-btn"
              onClick={() => resetAndOpenAddAccountModal('live')}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              title="Create a new trading account book"
            >
              <Plus className="w-3.5 h-3.5 fill-black stroke-[3]" />
              <span>+ New Account</span>
            </button>

            {/* Switch Account Dropdown / Selector Button */}
            <button
              id="header-switch-account-btn"
              onClick={() => setShowSwitchAccount(!showSwitchAccount)}
              className={`px-3 py-1.5 border rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                showSwitchAccount
                  ? 'bg-[#183747] text-white border-emerald-500/60 shadow-xs'
                  : 'bg-[#102027] hover:bg-[#162d37] text-slate-200 border-[#1e3845]'
              }`}
              title="Jump between active books"
            >
              <span>Switch Account</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                  showSwitchAccount ? 'rotate-180 text-emerald-400' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Switch Account Popover / Drawer */}
        {showSwitchAccount && (
          <div className="p-3.5 bg-[#0a181e] border border-[#1b3542] rounded-2xl shadow-xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-[#142933] pb-2">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active Trading Books ({state.accounts.filter((a) => a.status !== 'blown').length})</span>
              </div>
              <button
                onClick={() => setShowSwitchAccount(false)}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>

            {state.accounts.filter((a) => a.status !== 'blown').length === 0 ? (
              <div className="p-3 bg-[#081216] border border-[#142630] rounded-xl text-xs text-slate-400 flex items-center justify-between">
                <span>No books available.</span>
                <button
                  onClick={() => {
                    setShowSwitchAccount(false);
                    resetAndOpenAddAccountModal('live');
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add an account</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {state.accounts
                  .filter((acc) => acc.status !== 'blown')
                  .map((acc) => {
                    const isSelected = acc.id === state.activeAccountId;
                    const isLive = acc.accountType === 'live';
                    return (
                      <button
                        key={acc.id}
                        onClick={() => {
                          onUpdateState((prev) => ({ ...prev, activeAccountId: acc.id }));
                          setShowSwitchAccount(false);
                        }}
                        className={`p-3 text-left rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-[#0e2730] border-emerald-500/80 text-white shadow-sm'
                            : 'bg-[#0e1c23] border-[#183340] text-slate-300 hover:bg-[#142a35] hover:border-[#204557]'
                        }`}
                      >
                        <div className="space-y-0.5 truncate">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                isLive
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              {isLive ? 'LIVE' : 'EVAL'}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{acc.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {acc.size > 0 ? `$${acc.size.toLocaleString()} • ` : ''}Max DD: ${acc.maxDrawdown.toLocaleString()}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => {
                  setShowSwitchAccount(false);
                  resetAndOpenAddAccountModal('live');
                }}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Create another account book</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clean Morning Mood Check-In Status Strip */}
      <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-sm shrink-0">
            🥒
          </div>
          <div className="text-xs">
            <span className="font-bold text-slate-300">Morning Mood Baseline: </span>
            {isCheckInCompletedToday ? (
              <span className="font-black text-emerald-300">
                Level {state.emotionalTracker.feelLevel}/10 ({activeFeelItem?.title || 'Cool as a Cucumber'})
              </span>
            ) : (
              <span className="font-bold text-amber-400">Not checked in yet today</span>
            )}
            {state.emotionalTracker.morningNotes && (
              <span className="text-slate-400 font-medium ml-1.5 hidden md:inline">
                &bull; "{state.emotionalTracker.morningNotes}"
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMorningCheckInModal(true)}
            className="px-2.5 py-1 bg-[#122832] hover:bg-[#183441] text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1.5"
          >
            <Sun className="w-3 h-3 text-amber-400" />
            <span>{isCheckInCompletedToday ? 'Update Mood' : 'Take Morning Check-In'}</span>
          </button>
          <button
            type="button"
            onClick={() => onUpdateState((prev) => ({ ...prev, currentView: 'tracker' }))}
            className="px-2.5 py-1 bg-[#0b161b] hover:bg-[#13232b] text-slate-400 hover:text-white border border-[#182d38] rounded-lg text-[11px] font-bold cursor-pointer transition-all flex items-center gap-1"
          >
            <Activity className="w-3 h-3 text-slate-400" />
            <span>View Tracker</span>
          </button>
        </div>
      </div>
      <div id="trade-filter-section" className="bg-[#0b1a26] border border-[#16354d] rounded-2xl p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#142f45] pb-3">
          <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <span>THE TRADER FILTER</span>
          </h2>
          <span className="text-[11px] font-mono font-bold text-slate-400 bg-[#071520] px-2.5 py-1 rounded-lg border border-[#173752]">
            {state.rules.length}/5 RULES ACTIVE
          </span>
        </div>

        {/* 2-Column Responsive Layout: Pre-Trade Workflow & Standalone Filter Control Box */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: The Pre-Trade Rules Workflow (lg:col-span-7 xl:col-span-7 space-y-3.5) */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-3.5">
            {/* Primary Action Buttons Row - Positioned directly above where the checklist rules start */}
            <div
              id="top-take-trade-action-area"
              className="p-3 sm:p-3.5 bg-[#081318] border border-[#162b37] rounded-xl space-y-2.5 shadow-md"
            >
              {/* Top Row: Active Account Name Clearly Retained & Status Indicator */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap border-b border-[#12242f] pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Active Account Name clearly displayed */}
                  <div
                    id="top-area-account-display"
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#0b1c24] border border-[#1a3848] text-xs font-bold text-slate-200 shadow-xs"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Account:</span>
                    <span className="text-emerald-300 font-black">
                      {activeAccount ? activeAccount.name : 'No Account Selected'}
                    </span>
                    {activeAccount?.maxDrawdown ? (
                      <span className="text-[10px] font-mono text-slate-400 font-normal border-l border-[#1f4253] pl-1.5 ml-0.5">
                        ${activeAccount.maxDrawdown.toLocaleString()} Max DD
                      </span>
                    ) : null}
                  </div>

                  {/* Sizing Status Pill - Delegated to Sizing Calculator */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRuleFocus('q4');
                      const calcEl = document.getElementById('account-sizing-tier-cards');
                      if (calcEl) {
                        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer flex items-center gap-1 ${
                      explicitRiskAmount
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                    }`}
                    title="All risk sizing is handled in the Max Drawdown & Sizing Calculator"
                  >
                    <Calculator className="w-3 h-3 shrink-0" />
                    <span>
                      {explicitRiskAmount
                        ? `Risk: $${explicitRiskAmount} (${selectedQuality === 'A_PLUS' ? 'A+' : selectedQuality})`
                        : 'Risk: Set in Calculator Below'}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  <span
                    className={`px-2 py-0.5 rounded-md ${
                      isAllRulesMet
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-[#0b1820] text-slate-400 border border-[#162a34]'
                    }`}
                  >
                    {isAllRulesMet ? 'All Rules Cleared' : 'Filter Pending'}
                  </span>
                </div>
              </div>

              {/* Action Buttons: TAKE THE TRADE and SKIPPED THE TRADE */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* TAKE THE TRADE */}
                <button
                  id="take-the-trade-top-btn"
                  type="button"
                  onClick={handleTakeTheTrade}
                  disabled={tradeInPosition}
                  className={`px-4 py-2 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 ${
                    !isCheckInCompletedToday
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/40 ring-2 ring-amber-400/60 animate-pulse cursor-pointer'
                      : filterSavedFeedback
                      ? 'bg-emerald-400 text-black cursor-pointer'
                      : tradeInPosition
                      ? 'bg-[#15231c] text-emerald-300 border-2 border-emerald-500/50 cursor-not-allowed opacity-95 shadow-emerald-950/30'
                      : explicitRiskAmount
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40 cursor-pointer'
                      : 'bg-emerald-600/80 hover:bg-emerald-500 text-black shadow-emerald-950/40 cursor-pointer'
                  }`}
                  title={tradeInPosition ? 'In a trade: Resolve current trade in Outcome Tracker before taking a new setup' : undefined}
                >
                  {!isCheckInCompletedToday ? (
                    <>
                      <Lock className="w-4 h-4 stroke-[2.5]" />
                      <span>🔒 COMPLETE MORNING CHECK-IN TO UNLOCK TRADING</span>
                    </>
                  ) : filterSavedFeedback ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>TRADE TAKEN!</span>
                    </>
                  ) : tradeInPosition ? (
                    <>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                      <span>
                        IN A TRADE &bull; {activeAccount ? activeAccount.name : 'Account'} ({explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Active'})
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        TAKE THE TRADE ({activeAccount ? activeAccount.name : 'Account'} &bull;{' '}
                        {firstUnverifiedQuestion
                          ? `Verify ${firstUnverifiedQuestion.title}`
                          : explicitRiskAmount
                          ? `$${explicitRiskAmount} Risk`
                          : 'Set Risk in Calculator'}
                        )
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* Skipped Trade Banner Confirmation */}
              {skipTradeFeedback && (
                <div
                  id="skip-trade-alert-banner"
                  className="p-2.5 rounded-xl bg-[#091b24] border border-sky-500/50 text-sky-200 text-xs flex items-center justify-between gap-2 shadow-md animate-in fade-in"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="font-bold">
                      Trade Skipped & Setup Cancelled: Account drawdown & capital protected. Checklist reset to fresh state.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkipTradeFeedback(false)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>PRE-TRADE CHECKLIST OVERVIEW</span>
                <span className="px-2 py-0.5 rounded-full bg-[#12242e] border border-[#1b3746] text-[10px] font-mono font-bold text-slate-300">
                  {state.rules.length}/5 RULES (MAX 5)
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-normal normal-case">
                Click rule text to edit inline
              </span>
            </div>

            <div className="space-y-2.5">
              {state.rules.map((rule, idx) => {
                const isYes = ruleCheckboxes[rule.id] === true;
                const isNo = ruleCheckboxes[rule.id] === false;
                const isOverridden = overriddenRules[rule.id] === true;
                const isActive = activeRuleFocus === rule.id;
                const isUnlocked = isStepUnlocked(rule.id);

                return (
                  <div
                    key={rule.id}
                    id={`rule-card-${rule.id}`}
                    onClick={() => handleSelectStep(rule.id)}
                    className={`p-3.5 rounded-xl text-xs transition-all space-y-2 cursor-pointer ${
                      !isUnlocked
                        ? 'border border-[#132530] bg-[#071318] opacity-60 hover:opacity-85'
                        : isActive
                        ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                        : isYes
                        ? 'border border-emerald-500/40 bg-[#0c1f26]'
                        : isNo && isOverridden
                        ? 'border border-amber-500/40 bg-[#16160e]'
                        : isNo
                        ? 'border border-rose-900/60 bg-[#161a1d]'
                        : 'border border-[#17303d] bg-[#0c181e] opacity-90 hover:opacity-100 hover:border-[#22485c]'
                    }`}
                  >
                    {/* Top Row: Index, Rule Text (Inline Editable), Status Pill, Reorder */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-500 font-bold text-xs w-4 shrink-0">{idx + 1}</span>

                        {/* Inline Editable Rule Text */}
                        {editingRuleId === rule.id ? (
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingRuleText}
                              onChange={(e) => setEditingRuleText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRuleText(rule.id);
                                if (e.key === 'Escape') handleCancelEditRule();
                              }}
                              autoFocus
                              placeholder="Enter rule text..."
                              className="w-full px-2.5 py-1 text-xs font-bold bg-[#08151a] border border-emerald-400 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRuleText(rule.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded cursor-pointer shrink-0"
                              title="Save rule text"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditRule}
                              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded cursor-pointer shrink-0"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 flex-1 min-w-0 group/rule">
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditRule(rule.id, rule.text);
                              }}
                              className="tracking-wide text-xs font-bold text-slate-200 hover:text-emerald-300 transition-colors truncate cursor-pointer"
                              title="Click to edit rule text"
                            >
                              {rule.text}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEditRule(rule.id, rule.text);
                              }}
                              className="opacity-60 group-hover/rule:opacity-100 p-0.5 text-slate-400 hover:text-emerald-300 transition-opacity cursor-pointer shrink-0"
                              title="Edit rule text inline"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {isActive && (
                              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                                </span>
                                <span>Active</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Status badge - Reflects answer from consolidated control box */}
                        {isYes ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>YES</span>
                          </span>
                        ) : isNo && isOverridden ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Override</span>
                          </span>
                        ) : isNo ? (
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <X className="w-3 h-3 stroke-[3]" />
                            <span>NO</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-[#081418] border border-[#17303d] text-slate-400 text-[10px] font-bold">
                            Pending
                          </span>
                        )}

                        {/* Reorder Buttons */}
                        <div className="flex items-center text-slate-500">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRule(idx, 'up');
                            }}
                            disabled={idx === 0}
                            className="p-1 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveRule(idx, 'down');
                            }}
                            disabled={idx === state.rules.length - 1}
                            className="p-1 hover:text-slate-200 disabled:opacity-20 cursor-pointer"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Question 4: Max Drawdown & Sizing Calculator directly embedded in workflow */}
            {(() => {
              const isQ4Unlocked = isStepUnlocked('q4');
              const isQ4Active = activeRuleFocus === 'q4';
              const isQ4Overridden = overriddenRules['q4'] === true;
              return (
                <div
                  id="account-sizing-tier-cards"
                  onClick={() => handleSelectStep('q4')}
                  className={`p-3.5 rounded-xl text-xs transition-all space-y-2.5 cursor-pointer ${
                    !isQ4Unlocked
                      ? 'border border-[#132530] bg-[#071318] opacity-65 hover:opacity-85'
                      : isQ4Active
                      ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                      : q4Risk === true
                      ? 'border border-emerald-500/40 bg-[#0c1f26]'
                      : q4Risk === false && isQ4Overridden
                      ? 'border border-amber-500/40 bg-[#16160e]'
                      : q4Risk === false
                      ? 'border border-rose-900/60 bg-[#161a1d]'
                      : 'border border-[#17303d] bg-[#0c181e] opacity-90 hover:opacity-100 hover:border-[#22485c]'
                  }`}
                >
                  {/* Top Row: Index, Rule Text, Active Tag, Status Pill - Standardized with Rule 1-3 & Q5 */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-500 font-bold text-xs w-4 shrink-0">4</span>
                      <span className="tracking-wide text-xs font-bold text-slate-200 truncate">
                        Have you calculated your risk?
                      </span>
                      <span className="text-[10px] text-slate-400 font-normal hidden md:inline truncate">
                        &bull; Max Drawdown &amp; Sizing
                      </span>
                      {!isQ4Unlocked ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0d1e28] border border-[#1a384b] text-slate-400 text-[10px] font-bold shrink-0">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>Complete Rules 1–{state.rules.length} First</span>
                        </span>
                      ) : isQ4Active ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {!isQ4Unlocked ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#071318] border border-[#142934] text-slate-500 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Step 4 Locked</span>
                        </span>
                      ) : q4Risk === true ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>SIZED ({explicitRiskAmount ? `$${explicitRiskAmount}` : 'Custom'})</span>
                        </span>
                      ) : q4Risk === false && isQ4Overridden ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Override</span>
                        </span>
                      ) : q4Risk === false ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3 h-3 stroke-[3]" />
                          <span>NO</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#081418] border border-[#17303d] text-slate-400 text-[10px] font-bold">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Calculator Body - Fully Rendered and Active at All Times */}
                  <div className="space-y-2.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
                    {/* Dynamic Account Connection & Max Drawdown Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#081318] p-2 rounded-lg border border-[#142934]">
                      <div className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Account:</span>
                        <select
                          id="calculator-account-selector"
                          value={state.activeAccountId || ''}
                          onChange={(e) => {
                            const accId = e.target.value;
                            onUpdateState((prev) => ({ ...prev, activeAccountId: accId }));
                            if (accId) {
                              const acc = state.accounts.find((a) => a.id === accId);
                              if (acc && acc.maxDrawdown) {
                                const dd = acc.maxDrawdown;
                                setMaxDrawdownInput(dd.toString());
                                setRiskAmounts({
                                  B: Math.max(5, Math.round(dd * 0.05)),
                                  A: Math.max(10, Math.round(dd * 0.10)),
                                  A_PLUS: Math.max(15, Math.round(dd * 0.15)),
                                });
                              }
                            }
                          }}
                          className="bg-[#0f2027] border border-[#1c3644] text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1 focus:outline-none flex-1 truncate cursor-pointer"
                        >
                          <option value="">Manual Entry (No Account Linked)</option>
                          {state.accounts.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} (${acc.maxDrawdown?.toLocaleString()} Max DD &bull; {acc.accountType?.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">Max DD:</span>
                        <div className="relative flex items-center">
                          <span className="absolute left-2 text-[11px] text-slate-400 font-bold">$</span>
                          <input
                            id="calculator-max-drawdown-input"
                            type="number"
                            value={maxDrawdownInput}
                            onChange={(e) => handleMaxDrawdownChange(e.target.value)}
                            placeholder="2000"
                            className="w-24 pl-5 pr-2 py-1 bg-[#0f2027] border border-[#1c3644] text-white text-xs font-bold rounded-lg focus:outline-none focus:border-emerald-500/60"
                          />
                        </div>
                        {activeAccount && (
                          <span className="text-[9px] text-emerald-400 font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
                            Linked
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3 Quality Sizing Buttons: B (5%), A (10%), A+ (15%) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* B (5%) */}
                      <div
                        id="preset-risk-tier-b"
                        onClick={() => {
                          const val = riskAmounts.B;
                          setSelectedQuality('B');
                          setCustomRiskInput(String(val));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                          setLossAmountInput(String(val));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'B' || customRiskInput === String(riskAmounts.B)
                            ? 'bg-[#102c2e] border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/40'
                            : 'bg-[#081418] border-[#152a35] hover:border-[#1d3d4e]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>B Setup</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = Math.max(5, riskAmounts.B - 25);
                                setRiskAmounts((prev) => ({ ...prev, B: nextVal }));
                                setSelectedQuality('B');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Decrease B tier risk by $25"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.B + 25;
                                setRiskAmounts((prev) => ({ ...prev, B: nextVal }));
                                setSelectedQuality('B');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Increase B tier risk by $25"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-xs font-black text-white mt-0.5">5%</div>
                        <div className="text-[11px] font-bold text-emerald-400">
                          ${riskAmounts.B}
                        </div>
                      </div>

                      {/* A (10%) */}
                      <div
                        id="preset-risk-tier-a"
                        onClick={() => {
                          const val = riskAmounts.A;
                          setSelectedQuality('A');
                          setCustomRiskInput(String(val));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                          setLossAmountInput(String(val));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'A' || customRiskInput === String(riskAmounts.A)
                            ? 'bg-[#102c2e] border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/40'
                            : 'bg-[#081418] border-[#152a35] hover:border-[#1d3d4e]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>A Setup</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = Math.max(10, riskAmounts.A - 50);
                                setRiskAmounts((prev) => ({ ...prev, A: nextVal }));
                                setSelectedQuality('A');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Decrease A tier risk by $50"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.A + 50;
                                setRiskAmounts((prev) => ({ ...prev, A: nextVal }));
                                setSelectedQuality('A');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Increase A tier risk by $50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-xs font-black text-white mt-0.5">10%</div>
                        <div className="text-[11px] font-bold text-emerald-400">
                          ${riskAmounts.A}
                        </div>
                      </div>

                      {/* A+ (15%) */}
                      <div
                        id="preset-risk-tier-aplus"
                        onClick={() => {
                          const val = riskAmounts.A_PLUS;
                          setSelectedQuality('A_PLUS');
                          setCustomRiskInput(String(val));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                          setLossAmountInput(String(val));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'A_PLUS' || customRiskInput === String(riskAmounts.A_PLUS)
                            ? 'bg-[#102c2e] border-emerald-500/60 shadow-xs ring-1 ring-emerald-500/40'
                            : 'bg-[#081418] border-[#152a35] hover:border-[#1d3d4e]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                          <span>A+ Setup</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = Math.max(15, riskAmounts.A_PLUS - 50);
                                setRiskAmounts((prev) => ({ ...prev, A_PLUS: nextVal }));
                                setSelectedQuality('A_PLUS');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Decrease A+ tier risk by $50"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.A_PLUS + 50;
                                setRiskAmounts((prev) => ({ ...prev, A_PLUS: nextVal }));
                                setSelectedQuality('A_PLUS');
                                setCustomRiskInput(String(nextVal));
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(String(nextVal));
                              }}
                              className="px-1 hover:text-white"
                              title="Increase A+ tier risk by $50"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="text-xs font-black text-white mt-0.5">15%</div>
                        <div className="text-[11px] font-bold text-emerald-400">
                          ${riskAmounts.A_PLUS}
                        </div>
                      </div>
                    </div>

                    {/* Active Sizing Status Callout */}
                    <div className="p-2.5 bg-[#061217] border border-[#142833] rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-teal-400 shrink-0" />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">Trade Sizing:</span>
                          {explicitRiskAmount ? (
                            <span className="text-emerald-400 font-extrabold font-mono text-xs">
                              ${explicitRiskAmount}{' '}
                              <span className="text-slate-400 font-normal">
                                ({selectedQuality === 'A_PLUS' ? 'A+' : selectedQuality} Setup &bull;{' '}
                                {((explicitRiskAmount / (parseFloat(maxDrawdownInput) || 2000)) * 100).toFixed(1)}% of DD)
                              </span>
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold text-xs">
                              Select a preset risk box above or click a quick-fill button below
                            </span>
                          )}
                        </div>
                      </div>
                      {explicitRiskAmount ? (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                          Sized for Execution
                        </span>
                      ) : null}
                    </div>

                    {/* Sizing & Target Inputs (Custom Risk + Optional Take Profit) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {/* Custom Risk Input & Quick-Fill Presets */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Risk Amount ($):</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            Active: {explicitRiskAmount ? `$${explicitRiskAmount}` : 'Not set'}
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                          <input
                            id="calculator-custom-risk-input"
                            type="number"
                            value={customRiskInput}
                            onChange={(e) => {
                              setCustomRiskInput(e.target.value);
                              const val = parseFloat(e.target.value);
                              if (!isNaN(val) && val > 0) {
                                setQ4Risk(true);
                                setOverriddenRules((p) => ({ ...p, q4: false }));
                                setLossAmountInput(e.target.value);
                              }
                            }}
                            placeholder="Input risk $"
                            className="w-full pl-6 pr-2 py-1.5 bg-[#0f2027] border border-[#1c3644] text-white text-xs font-bold rounded-lg focus:outline-none focus:border-emerald-500/60"
                          />
                        </div>

                        {/* Quick-Fill Preset Risk Buttons */}
                        <div className="space-y-1 pt-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                            <span>Quick-Fill Presets:</span>
                            <span className="text-slate-500 font-normal">Click to auto-input</span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {[
                              { label: 'B ($' + riskAmounts.B + ')', val: riskAmounts.B, tier: 'B' as const },
                              { label: 'A ($' + riskAmounts.A + ')', val: riskAmounts.A, tier: 'A' as const },
                              { label: 'A+ ($' + riskAmounts.A_PLUS + ')', val: riskAmounts.A_PLUS, tier: 'A_PLUS' as const },
                              { label: '$50', val: 50 },
                              { label: '$100', val: 100 },
                              { label: '$150', val: 150 },
                              { label: '$200', val: 200 },
                              { label: '$250', val: 250 },
                              { label: '$300', val: 300 },
                              { label: '$500', val: 500 },
                            ].map((preset, pIdx) => {
                              const isSelected = customRiskInput === String(preset.val);
                              return (
                                <button
                                  key={pIdx}
                                  type="button"
                                  onClick={() => {
                                    setCustomRiskInput(String(preset.val));
                                    if (preset.tier) {
                                      setSelectedQuality(preset.tier);
                                    } else {
                                      if (preset.val === riskAmounts.B) setSelectedQuality('B');
                                      else if (preset.val === riskAmounts.A) setSelectedQuality('A');
                                      else if (preset.val === riskAmounts.A_PLUS) setSelectedQuality('A_PLUS');
                                    }
                                    setQ4Risk(true);
                                    setOverriddenRules((p) => ({ ...p, q4: false }));
                                    setLossAmountInput(String(preset.val));
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                                    isSelected
                                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 ring-1 ring-emerald-500/40'
                                      : 'bg-[#0b171c] hover:bg-[#12252e] border-[#18313d] text-slate-300 hover:text-white'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Optional Take Profit Target */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Take Profit Target:</span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-[#08151c] px-1.5 py-0.2 rounded border border-[#163342]">
                            Optional
                          </span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                          <input
                            id="calculator-take-profit-input"
                            type="number"
                            value={optionalTakeProfitInput}
                            onChange={(e) => setOptionalTakeProfitInput(e.target.value)}
                            placeholder="e.g. 400 (Optional)"
                            className="w-full pl-6 pr-20 py-1.5 bg-[#0f2027] border border-[#1c3644] text-white text-xs font-bold rounded-lg focus:outline-none focus:border-emerald-500/60 placeholder:text-slate-600"
                          />
                          {(() => {
                            const tp = parseFloat(optionalTakeProfitInput);
                            if (!isNaN(tp) && tp > 0 && acceptedRisk > 0) {
                              const projectedR = (tp / acceptedRisk).toFixed(1);
                              return (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                                  {projectedR}R Target
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Quick Confirmation Bar */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#132833]">
                      <button
                        type="button"
                        id="confirm-risk-sized-btn"
                        onClick={() => {
                          if (!explicitRiskAmount) {
                            setCustomRiskInput(String(riskAmounts[selectedQuality] ?? 200));
                          }
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                          setActiveRuleFocus('q5');
                        }}
                        className="py-1.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Confirm Risk ({explicitRiskAmount ? `$${explicitRiskAmount}` : `$${riskAmounts[selectedQuality] ?? 200}`}) &rarr;</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQ4Risk(false);
                          setOverriddenRules((p) => ({ ...p, q4: true }));
                          setActiveRuleFocus('q5');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Override
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Question 5: This is not a revenge or FOMO click (REQUIRED) */}
            {(() => {
              const isQ5Unlocked = isStepUnlocked('q5');
              const isQ5Active = activeRuleFocus === 'q5';
              const isQ5Overridden = overriddenRules['q5'] === true;
              return (
                <div
                  id="rule-card-q5"
                  onClick={() => handleSelectStep('q5')}
                  className={`p-3.5 rounded-xl text-xs transition-all space-y-2 cursor-pointer ${
                    !isQ5Unlocked
                      ? 'border border-[#132530] bg-[#071318] opacity-65 hover:opacity-85'
                      : isQ5Active
                      ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                      : q5NotFomo === true
                      ? 'border border-emerald-500/40 bg-[#0c1f26]'
                      : q5NotFomo === false && isQ5Overridden
                      ? 'border border-amber-500/40 bg-[#16160e]'
                      : q5NotFomo === false
                      ? 'border border-rose-900/60 bg-[#161a1d]'
                      : 'border border-[#17303d] bg-[#0c181e] opacity-90 hover:opacity-100 hover:border-[#22485c]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-slate-500 font-bold text-xs w-4 shrink-0">5</span>
                      <span className="tracking-wide text-xs font-bold text-slate-200">
                        This is not a revenge or FOMO click
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-950/80 border border-rose-800 text-rose-400 text-[10px] font-black tracking-wider uppercase shrink-0">
                        REQUIRED
                      </span>
                      {!isQ5Unlocked ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0d1e28] border border-[#1a384b] text-slate-400 text-[10px] font-bold shrink-0">
                          <Lock className="w-2.5 h-2.5 text-slate-400" />
                          <span>Complete Step 4 (Risk) First</span>
                        </span>
                      ) : isQ5Active ? (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      ) : null}
                    </div>

                    <div className="shrink-0">
                      {!isQ5Unlocked ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#071318] border border-[#142934] text-slate-500 text-[10px] font-bold flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Step 5 Locked</span>
                        </span>
                      ) : q5NotFomo === true ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>YES</span>
                        </span>
                      ) : q5NotFomo === false && isQ5Overridden ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Override</span>
                        </span>
                      ) : q5NotFomo === false ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3 h-3 stroke-[3]" />
                          <span>NO</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-[#081418] border border-[#17303d] text-slate-400 text-[10px] font-bold">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Execution Buttons: EXECUTION TRADE and SKIPPED THE TRADE */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
              {/* EXECUTION TRADE */}
              <button
                id="execute-filtered-trade-btn"
                type="button"
                onClick={handleTakeTheTrade}
                disabled={tradeInPosition}
                className={`flex-1 py-3.5 px-4 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                  !isCheckInCompletedToday
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-950/40 ring-2 ring-amber-400/60 animate-pulse cursor-pointer'
                    : filterSavedFeedback
                    ? 'bg-emerald-400 text-black cursor-pointer'
                    : tradeInPosition
                    ? 'bg-[#15231c] text-emerald-300 border-2 border-emerald-500/50 cursor-not-allowed opacity-95 shadow-emerald-950/30'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40 cursor-pointer'
                }`}
                title={tradeInPosition ? 'In a trade: Resolve current trade outcome below before taking a new trade' : undefined}
              >
                {!isCheckInCompletedToday ? (
                  <>
                    <Lock className="w-4 h-4 stroke-[2.5]" />
                    <span>🔒 COMPLETE MORNING CHECK-IN TO UNLOCK TRADING</span>
                  </>
                ) : filterSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>TRADE EXECUTED! RECORD OUTCOME BELOW</span>
                  </>
                ) : tradeInPosition ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block shrink-0" />
                    <span>
                      IN A TRADE &bull; RESOLVE OUTCOME BELOW ({explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Active'})
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
                    <span>
                      EXECUTION TRADE (
                      {activeAccount ? activeAccount.name : 'Manual Sizing'} &bull;{' '}
                      {firstUnverifiedQuestion
                        ? `Verify ${firstUnverifiedQuestion.title}`
                        : explicitRiskAmount
                        ? `$${explicitRiskAmount} Risk`
                        : 'Set Risk in Calculator'}
                      )
                    </span>
                  </>
                )}
              </button>

              {/* SKIPPED THE TRADE */}
              <button
                id="execute-skip-trade-btn"
                type="button"
                onClick={handleSkipTheTrade}
                className="py-3.5 px-5 bg-[#14222b] hover:bg-[#1c303d] text-slate-200 hover:text-white border border-[#234354] hover:border-slate-400 text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                title="Chickened out or decided to pass? Cancel trade setup and reset checklist"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>SKIPPED THE TRADE</span>
              </button>
            </div>

            {/* Skipped Trade Banner Confirmation (Bottom) */}
            {skipTradeFeedback && (
              <div
                id="skip-trade-bottom-alert-banner"
                className="p-3 rounded-xl bg-[#091b24] border border-sky-500/50 text-sky-200 text-xs flex items-center justify-between gap-2 shadow-md animate-in fade-in"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="font-bold">
                    Trade Skipped & Setup Cancelled: Account drawdown & capital protected. Checklist reset to fresh state.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSkipTradeFeedback(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Outcome Status Banner (Routing feedback to Board Tab) */}
            {outcomeStatus && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-300 ${
                  outcomeStatus.type === 'winner'
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : outcomeStatus.feeling === 'feel_like_chasing'
                    ? 'bg-rose-950/70 border-rose-500/60 text-rose-200'
                    : outcomeStatus.feeling === 'frustrated'
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-200'
                    : 'bg-slate-900 border-slate-700 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {outcomeStatus.type === 'winner' ? (
                    <Trophy className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span className="font-semibold">{outcomeStatus.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateState((prev) => ({ ...prev, currentView: 'board' }))}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>View Board Tab</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* OUTCOME TRACKER BOX: Placed right immediately following trade button */}
            <div
              id="outcome-tracker-box"
              className={`p-4 rounded-2xl bg-[#09151b] border-2 transition-all space-y-3.5 shadow-xl ${
                !isCheckInCompletedToday
                  ? 'border-amber-500/40 shadow-black/40'
                  : tradeInPosition
                  ? 'border-amber-500/60 shadow-amber-950/30 ring-1 ring-amber-500/30'
                  : 'border-[#172d38] shadow-black/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[#142833] pb-2.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                    !isCheckInCompletedToday
                      ? 'bg-amber-500/20 text-amber-400'
                      : tradeInPosition
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {!isCheckInCompletedToday ? '🔒' : tradeInPosition ? '🔴' : '⚡'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Outcome Tracker {!isCheckInCompletedToday && <span className="text-amber-400 font-bold">(Locked)</span>}
                      </h3>
                      {tradeInPosition && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-[10px] font-black tracking-wider flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          IN A TRADE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {!isCheckInCompletedToday
                        ? 'Locked until morning check-in is complete'
                        : tradeInPosition
                        ? 'Live position active — resolve trade outcome below'
                        : 'Post-trade resolution & honest emotional check'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#061014] border border-[#142833] text-slate-300 font-mono font-bold">
                    Accepted Risk: <strong className="text-rose-300">${acceptedRisk}</strong>
                  </span>
                </div>
              </div>

              {/* IN A TRADE Live Alert Banner */}
              {tradeInPosition && (
                <div
                  id="in-a-trade-active-banner"
                  className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/70 via-[#0b2123] to-[#071d24] border-2 border-emerald-500/60 text-emerald-200 shadow-md flex items-center justify-between gap-3 animate-in fade-in"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative flex items-center justify-center shrink-0">
                      <span className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                      <span className="relative w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-emerald-300 tracking-wider">
                          IN A TRADE
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-[#06171d] border border-emerald-500/40 text-[10px] font-bold text-emerald-200">
                          {activeAccount ? activeAccount.name : 'Active Account'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-600/40 text-[10px] font-mono font-bold text-rose-300">
                          Risk: ${acceptedRisk}
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/90 mt-0.5">
                        One trade at a time enforced. Log Winner or Loser below when position closes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkipTheTrade}
                    className="px-2.5 py-1 rounded-lg bg-[#0a1921] hover:bg-[#122834] border border-[#1d3d4e] text-slate-300 hover:text-white text-[10px] font-bold transition-all whitespace-nowrap cursor-pointer shrink-0"
                    title="Cancel active trade position state and reset checklist"
                  >
                    Cancel Position
                  </button>
                </div>
              )}

              {!isCheckInCompletedToday && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-200">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Trade outcome logging locked. Complete today's morning check-in to log trades.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMorningCheckInModal(true)}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-black rounded-lg cursor-pointer whitespace-nowrap"
                  >
                    Unlock
                  </button>
                </div>
              )}

              {/* IDLE STATE: Always render the outcome buttons, grayed out/disabled until trade is executed */}
              {outcomeMode === 'idle' && (
                <div className="space-y-2.5">
                  {/* Quick-action button matching the exact risk you accepted before taking the trade */}
                  <button
                    type="button"
                    id="quick-exact-risk-btn"
                    disabled={!tradeInPosition}
                    onClick={() => tradeInPosition && handleSelectLoss(acceptedRisk)}
                    className={`w-full py-2.5 px-3.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                      tradeInPosition
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/40 text-rose-200 cursor-pointer group'
                        : 'bg-[#08151c] border-[#162a36] text-slate-500 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className={`w-3.5 h-3.5 ${tradeInPosition ? 'text-rose-400 group-hover:scale-110 transition-transform' : 'text-slate-600'}`} />
                      <span>Quick Action: Exact Risk Stop-Out</span>
                    </div>
                    <span
                      className={`font-mono font-black text-xs px-2.5 py-0.5 rounded border ${
                        tradeInPosition
                          ? 'bg-rose-950/80 border-rose-700/60 text-rose-300'
                          : 'bg-[#0c1e28] border-[#183444] text-slate-500'
                      }`}
                    >
                      -${acceptedRisk}
                    </span>
                  </button>

                  {/* Winner vs Loser Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Winner Button */}
                    <button
                      type="button"
                      id="outcome-winner-btn"
                      disabled={!tradeInPosition}
                      onClick={tradeInPosition ? handleSelectWin : undefined}
                      className={`py-3 px-3 rounded-xl border-2 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        tradeInPosition
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/50 hover:border-emerald-400 text-emerald-200 cursor-pointer shadow-lg shadow-emerald-950/20'
                          : 'bg-[#08151c] border-[#162a36] text-slate-500 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className={`w-4 h-4 stroke-[3] ${tradeInPosition ? 'text-emerald-400' : 'text-slate-600'}`} />
                        <span className="tracking-wide">WINNER</span>
                      </div>
                      <span className={`text-[10px] font-normal ${tradeInPosition ? 'text-emerald-300/70' : 'text-slate-600'}`}>
                        Hit target or green exit
                      </span>
                    </button>

                    {/* Loser Button */}
                    <button
                      type="button"
                      id="outcome-loser-btn"
                      disabled={!tradeInPosition}
                      onClick={tradeInPosition ? () => handleSelectLoss() : undefined}
                      className={`py-3 px-3 rounded-xl border-2 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        tradeInPosition
                          ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/50 hover:border-rose-400 text-rose-200 cursor-pointer shadow-lg shadow-rose-950/20'
                          : 'bg-[#08151c] border-[#162a36] text-slate-500 opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className={`w-4 h-4 stroke-[3] ${tradeInPosition ? 'text-rose-400' : 'text-slate-600'}`} />
                        <span className="tracking-wide">LOSER</span>
                      </div>
                      <span className={`text-[10px] font-normal ${tradeInPosition ? 'text-rose-300/70' : 'text-slate-600'}`}>
                        Stopped out or red exit
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* WIN FLOW: If Winner is selected, trigger follow-up question "How much?" */}
              {outcomeMode === 'winner' && (
                <div className="space-y-3 p-3 rounded-xl bg-[#061014] border border-emerald-500/30 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-black text-[10px] uppercase tracking-wider border border-emerald-500/40">
                        Winner Flow
                      </span>
                      <span className="text-xs font-black text-white">How much?</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOutcomeMode('idle')}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  {/* Profit Amount Input */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-mono font-bold text-sm">
                      +$
                    </span>
                    <input
                      type="number"
                      id="win-amount-input"
                      value={winAmountInput}
                      onChange={(e) => setWinAmountInput(e.target.value)}
                      placeholder={String(acceptedRisk)}
                      className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-[#0c1a21] border border-emerald-500/50 text-white font-mono font-bold text-sm focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>

                  {/* Quick Preset R-multiples */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-medium">Quick R:</span>
                    {[1, 1.5, 2, 2.5, 3].map((r) => {
                      const val = Math.round(acceptedRisk * r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setWinAmountInput(String(val))}
                          className="px-2 py-1 rounded bg-[#0b181f] hover:bg-emerald-500/20 border border-slate-700 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-300 text-[10px] font-mono font-bold transition-all cursor-pointer"
                        >
                          +{r}R (${val})
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm Win Button */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      id="confirm-win-btn"
                      onClick={handleConfirmWin}
                      className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/40"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>
                        Log Win (+${parseFloat(winAmountInput) || acceptedRisk}) &rarr;
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* LOSS FLOW: Warning message "Answering honestly..." followed by three distinct buttons */}
              {outcomeMode === 'loser' && (
                <div className="space-y-3 p-3 rounded-xl bg-[#061014] border border-rose-500/30 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-black text-[10px] uppercase tracking-wider border border-rose-500/40">
                        Loss Flow
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-300">
                        -${lossAmountInput || acceptedRisk} Loss
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOutcomeMode('idle')}
                      className="text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel / Back
                    </button>
                  </div>

                  {/* Warning message: Answering honestly... */}
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                        Answering honestly...
                      </div>
                      <p className="text-[11px] text-amber-100/80 leading-relaxed">
                        How are you feeling right now after this loss? Your answer routes data to the Board tab to monitor and prevent tilt.
                      </p>
                    </div>
                  </div>

                  {/* Optional loss amount adjustment with quick-fill presets */}
                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Loss Amount:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-rose-400 font-mono font-bold">-$</span>
                        <input
                          type="number"
                          id="loss-amount-input"
                          value={lossAmountInput}
                          onChange={(e) => setLossAmountInput(e.target.value)}
                          placeholder={String(acceptedRisk || 200)}
                          className="w-24 px-2 py-1 rounded bg-[#0b171c] border border-rose-500/50 text-white font-mono font-bold text-xs focus:outline-none focus:border-rose-400"
                        />
                      </div>
                    </div>

                    {/* Quick-fill preset loss buttons */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-medium">Quick Loss:</span>
                      {[
                        { label: `Exact ($${acceptedRisk || 200})`, val: acceptedRisk || 200 },
                        { label: `0.5x ($${Math.round((acceptedRisk || 200) * 0.5)})`, val: Math.round((acceptedRisk || 200) * 0.5) },
                        { label: `1.5x ($${Math.round((acceptedRisk || 200) * 1.5)})`, val: Math.round((acceptedRisk || 200) * 1.5) },
                        { label: `2x ($${Math.round((acceptedRisk || 200) * 2)})`, val: Math.round((acceptedRisk || 200) * 2) },
                        { label: `B ($${riskAmounts.B})`, val: riskAmounts.B },
                        { label: `A ($${riskAmounts.A})`, val: riskAmounts.A },
                        { label: `A+ ($${riskAmounts.A_PLUS})`, val: riskAmounts.A_PLUS },
                      ].map((preset, lIdx) => (
                        <button
                          key={lIdx}
                          type="button"
                          onClick={() => setLossAmountInput(String(preset.val))}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                            lossAmountInput === String(preset.val)
                              ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                              : 'bg-[#0b181f] hover:bg-rose-500/20 border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Three distinct buttons: "I'm fine", "I'm frustrated", "Feel like chasing" */}
                  <div className="space-y-2 pt-1">
                    {/* Button 1: "I'm fine" */}
                    <button
                      type="button"
                      id="loss-fine-btn"
                      onClick={() => handleConfirmLoss('fine')}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#091b22] hover:bg-emerald-950/50 border border-emerald-500/50 hover:border-emerald-400 text-emerald-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black text-white">"I'm fine"</div>
                          <div className="text-[10px] text-emerald-400/80 font-normal">
                            Clean loss, risk accepted, fully calm
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase font-black tracking-wider">
                        Low Risk
                      </span>
                    </button>

                    {/* Button 2: "I'm frustrated" */}
                    <button
                      type="button"
                      id="loss-frustrated-btn"
                      onClick={() => handleConfirmLoss('frustrated')}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#1c1809] hover:bg-amber-950/50 border border-amber-500/50 hover:border-amber-400 text-amber-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-sm group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black text-white">"I'm frustrated"</div>
                          <div className="text-[10px] text-amber-400/80 font-normal">
                            Annoyed, tension elevated, pulse up
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-black tracking-wider">
                        Moderate Tilt
                      </span>
                    </button>

                    {/* Button 3: "Feel like chasing" */}
                    <button
                      type="button"
                      id="loss-chasing-btn"
                      onClick={() => handleConfirmLoss('feel_like_chasing')}
                      className="w-full py-2.5 px-3.5 rounded-xl bg-[#230d12] hover:bg-rose-950/60 border-2 border-rose-500/60 hover:border-rose-400 text-rose-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer shadow-md group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-rose-500/30 text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform animate-pulse">
                          <Flame className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <div className="text-xs font-black text-rose-200">"Feel like chasing"</div>
                          <div className="text-[10px] text-rose-300/80 font-normal">
                            Eager to revenge trade or win back loss
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-600/40 text-rose-200 uppercase font-black tracking-wider border border-rose-500/60">
                        Critical Risk
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Checklist bottom actions */}
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button
                onClick={handleRestoreDefaults}
                className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
              >
                Restore default rules
              </button>
              <button
                onClick={handleResetFilter}
                className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Reset filter answers
              </button>
            </div>
          </div>

          {/* RIGHT: Standalone Filter Control Box (lg:col-span-5 xl:col-span-5 space-y-3.5 lg:sticky lg:top-4) */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-3.5 lg:sticky lg:top-4">
            {/* Repositioned Trade Filter Description Message - Sits directly above Filter Control Box */}
            <div
              id="trade-filter-description-box"
              className="p-3.5 bg-[#081624] border border-[#183a54] rounded-xl text-xs text-slate-300 shadow-xs"
            >
              <div className="text-[10px] font-black uppercase tracking-wider text-sky-400 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>THE TRADER FILTER DESCRIPTION</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Before you click Buy, it has to go through the filter. 3 of 3 on your rules. Risk in Q4. Revenge/FOMO on Q5.
              </p>
            </div>

            {/* Standalone Filter Control Box */}
            <div
              id="consolidated-interactive-control-box"
              className="bg-[#0a1a29] border-2 border-sky-400/50 rounded-xl p-4 space-y-4 shadow-xl"
            >
              {/* Header with Step Tracker and Navigation */}
              <div className="flex items-center justify-between border-b border-[#16364d] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shadow-xs">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                      FILTER CONTROL BOX
                    </span>
                    <div className="text-[10px] text-sky-400 font-bold">
                      Rule {currentQuestionIndex + 1} of {totalQuestions}
                    </div>
                  </div>
                </div>

                {/* Step Navigation Arrows */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setOverridePromptFor(null);
                        setActiveRuleFocus(checklistQuestions[currentQuestionIndex - 1].id);
                      }
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="p-1.5 rounded-md bg-[#0d2338] border border-[#1c4464] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                    title="Previous Question"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex < totalQuestions - 1) {
                        const nextQ = checklistQuestions[currentQuestionIndex + 1];
                        handleSelectStep(nextQ.id);
                      }
                    }}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="p-1.5 rounded-md bg-[#0d2338] border border-[#1c4464] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                    title="Next Question"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Step indicator pips */}
              <div className="grid grid-cols-5 gap-1.5">
                {checklistQuestions.map((q, idx) => {
                  const status = getCurrentStatus(q.id);
                  const isCurrent = activeRuleFocus === q.id;
                  const isOverridden = overriddenRules[q.id];
                  const isUnlocked = isStepUnlocked(q.id);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => handleSelectStep(q.id)}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                        !isUnlocked
                          ? 'bg-[#06121b] border border-[#112433] text-slate-500 opacity-60'
                          : isCurrent
                          ? 'bg-sky-400 text-black font-black ring-1 ring-sky-200'
                          : status === true
                          ? 'bg-sky-950/80 border border-sky-600/60 text-sky-200'
                          : status === false && isOverridden
                          ? 'bg-amber-950/70 border border-amber-700/60 text-amber-300'
                          : status === false
                          ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300'
                          : 'bg-[#0d2338] border border-[#173752] text-slate-400 hover:text-slate-200'
                      }`}
                      title={!isUnlocked ? `Step ${idx + 1} locked - complete previous steps first` : q.title}
                    >
                      {!isUnlocked && <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />}
                      <span>{q.shortTitle}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Question Spotlight */}
              <div className="p-3.5 rounded-xl bg-[#0c2236] border border-[#1c4668] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">
                    {currentQuestion.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      getCurrentStatus(currentQuestion.id) === true
                        ? 'bg-sky-950 text-sky-200 border border-sky-700'
                        : getCurrentStatus(currentQuestion.id) === false && overriddenRules[currentQuestion.id]
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : getCurrentStatus(currentQuestion.id) === false
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-[#081622] text-slate-400 border border-[#16364d]'
                    }`}
                  >
                    {getCurrentStatus(currentQuestion.id) === true
                      ? 'Status: Verified YES ✓'
                      : getCurrentStatus(currentQuestion.id) === false && overriddenRules[currentQuestion.id]
                      ? 'Status: Overridden ⚠️'
                      : getCurrentStatus(currentQuestion.id) === false
                      ? 'Status: Flagged NO ✗'
                      : 'Status: Pending Verification'}
                  </span>
                </div>

                <div className="text-sm font-black text-white leading-snug">
                  &ldquo;{currentQuestion.text}&rdquo;
                </div>
              </div>

              {/* Action Area: Yes/No Buttons or "Take It Anyway?" Override Prompt */}
              {overridePromptFor === currentQuestion.id ? (
                /* Inline Override Question: "Not all criteria met. Take it anyway?" */
                <div
                  id="inline-override-prompt"
                  className="p-3.5 rounded-xl bg-[#1d170b] border-2 border-amber-500/80 space-y-3 shadow-lg"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-black text-amber-300 tracking-wide">
                        Not all criteria met. Take it anyway?
                      </div>
                      <p className="text-[11px] text-amber-100/90 leading-relaxed">
                        Criteria is not met for &ldquo;{currentQuestion.text}&rdquo;. Trades can still be taken even if every rule isn&apos;t checked. Do you wish to confirm and proceed with this trade setup?
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      id="override-take-anyway-btn"
                      onClick={handleConfirmOverride}
                      className="py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 text-center"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Yes, Take It Anyway</span>
                    </button>
                    <button
                      type="button"
                      id="override-cancel-btn"
                      onClick={handleCancelOverride}
                      className="py-2.5 px-3 rounded-lg bg-[#0e2233] hover:bg-[#16364d] text-slate-300 border border-[#204a69] font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>No, Stay Flat</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Primary Interactive Control: YES / NO */
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      id="control-box-yes-btn"
                      onClick={() => handleControlAnswer(true)}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        getCurrentStatus(currentQuestion.id) === true
                          ? 'bg-sky-400 text-black ring-2 ring-sky-300 shadow-sky-950/50'
                          : 'bg-sky-500 hover:bg-sky-400 text-black'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>YES (Criteria Met)</span>
                    </button>
                    <button
                      type="button"
                      id="control-box-no-btn"
                      onClick={() => handleControlAnswer(false)}
                      className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        getCurrentStatus(currentQuestion.id) === false
                          ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-rose-950/50'
                          : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50'
                      }`}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
                      <span>NO (Not Met)</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>Answers advance to the next rule in sequence</span>
                    {currentQuestionIndex < totalQuestions - 1 ? (
                      <span className="text-sky-400 font-bold flex items-center gap-0.5">
                        <span>Next: {checklistQuestions[currentQuestionIndex + 1].shortTitle}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-sky-400 font-bold">Step 5 of 5 reached</span>
                    )}
                  </div>
                </div>
              )}

              {/* Optional Trade Notes Input */}
              <div className="space-y-2 pt-2.5 border-t border-[#162f3c]">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <PenLine className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Trade Notes / Type of Trade (Optional)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {consolidatedNote ? `${consolidatedNote.length} chars` : 'Optional'}
                  </span>
                </div>

                <input
                  type="text"
                  id="control-box-trade-note-input"
                  value={consolidatedNote}
                  onChange={(e) => setConsolidatedNote(e.target.value)}
                  placeholder="Type trade type or context (e.g., IB sweep long, 5m FVG bounce, scalp)..."
                  className="w-full bg-[#071115] border border-[#142c38] focus:border-emerald-500/80 text-slate-100 text-xs rounded-lg px-3 py-2.5 focus:outline-none placeholder:text-slate-500 transition-colors font-mono"
                />

                {/* Centralized Tag Control Box (Max 10 Total Limit Across System) */}
                <div
                  id="centralized-tag-control-box"
                  className="p-3 bg-[#071318] border border-[#163342] rounded-xl space-y-2.5"
                >
                  {/* Header with Title and Strict Max 10 Counter */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                        Tag Control Box
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          currentSystemTags.length >= 10
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {currentSystemTags.length}/10 TAGS {currentSystemTags.length >= 10 ? '(LIMIT REACHED)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Tag Creation Form (strictly enforces max 10) */}
                  {currentSystemTags.length < 10 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">#</span>
                        <input
                          type="text"
                          id="create-system-tag-input"
                          value={newSystemTagInput}
                          onChange={(e) => setNewSystemTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSystemTag();
                            }
                          }}
                          placeholder="Create new tag (e.g. Scalp, Trend, FVG)..."
                          maxLength={24}
                          className="w-full pl-6 pr-2.5 py-1.5 text-xs font-medium bg-[#09181f] border border-[#1a3848] text-white rounded-lg focus:outline-none focus:border-emerald-400 placeholder:text-slate-500 transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        id="add-system-tag-btn"
                        onClick={handleAddSystemTag}
                        disabled={!newSystemTagInput.trim()}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:pointer-events-none text-black font-black text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                        title="Add Tag (Max 10 total)"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Add</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-center gap-2 text-[11px] text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span className="font-semibold">Maximum limit of 10 tags reached. Delete a tag to add a new one.</span>
                    </div>
                  )}

                  {/* Feedback on validation error */}
                  {tagErrorFeedback && (
                    <div className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded">
                      {tagErrorFeedback}
                    </div>
                  )}

                  {/* System Tags Chips (Click to apply, inline edit, delete) */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {currentSystemTags.map((tag, tIdx) => {
                      const isEditingThis = editingSystemTagIndex === tIdx;

                      if (isEditingThis) {
                        return (
                          <div
                            key={tIdx}
                            className="flex items-center gap-1 bg-[#0b1f29] border border-emerald-400 rounded-lg px-2 py-0.5 shadow-sm"
                          >
                            <span className="text-emerald-400 font-bold text-xs">#</span>
                            <input
                              type="text"
                              value={editingSystemTagText}
                              onChange={(e) => setEditingSystemTagText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveSystemTag(tIdx);
                                if (e.key === 'Escape') {
                                  setEditingSystemTagIndex(null);
                                  setEditingSystemTagText('');
                                }
                              }}
                              autoFocus
                              maxLength={24}
                              className="w-24 text-xs font-bold text-white bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveSystemTag(tIdx)}
                              className="p-0.5 text-emerald-400 hover:text-emerald-200 cursor-pointer"
                              title="Save tag"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSystemTagIndex(null);
                                setEditingSystemTagText('');
                              }}
                              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={tIdx}
                          className="group/systag inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0b1c24] hover:bg-[#112937] border border-[#163546] hover:border-emerald-500/50 text-[11px] font-bold text-slate-200 transition-all shadow-2xs"
                        >
                          <button
                            type="button"
                            onClick={() => handleApplyTagToNote(tag)}
                            className="cursor-pointer text-emerald-300 hover:text-emerald-200 hover:underline"
                            title={`Click to add #${tag} to Trade Notes`}
                          >
                            #{tag}
                          </button>

                          <div className="flex items-center gap-0.5 opacity-60 group-hover/systag:opacity-100 transition-opacity border-l border-[#193a4c] pl-1 ml-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSystemTagIndex(tIdx);
                                setEditingSystemTagText(tag);
                              }}
                              className="p-0.5 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                              title={`Edit tag "${tag}"`}
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSystemTag(tIdx)}
                              className="p-0.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                              title={`Delete tag "${tag}"`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {currentSystemTags.length === 0 && (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        No tags yet. Type a tag name above to create one (up to 10 total).
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-[#122834]">
                    <span>Click tag to insert into Trade Notes</span>
                    {consolidatedNote && (
                      <button
                        type="button"
                        onClick={() => setConsolidatedNote('')}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Clear notes
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* All criteria completed indicator */}
              {checklistQuestions.every((q) => getCurrentStatus(q.id) !== null) && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-bold text-[11px] truncate">
                      All {totalQuestions} criteria reviewed. Ready to size and execute.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const calcEl = document.getElementById('account-sizing-tier-cards');
                      if (calcEl) calcEl.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-500 text-black font-black text-[10px] uppercase tracking-wider hover:bg-emerald-400 transition-colors cursor-pointer shrink-0"
                  >
                    Sizing &rarr;
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW ACCOUNT CREATION MODAL */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b161b] border border-[#1b3542] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#142933] pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Configure New Trading Book
                </h3>
              </div>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type Selector Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#081216] border border-[#142630] rounded-xl">
              <button
                type="button"
                onClick={() => setNewAccType('live')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  newAccType === 'live'
                    ? 'bg-emerald-500 text-black font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Live Account</span>
              </button>
              <button
                type="button"
                onClick={() => setNewAccType('eval')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  newAccType === 'eval'
                    ? 'bg-cyan-500 text-black font-black shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Evaluation</span>
              </button>
            </div>

            <form onSubmit={handleCreateAccountFromSession} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Account Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#081216] border border-[#142831] text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Max Drawdown Limit ($)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newAccMaxDD}
                    onChange={(e) => setNewAccMaxDD(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#081216] border border-[#142831] text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Drawdown Type
                  </label>
                  <select
                    value={newAccDrawdownType}
                    onChange={(e) => setNewAccDrawdownType(e.target.value as AccountDrawdownType)}
                    className="w-full bg-[#081216] border border-[#142831] text-white text-xs rounded-xl p-2.5 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="eod">End of Day Trailing (6 PM ET)</option>
                    <option value="intraday_trailing">Intraday Trailing (HWM)</option>
                    <option value="static">Static Drawdown (Fixed Floor)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 bg-[#081216] border border-[#142831] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">
                    Does drawdown stop trailing at starting balance?
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Floor locks at $0 breakeven {newAccMaxDD ? `(+$${Number(newAccMaxDD).toLocaleString()} profit)` : '(locks once max drawdown is banked)'}.
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewAccStopFloor(true)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                      newAccStopFloor
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-[#102027] text-slate-400 border-[#1a3746]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccStopFloor(false)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg border cursor-pointer ${
                      !newAccStopFloor
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-[#102027] text-slate-400 border-[#1a3746]'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#142933]">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 bg-[#102027] text-slate-400 hover:text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-xs font-black cursor-pointer shadow-xs"
                >
                  Save & Activate Book
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MORNING EMOTIONAL CHECK-IN MODAL (JUST ONE QUESTION) */}
      {showMorningCheckInModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b161b] border border-[#1b3644] rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#142630] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Sun className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-1.5">
                    <span>Start of Day Mindset Check-In</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase border border-amber-500/40">
                      Required
                    </span>
                  </h2>
                  <span className="text-[10px] font-bold text-slate-400">
                    Trading session &amp; trade logging are locked until this 1 question is answered
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMorningCheckInModal(false);
                  setMorningCheckInDismissed(true);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#142831] text-xs font-bold cursor-pointer"
                title="Close modal (Session remains locked until completed)"
              >
                ✕
              </button>
            </div>

            {/* THE ONE QUESTION */}
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1">
                  Question 1 of 1 &bull; Required to Trade
                </div>
                <h3 className="text-base sm:text-lg font-black text-white leading-snug">
                  What is your emotional state right now?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Select your current state on the 1–10 scale. Anchor 5 is <strong className="text-emerald-300">Cool as a Cucumber 🥒</strong> (the ideal baseline).
                </p>
              </div>

              {/* 10 Scale Buttons */}
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 pt-1">
                {FEEL_SCALE.map((f) => {
                  const isSelected = morningFeelLevel === f.level;
                  const isAnchor5 = f.level === 5;

                  return (
                    <button
                      key={f.level}
                      type="button"
                      onClick={() => setMorningFeelLevel(f.level)}
                      className={`h-12 rounded-xl font-black text-xs transition-all cursor-pointer flex flex-col items-center justify-center border relative ${
                        isSelected
                          ? isAnchor5
                            ? 'bg-emerald-500 text-black border-emerald-300 shadow-lg ring-2 ring-emerald-400 scale-105'
                            : 'bg-[#153442] text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/50 scale-105'
                          : isAnchor5
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 hover:border-emerald-400'
                          : 'bg-[#081317] border-[#142732] text-slate-400 hover:border-[#1d3b4b] hover:text-white'
                      }`}
                      title={f.title}
                    >
                      <span className="text-sm font-black">{f.level}</span>
                      {isAnchor5 ? (
                        <span className="text-[10px] -mt-0.5 leading-none">🥒</span>
                      ) : (
                        <span className="text-[8px] text-slate-500 font-bold -mt-0.5">
                          {f.level <= 2 ? 'Fear' : f.level <= 4 ? 'Tense' : f.level <= 7 ? 'Alert' : 'Greed'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Selected Level Feedback Callout */}
              {(() => {
                const selectedItem = FEEL_SCALE.find((f) => f.level === morningFeelLevel);
                const isAnchor = morningFeelLevel === 5;
                return (
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      isAnchor
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-xs'
                        : morningFeelLevel < 5
                        ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                        : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="text-xs font-black flex items-center gap-1.5">
                        {isAnchor && <span className="text-base">🥒</span>}
                        <span>Level {morningFeelLevel}: {selectedItem?.title}</span>
                      </div>
                      {isAnchor && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase">
                          Ideal Target
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {selectedItem?.description || 'Calm, even-keel baseline. Ready to execute process.'}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Modal Action - Lock in baseline and unlock session */}
            <div className="pt-2 border-t border-[#142630]">
              <button
                type="button"
                id="modal-complete-checkin-btn"
                onClick={handleCompleteMorningCheckIn}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lock In Baseline &amp; Unlock Trading Session →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK RESTORE / MANUAL ADD TRADE MODAL */}
      {showRestoreTradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-[#0b161b] border border-[#1b3542] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#142933] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Restore / Log Trade in Journal
                </h3>
              </div>
              <button
                onClick={() => setShowRestoreTradeModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Trade Name / Setup Description
                </label>
                <input
                  type="text"
                  value={restoreTradeName}
                  onChange={(e) => setRestoreTradeName(e.target.value)}
                  placeholder="e.g. Trade #1 - NQ Long Pullback"
                  className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-medium focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Realized P&amp;L ($)
                  </label>
                  <input
                    type="number"
                    value={restoreTradePnl}
                    onChange={(e) => setRestoreTradePnl(e.target.value)}
                    placeholder="e.g. -250 or 500"
                    className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-mono font-bold focus:border-emerald-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Setup Quality
                  </label>
                  <select
                    value={restoreTradeQuality}
                    onChange={(e) => setRestoreTradeQuality(e.target.value as TradeQualityGrade)}
                    className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-bold focus:border-emerald-500 outline-hidden"
                  >
                    <option value="A_PLUS">A+ (Full Setup)</option>
                    <option value="A">A (Standard Setup)</option>
                    <option value="B">B (Lower Tier)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Discipline Outcome
                  </label>
                  <select
                    value={restoreTradeDiscipline}
                    onChange={(e) => setRestoreTradeDiscipline(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-bold focus:border-emerald-500 outline-hidden"
                  >
                    <option value="managed_well">Managed Well</option>
                    <option value="exited_emotionally">Exited Emotionally</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Assigned Book / Account
                  </label>
                  <select
                    value={restoreTradeAccountId || activeAccount?.id || ''}
                    onChange={(e) => setRestoreTradeAccountId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-bold focus:border-emerald-500 outline-hidden"
                  >
                    {state.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} (${(acc.currentBalance ?? acc.size)?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Execution Notes / Context
                </label>
                <textarea
                  value={restoreTradeNotes}
                  onChange={(e) => setRestoreTradeNotes(e.target.value)}
                  rows={2}
                  placeholder="Key observations, levels, or execution notes..."
                  className="w-full px-3 py-2 bg-[#081216] border border-[#162c38] rounded-xl text-white font-medium focus:border-emerald-500 outline-hidden resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#142933]">
              <button
                type="button"
                onClick={() => setShowRestoreTradeModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0e1d24] hover:bg-[#152a34] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const parsedPnl = parseFloat(restoreTradePnl) || 0;
                  const riskAmt = Math.abs(parsedPnl) || 250;
                  const targetAcc =
                    state.accounts.find((a) => a.id === restoreTradeAccountId) ||
                    activeAccount ||
                    state.accounts[0];

                  onLogTrade({
                    name: restoreTradeName.trim() || `Trade #${state.trades.length + 1}`,
                    quality: restoreTradeQuality,
                    symbol: 'NQ',
                    pnl: parsedPnl,
                    riskDollars: riskAmt,
                    riskPercent: 1.0,
                    rMultiple: parsedPnl / riskAmt,
                    rulesHeld: true,
                    discipline: restoreTradeDiscipline,
                    disciplineSelected: true,
                    plannedStatus: restoreTradePlanned,
                    emotionalState: parsedPnl < 0 ? restoreTradeFeeling : undefined,
                    notes: restoreTradeNotes.trim() || 'Restored trade record',
                    checklistAnswers: {
                      rule1: true,
                      rule2: true,
                      rule3: true,
                      q4CalculatedRisk: true,
                      q5NotFomo: true,
                    },
                    accountId: targetAcc?.id,
                    accountName: targetAcc?.name,
                  });
                  setShowRestoreTradeModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black cursor-pointer shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Save &amp; Place in Journal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success/Action Modals or other overlays */}
    </div>
  );
};
