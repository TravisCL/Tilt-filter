import { AppState, FeelScaleItem, SleepScaleItem, DailyScoreRecord, CompletedTrade } from '../types';
import { getESTDate } from './dailyRollover';

export const FEEL_SCALE: FeelScaleItem[] = [
  {
    level: 1,
    title: 'Wrecked. Frustrated. No confidence.',
    description: 'Wrecked. Frustrated. No confidence.',
    color: 'border-rose-600/70 text-rose-400 bg-rose-950/40',
  },
  {
    level: 2,
    title: 'Shaken. Want to hide.',
    description: 'Shaken. Want to hide.',
    color: 'border-rose-500/70 text-rose-300 bg-rose-950/30',
  },
  {
    level: 3,
    title: 'Heavy. Still in your head.',
    description: 'Heavy. Still in your head.',
    color: 'border-orange-500/70 text-orange-400 bg-orange-950/30',
  },
  {
    level: 4,
    title: 'Off. Tight.',
    description: 'Off. Tight.',
    color: 'border-amber-500/70 text-amber-300 bg-amber-950/30',
  },
  {
    level: 5,
    title: 'Cool as a cucumber.',
    description: 'Cool as a cucumber.',
    color: 'border-emerald-400 text-emerald-300 bg-emerald-950/50',
  },
  {
    level: 6,
    title: 'Up. Stay honest.',
    description: 'Up. Stay honest.',
    color: 'border-emerald-500/70 text-emerald-400 bg-emerald-950/30',
  },
  {
    level: 7,
    title: 'Feeling good. Watch size.',
    description: 'Feeling good. Watch size.',
    color: 'border-teal-500/70 text-teal-300 bg-teal-950/30',
  },
  {
    level: 8,
    title: 'Hot. Greed is close.',
    description: 'Hot. Greed is close.',
    color: 'border-amber-500/70 text-amber-400 bg-amber-950/30',
  },
  {
    level: 9,
    title: 'Almost invincible.',
    description: 'Almost invincible.',
    color: 'border-rose-500/70 text-rose-300 bg-rose-950/30',
  },
  {
    level: 10,
    title: 'Recklessly invincible.',
    description: 'Recklessly invincible.',
    color: 'border-rose-600 text-rose-400 bg-rose-950/50',
  },
];

export const SLEEP_SCALE: SleepScaleItem[] = [
  { level: 1, title: "Didn't sleep. Up all night on the bad trades." },
  { level: 2, title: 'Fumes. Body is comatose.' },
  { level: 3, title: 'Broken night. Foggy.' },
  { level: 4, title: 'Short. Still heavy.' },
  { level: 5, title: 'Light. Not enough.' },
  { level: 6, title: 'Okay. Functional.' },
  { level: 7, title: 'Decent. Clear enough.' },
  { level: 8, title: 'Slept well.' },
  { level: 9, title: 'Deep rest. Sharp.' },
  { level: 10, title: 'Golden sleep. Funded, recovered. Ready.' },
];

