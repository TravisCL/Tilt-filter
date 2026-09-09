import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  AppState,
  RuleItem,
  CompletedTrade,
  TradingAccount,
  AccountCategory,
  AccountDrawdownType,
  DeskMessage,
  LossFeeling,
  TiltRiskLevel,
} from '../types';
import { FEEL_SCALE, SLEEP_SCALE, DEFAULT_SCOREBOARD_TALLY, DEFAULT_SYSTEM_TAGS } from '../utils/initialData';

interface SessionViewProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
  onCallItADay: () => void;
  onLogTrade: (trade: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'>) => void;
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
  onCallItADay,
  onLogTrade,
}) => {
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

  // Morning Emotional Check-In State (Anchor 5: Cool as a Cucumber, Sleep Notes via Memo)
  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckInCompletedToday = Boolean(
    state.emotionalTracker.morningCheckInCompleted &&
    state.emotionalTracker.morningCheckInDate === todayStr &&
    state.emotionalTracker.feelLevel !== null
  );

  // Trigger morning check-in prompt automatically at the start of the trading day or session view if not completed today
  const [showMorningCheckInModal, setShowMorningCheckInModal] = useState<boolean>(() => !isCheckInCompletedToday);
  const [morningFeelLevel, setMorningFeelLevel] = useState<number>(() => state.emotionalTracker.feelLevel ?? 5);
  const [morningNotesInput, setMorningNotesInput] = useState<string>(() => state.emotionalTracker.morningNotes || '');
  const [morningCheckInDismissed, setMorningCheckInDismissed] = useState<boolean>(false);

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

  // Handle "TAKE THE TRADE" - smoothly delegates to the Sizing Calculator without popup alerts
  const handleTakeTheTrade = () => {
    // If risk is not yet set, smoothly delegate to the Sizing Calculator without an abrupt alert
    if (!explicitRiskAmount || explicitRiskAmount <= 0) {
      setActiveRuleFocus('q4');
      const calcEl = document.getElementById('account-sizing-tier-cards');
      if (calcEl) {
        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (q5NotFomo === false && !overriddenRules['q5']) {
      alert('Trade BLOCKED: You marked this as FOMO or Revenge! Step away from the workstation.');
      return;
    }

    setTradeInPosition(true);
    setFilterSavedFeedback(true);
    const riskToUse = explicitRiskAmount;
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

  // Outcome Tracker: Select Winner
  const handleSelectWin = () => {
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
    const winAmount = parseFloat(winAmountInput);
    if (isNaN(winAmount) || winAmount <= 0) {
      alert('Please enter a valid profit amount (e.g. 200).');
      return;
    }

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
    const amt = overrideAmount !== undefined ? overrideAmount : acceptedRisk;
    setLossAmountInput(String(amt));
    setOutcomeMode('loser');
  };

  // Outcome Tracker: Confirm Loss & Honest Emotional State
  const handleConfirmLoss = (feeling: LossFeeling) => {
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
      return { ...prev, trades: updated };
    });
  };

  // Save Trade Name
  const handleSaveTradeName = (tradeId: string) => {
    const updatedName = tradeNames[tradeId] || '';
    onUpdateState((prev) => ({
      ...prev,
      trades: prev.trades.map((t) => (t.id === tradeId ? { ...t, name: updatedName } : t)),
    }));
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

      {/* Pending Morning Check-In Banner */}
      {!isCheckInCompletedToday && !showMorningCheckInModal && (
        <div className="p-3.5 bg-[#091b22] border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-amber-300 flex items-center gap-2">
                <span>Morning Check-In Pending</span>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">&bull; Calibrate emotional baseline & sleep memo</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Anchor your mental state at <span className="text-emerald-300 font-bold">Level 5: Cool as a Cucumber 🥒</span> and record any sleep notes via memo before taking your first trade.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMorningCheckInModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-xl cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
          >
            ☀️ Complete Check-In Now
          </button>
        </div>
      )}

      {/* TOP DESK CONTROL BAR */}
      <div className="p-4 bg-[#0b161b] border border-[#162b34] rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#142630] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black tracking-wider text-emerald-400 uppercase">
              READY
            </span>
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
                  : 'bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-500/50 animate-pulse'
              }`}
              title="Record or review your morning emotional check-in & sleep memo"
            >
              <Sun className={`w-3.5 h-3.5 ${isCheckInCompletedToday ? 'text-emerald-400' : 'text-amber-400'}`} />
              {isCheckInCompletedToday ? (
                <span>
                  Check-In: {state.emotionalTracker.feelLevel === 5 ? '🥒 Cool as a Cucumber (5)' : `Level ${state.emotionalTracker.feelLevel}/10`}
                </span>
              ) : (
                <span>☀️ Morning Check-In: Pending</span>
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

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
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
      <div id="trade-filter-section" className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 lg:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#152731] pb-3">
          <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
            <span>The trade filter</span>
          </h2>
          <span className="text-[11px] font-mono font-bold text-slate-400 bg-[#071318] px-2.5 py-1 rounded-lg border border-[#152933]">
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

              {/* Action Buttons & Direct Sizing Calculator Delegation */}
              <div className="flex items-center justify-between gap-2.5 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* TAKE THE TRADE */}
                  <button
                    id="take-the-trade-top-btn"
                    type="button"
                    onClick={handleTakeTheTrade}
                    className={`px-4 py-2 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                      filterSavedFeedback
                        ? 'bg-emerald-400 text-black'
                        : tradeInPosition
                        ? 'bg-amber-400 hover:bg-amber-300 text-black ring-2 ring-amber-400/50'
                        : explicitRiskAmount
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40'
                        : 'bg-emerald-600/80 hover:bg-emerald-500 text-black shadow-emerald-950/40'
                    }`}
                  >
                    {filterSavedFeedback ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>TRADE TAKEN!</span>
                      </>
                    ) : tradeInPosition ? (
                      <>
                        <Activity className="w-4 h-4 animate-pulse" />
                        <span>
                          POSITION ACTIVE ({explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Active'})
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          TAKE THE TRADE ({activeAccount ? activeAccount.name : 'Account'} &bull;{' '}
                          {explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Set Risk in Calculator'})
                        </span>
                      </>
                    )}
                  </button>

                  {/* Sizing Calculator Shortcut Button */}
                  <button
                    type="button"
                    id="open-sizing-calc-top-btn"
                    onClick={() => {
                      setActiveRuleFocus('q4');
                      const calcEl = document.getElementById('account-sizing-tier-cards');
                      if (calcEl) {
                        calcEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      explicitRiskAmount
                        ? 'bg-[#0a1e28] hover:bg-[#102b39] text-teal-300 border-teal-500/40 hover:border-teal-400'
                        : 'bg-[#151710] hover:bg-[#212415] text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="All trade sizing and risk amounts are handled directly by the Max Drawdown & Sizing calculator"
                  >
                    <Calculator className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                    <span>
                      {explicitRiskAmount
                        ? `Sizing: $${explicitRiskAmount} (${selectedQuality === 'A_PLUS' ? 'A+' : selectedQuality})`
                        : 'Set Risk in Calculator'}
                    </span>
                  </button>

                  {/* Unplanned Trade */}
                  <button
                    type="button"
                    id="unplanned-trade-top-btn"
                    onClick={handleCallUnplanned}
                    className="px-3.5 py-1.5 bg-[#251f16] hover:bg-[#342b1f] text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>Unplanned Trade</span>
                  </button>

                  {/* Call it a day */}
                  <button
                    type="button"
                    id="call-it-a-day-top-btn"
                    onClick={onCallItADay}
                    className="px-3.5 py-1.5 bg-[#142832] hover:bg-[#1a3542] text-slate-200 border border-[#234352] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-xs"
                  >
                    <Moon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Call it a day</span>
                  </button>
                </div>
              </div>
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

                return (
                  <div
                    key={rule.id}
                    onClick={() => setActiveRuleFocus(rule.id)}
                    className={`p-3.5 rounded-xl text-xs transition-all space-y-2 cursor-pointer ${
                      isActive
                        ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                        : isYes
                        ? 'border border-emerald-500/40 bg-[#0c1f26]'
                        : isNo && isOverridden
                        ? 'border border-amber-500/40 bg-[#16160e]'
                        : isNo
                        ? 'border border-rose-900/60 bg-[#161a1d]'
                        : 'border border-[#17303d] bg-[#0c181e] opacity-80 hover:opacity-100 hover:border-[#22485c]'
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
              const isQ4Active = activeRuleFocus === 'q4';
              const isQ4Overridden = overriddenRules['q4'] === true;
              return (
                <div
                  id="account-sizing-tier-cards"
                  onClick={() => setActiveRuleFocus('q4')}
                  className={`p-3.5 rounded-xl text-xs transition-all space-y-2.5 cursor-pointer ${
                    isQ4Active
                      ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                      : q4Risk === true
                      ? 'border border-emerald-500/40 bg-[#0c1f26]'
                      : q4Risk === false && isQ4Overridden
                      ? 'border border-amber-500/40 bg-[#16160e]'
                      : q4Risk === false
                      ? 'border border-rose-900/60 bg-[#161a1d]'
                      : 'border border-[#17303d] bg-[#0c181e] opacity-80 hover:opacity-100 hover:border-[#22485c]'
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
                      {isQ4Active && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {q4Risk === true ? (
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
                        onClick={() => {
                          setSelectedQuality('B');
                          setCustomRiskInput(String(riskAmounts.B));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'B'
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
                                if (selectedQuality === 'B') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.B + 25;
                                setRiskAmounts((prev) => ({ ...prev, B: nextVal }));
                                if (selectedQuality === 'B') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
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
                        onClick={() => {
                          setSelectedQuality('A');
                          setCustomRiskInput(String(riskAmounts.A));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'A'
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
                                if (selectedQuality === 'A') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.A + 50;
                                setRiskAmounts((prev) => ({ ...prev, A: nextVal }));
                                if (selectedQuality === 'A') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
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
                        onClick={() => {
                          setSelectedQuality('A_PLUS');
                          setCustomRiskInput(String(riskAmounts.A_PLUS));
                          setQ4Risk(true);
                          setOverriddenRules((p) => ({ ...p, q4: false }));
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedQuality === 'A_PLUS'
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
                                if (selectedQuality === 'A_PLUS') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const nextVal = riskAmounts.A_PLUS + 50;
                                setRiskAmounts((prev) => ({ ...prev, A_PLUS: nextVal }));
                                if (selectedQuality === 'A_PLUS') {
                                  setCustomRiskInput(String(nextVal));
                                  setQ4Risk(true);
                                  setOverriddenRules((p) => ({ ...p, q4: false }));
                                }
                              }}
                              className="px-1 hover:text-white"
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
                              Select a setup tier above or enter custom risk below
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
                      {/* Custom Risk Input */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400">Custom Risk:</span>
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
                              }
                            }}
                            placeholder="Input risk $"
                            className="w-full pl-6 pr-2 py-1.5 bg-[#0f2027] border border-[#1c3644] text-white text-xs font-bold rounded-lg focus:outline-none focus:border-emerald-500/60"
                          />
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
              const isQ5Active = activeRuleFocus === 'q5';
              const isQ5Overridden = overriddenRules['q5'] === true;
              return (
                <div
                  onClick={() => setActiveRuleFocus('q5')}
                  className={`p-3.5 rounded-xl text-xs transition-all space-y-2 cursor-pointer ${
                    isQ5Active
                      ? 'border-2 border-emerald-400 bg-[#0d222b] ring-2 ring-emerald-500/25 shadow-lg shadow-emerald-950/40'
                      : q5NotFomo === true
                      ? 'border border-emerald-500/40 bg-[#0c1f26]'
                      : q5NotFomo === false && isQ5Overridden
                      ? 'border border-amber-500/40 bg-[#16160e]'
                      : q5NotFomo === false
                      ? 'border border-rose-900/60 bg-[#161a1d]'
                      : 'border border-[#17303d] bg-[#0c181e] opacity-80 hover:opacity-100 hover:border-[#22485c]'
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
                      {isQ5Active && (
                        <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                          </span>
                          <span>Active</span>
                        </span>
                      )}
                    </div>

                    <div className="shrink-0">
                      {q5NotFomo === true ? (
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

            {/* Take The Trade Button - Positioned directly after Question 5 final discipline check */}
            <div className="pt-2">
              <button
                id="execute-filtered-trade-btn"
                type="button"
                onClick={handleTakeTheTrade}
                className={`w-full py-3.5 text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  tradeInPosition
                    ? 'bg-amber-400 hover:bg-amber-300 text-black ring-2 ring-amber-400/50 shadow-amber-950/40'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-950/40'
                }`}
              >
                {filterSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>TRADE TAKEN! RECORD OUTCOME BELOW</span>
                  </>
                ) : tradeInPosition ? (
                  <>
                    <Activity className="w-4 h-4 animate-pulse" />
                    <span>
                      POSITION ACTIVE &bull; RESOLVE OUTCOME BELOW ({explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Active'})
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>
                      TAKE THE TRADE (
                      {activeAccount ? activeAccount.name : 'Manual Sizing'} &bull;{' '}
                      {explicitRiskAmount ? `$${explicitRiskAmount} Risk` : 'Set Risk in Calculator'})
                    </span>
                  </>
                )}
              </button>
            </div>

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
                tradeInPosition
                  ? 'border-amber-500/60 shadow-amber-950/30 ring-1 ring-amber-500/30'
                  : 'border-[#172d38] shadow-black/40'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b border-[#142833] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    ⚡
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                      Outcome Tracker
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Post-trade resolution &amp; honest emotional check
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-[#061014] border border-[#142833] text-slate-300 font-mono font-bold">
                    Accepted Risk: <strong className="text-rose-300">${acceptedRisk}</strong>
                  </span>
                </div>
              </div>

              {/* IDLE STATE: Clear choices for Winner or Loser + Quick-action exact risk button */}
              {outcomeMode === 'idle' && (
                <div className="space-y-2.5">
                  {/* Quick-action button matching the exact risk you accepted before taking the trade */}
                  <button
                    type="button"
                    id="quick-exact-risk-btn"
                    onClick={() => handleSelectLoss(acceptedRisk)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-200 font-bold text-xs flex items-center justify-between transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                      <span>Quick Action: Exact Risk Stop-Out</span>
                    </div>
                    <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded bg-rose-950/80 border border-rose-700/60 text-rose-300">
                      -${acceptedRisk}
                    </span>
                  </button>

                  {/* Winner vs Loser Buttons */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Winner Button */}
                    <button
                      type="button"
                      id="outcome-winner-btn"
                      onClick={handleSelectWin}
                      className="py-3 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border-2 border-emerald-500/50 hover:border-emerald-400 text-emerald-200 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowUpRight className="w-4 h-4 text-emerald-400 stroke-[3]" />
                        <span className="tracking-wide">WINNER</span>
                      </div>
                      <span className="text-[10px] text-emerald-300/70 font-normal">
                        Hit target or green exit
                      </span>
                    </button>

                    {/* Loser Button */}
                    <button
                      type="button"
                      id="outcome-loser-btn"
                      onClick={() => handleSelectLoss()}
                      className="py-3 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border-2 border-rose-500/50 hover:border-rose-400 text-rose-200 font-black text-xs flex flex-col items-center justify-center gap-1 transition-all cursor-pointer shadow-lg shadow-rose-950/20"
                    >
                      <div className="flex items-center gap-1.5">
                        <ArrowDownRight className="w-4 h-4 text-rose-400 stroke-[3]" />
                        <span className="tracking-wide">LOSER</span>
                      </div>
                      <span className="text-[10px] text-rose-300/70 font-normal">
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

                  {/* Optional loss amount adjustment */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Loss Amount:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-rose-400 font-mono font-bold">-$</span>
                      <input
                        type="number"
                        value={lossAmountInput}
                        onChange={(e) => setLossAmountInput(e.target.value)}
                        placeholder={String(acceptedRisk)}
                        className="w-20 px-2 py-1 rounded bg-[#0b171c] border border-slate-700 text-white font-mono font-bold text-xs focus:outline-none focus:border-rose-500"
                      />
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
              className="p-3.5 bg-[#081419] border border-[#17303d] rounded-xl text-xs text-slate-300 shadow-xs"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Trade filter description</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Before you click Buy, it has to go through the filter. 3 of 3 on your rules. Risk in Q4. Revenge/FOMO on Q5.
              </p>
            </div>

            {/* Standalone Filter Control Box */}
            <div
              id="consolidated-interactive-control-box"
              className="bg-[#091519] border-2 border-emerald-500/40 rounded-xl p-4 space-y-4 shadow-xl"
            >
              {/* Header with Step Tracker and Navigation */}
              <div className="flex items-center justify-between border-b border-[#162f3c] pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-white">
                      Filter Control Box
                    </span>
                    <div className="text-[10px] text-emerald-400 font-bold">
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
                    className="p-1.5 rounded-md bg-[#0d1f28] border border-[#1b3a4a] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                    title="Previous Question"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span className="hidden sm:inline">Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex < totalQuestions - 1) {
                        setOverridePromptFor(null);
                        setActiveRuleFocus(checklistQuestions[currentQuestionIndex + 1].id);
                      }
                    }}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="p-1.5 rounded-md bg-[#0d1f28] border border-[#1b3a4a] text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none cursor-pointer text-[10px] flex items-center gap-1 font-bold"
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

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setOverridePromptFor(null);
                        setActiveRuleFocus(q.id);
                      }}
                      className={`py-1 px-1 rounded-md text-[10px] font-bold transition-all text-center cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-500 text-black font-black ring-1 ring-emerald-300'
                          : status === true
                          ? 'bg-emerald-950/70 border border-emerald-700/60 text-emerald-300'
                          : status === false && isOverridden
                          ? 'bg-amber-950/70 border border-amber-700/60 text-amber-300'
                          : status === false
                          ? 'bg-rose-950/70 border border-rose-700/60 text-rose-300'
                          : 'bg-[#0d1f28] border border-[#173342] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {q.shortTitle}
                    </button>
                  );
                })}
              </div>

              {/* Active Question Spotlight */}
              <div className="p-3.5 rounded-xl bg-[#0c1e28] border border-[#1d4154] space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-400 uppercase tracking-wider">
                    {currentQuestion.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      getCurrentStatus(currentQuestion.id) === true
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : getCurrentStatus(currentQuestion.id) === false && overriddenRules[currentQuestion.id]
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : getCurrentStatus(currentQuestion.id) === false
                        ? 'bg-rose-950 text-rose-300 border border-rose-800'
                        : 'bg-[#08151b] text-slate-400 border border-[#162f3c]'
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
                      className="py-2.5 px-3 rounded-lg bg-[#0e1f28] hover:bg-[#163342] text-slate-300 border border-[#204456] font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center"
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
                          ? 'bg-emerald-400 text-black ring-2 ring-emerald-300 shadow-emerald-950/50'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black'
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
                      <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                        <span>Next: {checklistQuestions[currentQuestionIndex + 1].shortTitle}</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">Step 5 of 5 reached</span>
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

      {/* RUNNING TRADE LOG & AUDIT CARDS */}
      {state.trades.length > 0 && (() => {
        const sessionManagedWell = state.trades.filter(
          (t) => t.discipline === 'managed_well' && t.disciplineSelected !== false
        ).length;
        const sessionEmotional = state.trades.filter(
          (t) => t.discipline === 'exited_emotionally' && t.disciplineSelected !== false
        ).length;
        const sessionUnspecified = state.trades.filter(
          (t) =>
            !(
              (t.discipline === 'managed_well' || t.discipline === 'exited_emotionally') &&
              t.disciplineSelected !== false
            )
        ).length;

        return (
        <div className="bg-[#0b161b] border border-[#162a33] rounded-2xl p-4 lg:p-5 space-y-4">
          {/* Running Header Bar */}
          <div className="p-3.5 bg-[#081216] border border-[#13252e] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              {activeAccount?.name ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-white">{activeAccount.name}</span>
                  {activeAccount.maxDrawdown && (
                    <>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-xs font-semibold text-slate-400">
                        ${activeAccount.maxDrawdown?.toLocaleString()} EOD MAX DD
                      </span>
                    </>
                  )}
                </div>
              ) : null}
              <div className={`text-base font-black mt-0.5 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Profit: {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                <span>{state.trades.length} trades &bull; {aPlusCount} A-plus &bull; {aCount} A</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-emerald-400 font-semibold">{sessionManagedWell} managed well</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-rose-400 font-semibold">{sessionEmotional} emotional</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400 font-semibold">{sessionUnspecified} unspecified</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Win rate</div>
                <div className="font-bold text-white">
                  {winRate}% ({winnersCount}/{state.trades.length})
                </div>
              </div>
              <div className="h-6 w-px bg-[#182e38]"></div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">R:R</div>
                <div className="font-bold text-white">
                  1 : 0.75
                </div>
              </div>
              <div className="h-6 w-px bg-[#182e38]"></div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase">Profit factor</div>
                <div className="font-bold text-white">
                  1.50
                </div>
              </div>
            </div>
          </div>

          {/* Trade Cards List */}
          <div className="space-y-4">
            {state.trades.map((trade) => {
              const isShowingAnswers = showAnswersMap[trade.id] ?? false;

              return (
                <div
                  key={trade.id}
                  className="p-4 bg-[#0a1519] border border-[#162c36] rounded-xl space-y-3"
                >
                  {/* Top trade info line */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#142831] pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase text-slate-400">
                        {trade.orderNumber === 1
                          ? '1ST TRADE'
                          : trade.orderNumber === 2
                          ? '2ND TRADE'
                          : `${trade.orderNumber}TH TRADE`}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-400">{trade.timestamp}</span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-400 font-semibold">
                        {trade.plannedStatus}
                      </span>
                      <span className="text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-300 font-bold">
                        Risk ${trade.riskDollars} ({trade.riskPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {trade.pnl >= 0 ? 'Winner: +' : 'Loss: -'}${Math.abs(trade.pnl).toFixed(2)} &bull; {trade.rMultiple}R
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                        Rules held
                      </span>
                    </div>
                  </div>

                  {/* Discipline Buttons */}
                  {(() => {
                    const isManagedWell = trade.discipline === 'managed_well' && trade.disciplineSelected !== false;
                    const isExitedEmotionally = trade.discipline === 'exited_emotionally' && trade.disciplineSelected !== false;
                    const isUnspecified = !isManagedWell && !isExitedEmotionally;

                    return (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button
                          onClick={() => handleUpdateDiscipline(trade.id, 'managed_well')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isManagedWell
                              ? 'bg-emerald-500 text-black border-emerald-400 shadow-xs'
                              : 'bg-[#0d1e26] text-slate-400 border-[#193645] hover:text-white'
                          }`}
                        >
                          Managed well
                        </button>

                        <button
                          onClick={() => handleUpdateDiscipline(trade.id, 'exited_emotionally')}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            isExitedEmotionally
                              ? 'bg-rose-600 text-white border-rose-500 shadow-xs'
                              : 'bg-[#0d1e26] text-slate-400 border-[#193645] hover:text-white'
                          }`}
                        >
                          Exited emotionally
                        </button>

                        {isUnspecified && (
                          <div className="text-center sm:text-left px-2 text-[10px] text-slate-500 italic">
                            Unspecified
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Name Trade & Screenshot */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-8 flex items-center gap-2">
                      <input
                        type="text"
                        value={tradeNames[trade.id] ?? trade.name}
                        onChange={(e) =>
                          setTradeNames({ ...tradeNames, [trade.id]: e.target.value })
                        }
                        placeholder="Name this trade — 1B long, FVG tap"
                        className="flex-1 bg-[#0f222b] border border-[#1b3745] text-white text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveTradeName(trade.id)}
                        className="px-3.5 py-2 bg-[#142d38] hover:bg-[#1a3a49] text-slate-200 text-xs font-bold rounded-xl border border-[#224759] cursor-pointer"
                      >
                        Save
                      </button>
                    </div>

                    <div className="md:col-span-4 flex items-center justify-end gap-2">
                      {trade.screenshotUrl ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-[#224454] relative group">
                            <img
                              src={trade.screenshotUrl}
                              alt="Chart snapshot"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newUrl = prompt('Enter image URL or chart screenshot:');
                              if (newUrl) {
                                onUpdateState((prev) => ({
                                  ...prev,
                                  trades: prev.trades.map((t) =>
                                    t.id === trade.id ? { ...t, screenshotUrl: newUrl } : t
                                  ),
                                }));
                              }
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Replace</span>
                          </button>
                          <button
                            onClick={() => {
                              onUpdateState((prev) => ({
                                ...prev,
                                trades: prev.trades.map((t) =>
                                  t.id === trade.id ? { ...t, screenshotUrl: undefined } : t
                                ),
                              }));
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            const url = prompt(
                              'Enter chart screenshot URL (e.g. from TradingView / Sierra Chart):'
                            );
                            if (url) {
                              onUpdateState((prev) => ({
                                ...prev,
                                trades: prev.trades.map((t) =>
                                  t.id === trade.id ? { ...t, screenshotUrl: url } : t
                                ),
                              }));
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#0e1e26] hover:bg-[#142b36] border border-[#1b3543] text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                          <span>Add screenshot</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Show Answers Accordion */}
                  <div className="pt-1">
                    <button
                      onClick={() =>
                        setShowAnswersMap({ ...showAnswersMap, [trade.id]: !isShowingAnswers })
                      }
                      className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isShowingAnswers ? 'Hide answers' : 'Show answers'}</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          isShowingAnswers ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isShowingAnswers && (
                      <div className="mt-2 p-3 bg-[#081216] border border-[#132630] rounded-xl text-xs space-y-2 animate-in fade-in">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Q1: HTF is clear not chop —{' '}
                              <strong className={trade.checklistAnswers.rule1 ? 'text-emerald-400' : 'text-rose-400'}>
                                {trade.checklistAnswers.rule1 ? 'Yes' : 'No'}
                              </strong>
                            </span>
                          </div>
                          {trade.ruleNotes?.r1 && (
                            <div className="text-[11px] text-slate-400 pl-5.5 font-mono">
                              &bull; {trade.ruleNotes.r1}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Q2: IB or FRB setup —{' '}
                              <strong className={trade.checklistAnswers.rule2 ? 'text-emerald-400' : 'text-rose-400'}>
                                {trade.checklistAnswers.rule2 ? 'Yes' : 'No'}
                              </strong>
                            </span>
                          </div>
                          {trade.ruleNotes?.r2 && (
                            <div className="text-[11px] text-slate-400 pl-5.5 font-mono">
                              &bull; {trade.ruleNotes.r2}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Q3: HH/HL's or LH/LL's confirmed —{' '}
                              <strong className={trade.checklistAnswers.rule3 ? 'text-emerald-400' : 'text-rose-400'}>
                                {trade.checklistAnswers.rule3 ? 'Yes' : 'No'}
                              </strong>
                            </span>
                          </div>
                          {trade.ruleNotes?.r3 && (
                            <div className="text-[11px] text-slate-400 pl-5.5 font-mono">
                              &bull; {trade.ruleNotes.r3}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Q4: Risk calculated (${trade.riskDollars} / {trade.riskPercent}%) —{' '}
                              <strong className={trade.checklistAnswers.q4CalculatedRisk ? 'text-emerald-400' : 'text-rose-400'}>
                                {trade.checklistAnswers.q4CalculatedRisk ? 'Yes' : 'No'}
                              </strong>
                            </span>
                          </div>
                          {trade.ruleNotes?.q4 && (
                            <div className="text-[11px] text-slate-400 pl-5.5 font-mono">
                              &bull; {trade.ruleNotes.q4}
                            </div>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>
                              Q5: Not a revenge or FOMO click —{' '}
                              <strong className={trade.checklistAnswers.q5NotFomo ? 'text-emerald-400' : 'text-rose-400'}>
                                {trade.checklistAnswers.q5NotFomo ? 'Verified' : 'Flagged FOMO'}
                              </strong>
                            </span>
                          </div>
                          {trade.ruleNotes?.q5 && (
                            <div className="text-[11px] text-slate-400 pl-5.5 font-mono">
                              &bull; {trade.ruleNotes.q5}
                            </div>
                          )}
                        </div>

                        {(trade.notes || trade.ruleNotes?.consolidated) && (
                          <div className="pt-2 mt-1 border-t border-[#162d39] text-slate-300">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                              Trade Execution & Context Notes:
                            </div>
                            <div className="text-[11px] text-emerald-300 font-mono pl-1 whitespace-pre-wrap">
                              &ldquo;{trade.notes || trade.ruleNotes?.consolidated}&rdquo;
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

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
                  <h2 className="text-sm font-black text-white tracking-tight">
                    Start of Day Mindset Check-In
                  </h2>
                  <span className="text-[10px] font-bold text-emerald-400">
                    One quick question before you trade
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowMorningCheckInModal(false);
                  setMorningCheckInDismissed(true);
                  setShowSwitchAccount(true);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#142831] text-xs font-bold cursor-pointer"
                title="Skip to accounts"
              >
                ✕
              </button>
            </div>

            {/* THE ONE QUESTION */}
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 mb-1">
                  Question 1 of 1
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

            {/* Modal Action - Proceed to pick accounts */}
            <div className="pt-2 border-t border-[#142630]">
              <button
                type="button"
                onClick={handleCompleteMorningCheckIn}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Lock In Baseline & Pick Accounts to Trade →</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