export const DEFAULT_SCOREBOARD_TALLY: DailyScoreRecord[] = [
  {
    id: 'sb-1',
    date: '2026-09-02',
    dayLabel: 'Wed, Sep 2',
    feelLevel: 5,
    sleepLevel: 8,
    morningNotes: 'Good sleep. HTF trend clean, patient on 15m levels.',
    walkOutNotes: 'Walked green. 3/3 rules verified on both trades.',
    dailyProcessScore: 98,
    emotionalConsistencyPercent: 100,
    ruleAdherencePercent: 100,
    tradesCount: 2,
    plannedTradesCount: 2,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 2,
    emotionalExitsCount: 0,
    pnl: 340,
    isCleanDay: true,
    status: 'clean',
  },
  {
    id: 'sb-2',
    date: '2026-09-03',
    dayLabel: 'Thu, Sep 3',
    feelLevel: 6,
    sleepLevel: 7,
    morningNotes: 'Locked in. Waiting for IB sweep.',
    walkOutNotes: 'Stuck to hard stops. Zero FOMO impulse clicks.',
    dailyProcessScore: 95,
    emotionalConsistencyPercent: 95,
    ruleAdherencePercent: 100,
    tradesCount: 3,
    plannedTradesCount: 3,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 3,
    emotionalExitsCount: 0,
    pnl: 520,
    isCleanDay: true,
    status: 'clean',
  },
  {
    id: 'sb-3',
    date: '2026-09-04',
    dayLabel: 'Fri, Sep 4',
    feelLevel: 4,
    sleepLevel: 6,
    morningNotes: 'Slightly tired from late night. Keep sizing small.',
    walkOutNotes: 'Took 1 small trade, hit target, stopped before chop.',
    dailyProcessScore: 89,
    emotionalConsistencyPercent: 90,
    ruleAdherencePercent: 100,
    tradesCount: 1,
    plannedTradesCount: 1,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 1,
    emotionalExitsCount: 0,
    pnl: 180,
    isCleanDay: true,
    status: 'clean',
  },
  {
    id: 'sb-4',
    date: '2026-09-05',
    dayLabel: 'Sat, Sep 5',
    feelLevel: 5,
    sleepLevel: 8,
    morningNotes: 'Weekend review. Backtested setups.',
    walkOutNotes: 'Mindset reset complete.',
    dailyProcessScore: 96,
    emotionalConsistencyPercent: 100,
    ruleAdherencePercent: 100,
    tradesCount: 0,
    plannedTradesCount: 0,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 0,
    emotionalExitsCount: 0,
    pnl: 0,
    isCleanDay: true,
    status: 'clean',
  },
  {
    id: 'sb-5',
    date: '2026-09-06',
    dayLabel: 'Sun, Sep 6',
    feelLevel: 5,
    sleepLevel: 8,
    morningNotes: 'Pre-week prep. Key market structure levels identified.',
    walkOutNotes: 'Even-keeled and calm for market open.',
    dailyProcessScore: 98,
    emotionalConsistencyPercent: 100,
    ruleAdherencePercent: 100,
    tradesCount: 0,
    plannedTradesCount: 0,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 0,
    emotionalExitsCount: 0,
    pnl: 0,
    isCleanDay: true,
    status: 'clean',
  },
  {
    id: 'sb-6',
    date: '2026-09-07',
    dayLabel: 'Mon, Sep 7',
    feelLevel: 5,
    sleepLevel: 9,
    morningNotes: 'Slept great. Cool as a cucumber baseline.',
    walkOutNotes: 'Executed A+ playbook setups only. Clean day.',
    dailyProcessScore: 97,
    emotionalConsistencyPercent: 100,
    ruleAdherencePercent: 100,
    tradesCount: 2,
    plannedTradesCount: 2,
    unplannedTradesCount: 0,
    wellManagedExitsCount: 2,
    emotionalExitsCount: 0,
    pnl: 460,
    isCleanDay: true,
    status: 'clean',
  },
];

export const DEFAULT_SYSTEM_TAGS: string[] = [
  'Structure',
  '15m/1h Trend',
  'IB / FRB',
  'Trigger',
  'Execution',
  'IB Sweep',
  'FVG Retest',
];

export const CLEAN_SLATE_STATE: AppState = {
  currentView: 'session',
  accounts: [],
  activeAccountId: '',
  rules: [
    { id: 'r1', text: 'HTF IS CLEAR NOT CHOP?', checked: false, tag: 'Structure', tags: ['Structure'] },
    { id: 'r2', text: 'IB OR FRB SETUP', checked: false, tag: 'Setup', tags: ['Setup'] },
    { id: 'r3', text: "HH/HL's or LH/LL's", checked: false, tag: 'Trigger', tags: ['Trigger'] },
  ],
  systemTags: DEFAULT_SYSTEM_TAGS,
  trades: [],
  deskMessages: [],
  emotionalTracker: {
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
    walkOutStatus: undefined,
  },
  dailyScoreboard: [],
  cleanStreak: 0,
  dayCounter: 1,
  tiltScore: 0,
  tiltTab: 0,
  currentTier: 'silver',
  customRiskInput: '',
  selectedSizingTier: 'A_PLUS',
  tiltEvents: [],
};

export const INITIAL_STATE: AppState = CLEAN_SLATE_STATE;

const STORAGE_KEY = 'tilt_filter_state_v3';
const BACKUP_STORAGE_KEY = 'tilt_filter_state_backup';
const LEGACY_STORAGE_KEYS = [
  'tilt_filter_state_backup',
  'tilt_filter_state_v2',
  'tilt_buddy_state_v2',
  'tilt_filter_state_v1',
  'tilt_buddy_state_v1',
  'tilt_filter_state',
  'tilt_companion_state',
];

/**
 * Bulletproof check for whether today's morning check-in has been completed.
 * Safe against undefined/null tracker objects during detached window initialization.
 */
export function isMorningCheckInCompleted(
  tracker?: AppState['emotionalTracker'] | null,
  targetDateStr?: string
): boolean {
  if (!tracker || typeof tracker !== 'object') return false;
  const today = targetDateStr || getESTDate().dateStr;
  return Boolean(
    tracker.morningCheckInCompleted &&
    tracker.morningCheckInDate === today &&
    tracker.feelLevel !== null &&
    tracker.feelLevel !== undefined
  );
}

/**
 * Strict, deterministic trade deduplication and sanitization.
 * Filters out duplicate trades caused by rapid submissions, cross-tab race conditions, or legacy synthetic recovery tags.
 * Preserves actual authentic user trades in exact chronological sequence.
 */
export function deduplicateTrades(trades: any[]): CompletedTrade[] {
  if (!Array.isArray(trades)) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const uniqueTrades: CompletedTrade[] = [];

  // First pass: Filter out invalid entries and sanitize individual trade fields
  const validTrades: CompletedTrade[] = trades
    .filter((t): t is CompletedTrade => Boolean(t && typeof t === 'object' && (t.id || typeof t.pnl === 'number')))
    .map((t, idx) => ({
      ...t,
      id: t.id || `trade-${Date.now()}-${idx}`,
      orderNumber: typeof t.orderNumber === 'number' ? t.orderNumber : idx + 1,
      pnl: typeof t.pnl === 'number' ? t.pnl : 0,
      riskDollars: typeof t.riskDollars === 'number' ? t.riskDollars : 250,
      riskPercent: typeof t.riskPercent === 'number' ? t.riskPercent : 1.0,
      rMultiple:
        typeof t.rMultiple === 'number'
          ? t.rMultiple
          : typeof t.pnl === 'number' && typeof t.riskDollars === 'number' && t.riskDollars > 0
          ? Number((t.pnl / t.riskDollars).toFixed(2))
          : 0,
      rulesHeld: Boolean(t.rulesHeld !== false),
      discipline: t.discipline || 'managed_well',
      disciplineSelected: Boolean(t.disciplineSelected !== false),
      plannedStatus: t.plannedStatus || 'planned',
      checklistAnswers: t.checklistAnswers || {
        rule1: true,
        rule2: true,
        rule3: true,
        q4CalculatedRisk: true,
        q5NotFomo: true,
      },
    }));

  // Second pass: Deduplicate by exact ID and by logical trade fingerprint
  for (const trade of validTrades) {
    if (seenIds.has(trade.id)) {
      continue;
    }

    const normTime = (trade.timestamp || '').trim();
    const accId = trade.accountId || 'default';
    const pnlKey = Number(trade.pnl).toFixed(2);
    const outcomeKey = trade.pnl >= 0 ? 'win' : 'loss';
    const nameKey = (trade.name || '').trim().toLowerCase();

    // Fingerprints for exact trade duplicate detection
    const strictSignature = `${accId}_${pnlKey}_${normTime}_${nameKey}`;
    const burstSignature = `${accId}_${pnlKey}_${outcomeKey}_${normTime}`;

    if (seenSignatures.has(strictSignature) || (normTime && seenSignatures.has(burstSignature))) {
      continue;
    }

    seenIds.add(trade.id);
    seenSignatures.add(strictSignature);
    if (normTime) seenSignatures.add(burstSignature);

    uniqueTrades.push(trade);
  }

  // Final pass: Re-index order numbers sequentially (1, 2, 3...)
  return uniqueTrades.map((trade, idx) => ({
    ...trade,
    orderNumber: idx + 1,
  }));
}

/**
 * Robustly sanitizes and validates application state.
 * Guarantees emotionalTracker, accounts, and all state sub-trees are fully structured,
 * preserving user data and preventing initialization crashes across popout windows.
 */
export function sanitizeAppState(parsed: any): AppState {
  if (!parsed || typeof parsed !== 'object') {
    return { ...INITIAL_STATE };
  }

  const mergedScoreboard = Array.isArray(parsed.dailyScoreboard)
    ? parsed.dailyScoreboard
    : [];

  const rawRules = parsed.rules && Array.isArray(parsed.rules) && parsed.rules.length > 0
    ? parsed.rules
    : INITIAL_STATE.rules;

  const sanitizedRules = rawRules.slice(0, 5).map((r: any, idx: number) => {
    const defaultTag = idx === 0 ? 'Structure' : idx === 1 ? 'Setup' : idx === 2 ? 'Trigger' : 'Rule';
    const tag = (r && r.tag) || defaultTag;
    const tags = Array.isArray(r && r.tags) && r.tags.length > 0 ? r.tags : [tag];
    return {
      id: (r && r.id) || `r${idx + 1}`,
      text: (r && r.text) || `Rule ${idx + 1}`,
      checked: Boolean(r && r.checked),
      tag,
      tags,
    };
  });

  const rawSystemTags = Array.isArray(parsed.systemTags) ? parsed.systemTags : DEFAULT_SYSTEM_TAGS;
  const sanitizedSystemTags = rawSystemTags
    .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
    .slice(0, 10);

  const defaultEmotionalTracker = INITIAL_STATE.emotionalTracker;
  const rawEmotionalTracker = (parsed.emotionalTracker && typeof parsed.emotionalTracker === 'object')
    ? parsed.emotionalTracker
    : {};

  const sanitizedEmotionalTracker: AppState['emotionalTracker'] = {
    ...defaultEmotionalTracker,
    ...rawEmotionalTracker,
    feelLevel: rawEmotionalTracker.feelLevel !== undefined ? rawEmotionalTracker.feelLevel : null,
    sleepLevel: rawEmotionalTracker.sleepLevel !== undefined ? rawEmotionalTracker.sleepLevel : null,
    sleepQuality: rawEmotionalTracker.sleepQuality || '',
    focusIntention: rawEmotionalTracker.focusIntention || '',
    triggersDistractions: rawEmotionalTracker.triggersDistractions || '',
    walkOutNotes: rawEmotionalTracker.walkOutNotes || '',
    morningNotes: rawEmotionalTracker.morningNotes || '',
    updatedAt: rawEmotionalTracker.updatedAt || '',
    morningCheckInDate: rawEmotionalTracker.morningCheckInDate || '',
    morningCheckInCompleted: Boolean(rawEmotionalTracker.morningCheckInCompleted),
    sessionOutcome: rawEmotionalTracker.sessionOutcome || 'pending',
    sessionReflection: rawEmotionalTracker.sessionReflection || '',
  };

  // Sanitize accounts list carefully, preserving every field
  const rawAccounts = Array.isArray(parsed.accounts) ? parsed.accounts : [];
  const sanitizedAccounts = rawAccounts
    .filter((acc: any) => acc && typeof acc === 'object' && (acc.id || acc.name))
    .map((acc: any, idx: number) => ({
      id: acc.id || `acc-${Date.now()}-${idx}`,
      name: acc.name || `Account ${idx + 1}`,
      size: typeof acc.size === 'number' ? acc.size : 0,
      drawdownType: acc.drawdownType === 'trailing' || acc.drawdownType === 'fixed' ? acc.drawdownType : 'eod',
      maxDrawdown: typeof acc.maxDrawdown === 'number' ? acc.maxDrawdown : 2500,
      floorLevel: typeof acc.floorLevel === 'number' ? acc.floorLevel : 0,
      stopTrailingAtFloor: Boolean(acc.stopTrailingAtFloor !== false),
      currentBalance: typeof acc.currentBalance === 'number' ? acc.currentBalance : 0,
      highWaterMark: typeof acc.highWaterMark === 'number' ? acc.highWaterMark : 0,
      active: Boolean(acc.active !== false),
      accountType: acc.accountType === 'live' ? 'live' : 'eval',
      status: acc.status === 'blown' ? 'blown' : 'active',
      blownAt: acc.blownAt,
      blownReason: acc.blownReason,
    }));

  // Resolve valid activeAccountId
  let resolvedActiveAccountId = typeof parsed.activeAccountId === 'string' ? parsed.activeAccountId : '';
  if (sanitizedAccounts.length > 0) {
    const exists = sanitizedAccounts.some((a) => a.id === resolvedActiveAccountId);
    if (!exists) {
      resolvedActiveAccountId = sanitizedAccounts[0].id;
    }
  }

  // Deduplicate trades cleanly on every sanitize pass
  const cleanTrades = deduplicateTrades(Array.isArray(parsed.trades) ? parsed.trades : []);

  return {
    ...INITIAL_STATE,
    ...parsed,
    currentView: parsed.currentView || 'session',
    accounts: sanitizedAccounts,
    activeAccountId: resolvedActiveAccountId,
    trades: cleanTrades,
    deskMessages: Array.isArray(parsed.deskMessages) ? parsed.deskMessages : [],
    tiltEvents: Array.isArray(parsed.tiltEvents) ? parsed.tiltEvents : [],
    dayCounter: typeof parsed.dayCounter === 'number' && parsed.dayCounter >= 1 ? parsed.dayCounter : 1,
    cleanStreak: typeof parsed.cleanStreak === 'number' ? parsed.cleanStreak : 0,
    tiltScore: typeof parsed.tiltScore === 'number' ? parsed.tiltScore : 0,
    tiltTab: typeof parsed.tiltTab === 'number' ? parsed.tiltTab : 0,
    rules: sanitizedRules,
    systemTags: sanitizedSystemTags.length > 0 ? sanitizedSystemTags : DEFAULT_SYSTEM_TAGS,
    dailyScoreboard: mergedScoreboard,
    emotionalTracker: sanitizedEmotionalTracker,
  };
}

/**
 * Loads application state reliably without generating synthetic duplicates.
 */
export function loadAppState(): AppState {
  try {
    let baseState: AppState = { ...INITIAL_STATE };

    // 1. Primary storage key check
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        baseState = sanitizeAppState(parsed);
        saveAppState(baseState);
        return baseState;
      } catch (err) {
        console.warn('Error parsing primary storage key', err);
      }
    }

    // 2. Backup storage key check (fallback only)
    const backupRaw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (backupRaw) {
      try {
        const backupParsed = JSON.parse(backupRaw);
        if (backupParsed && typeof backupParsed === 'object') {
          baseState = sanitizeAppState(backupParsed);
          saveAppState(baseState);
          return baseState;
        }
      } catch (err) {
        console.warn('Error parsing backup storage key', err);
      }
    }

    return baseState;
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return { ...INITIAL_STATE };
}

export function saveAppState(state: AppState) {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
    // Keep a persistent safety backup if state contains valuable user accounts or trades
    if ((state.accounts && state.accounts.length > 0) || (state.trades && state.trades.length > 0)) {
      localStorage.setItem(BACKUP_STORAGE_KEY, serialized);
    }
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function resetToCleanSlate(): AppState {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('tilt_buddy_state_v2');
    localStorage.removeItem('tilt_filter_state_v3');
    // Clear any and all related keys
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('tilt_') || key.startsWith('app_') || key.includes('trade') || key.includes('session'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  } catch (e) {
    console.error('Failed to clear storage', e);
  }

  return {
    ...CLEAN_SLATE_STATE,
    dayCounter: 1,
    cleanStreak: 0,
    dailyScoreboard: [],
    trades: [],
    tiltEvents: [],
    deskMessages: [],
    tiltScore: 0,
    tiltTab: 0,
    accounts: [],
    activeAccountId: '',
    rules: [
      { id: 'r1', text: 'HTF IS CLEAR NOT CHOP?', checked: false, tag: 'Structure', tags: ['Structure'] },
      { id: 'r2', text: 'IB OR FRB SETUP', checked: false, tag: 'Setup', tags: ['Setup'] },
      { id: 'r3', text: "HH/HL's or LH/LL's", checked: false, tag: 'Trigger', tags: ['Trigger'] },
    ],
    emotionalTracker: {
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
    },
  };
}
