export type TierLevel = 'copper' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface TierInfo {
  level: TierLevel;
  title: string;
  subtitle: string;
  daysRequirement: string;
  badgeLabel: string;
  description: string;
  color: string;
}

export const TIERS_CONFIG: Record<TierLevel, TierInfo> = {
  diamond: {
    level: 'diamond',
    title: 'Master of emotions and process',
    subtitle: 'Diamond',
    daysRequirement: '1/90 days Diamond',
    badgeLabel: 'Diamond',
    description: 'Discipline is automatic. Flawless execution without emotional interference.',
    color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10',
  },
  platinum: {
    level: 'platinum',
    title: 'Honest professional',
    subtitle: 'Platinum',
    daysRequirement: '1/60 days Platinum',
    badgeLabel: 'Platinum',
    description: 'Consistent adherence, deep emotional self-awareness, zero tilt spirals.',
    color: 'text-teal-300 border-teal-500/40 bg-teal-500/10',
  },
  gold: {
    level: 'gold',
    title: 'Process trader',
    subtitle: 'Gold',
    daysRequirement: '1/30 days Gold',
    badgeLabel: 'Gold',
    description: '30 clean days. Setup execution is mechanical and disciplined.',
    color: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  silver: {
    level: 'silver',
    title: 'Rules student',
    subtitle: 'Silver',
    daysRequirement: 'Working it. Still leaking. Next: Gold, 1/30 days.',
    badgeLabel: 'Rules student',
    description: 'Working through discipline and sizing strategy. Building process memory.',
    color: 'text-slate-300 border-slate-500/40 bg-slate-500/10',
  },
  bronze: {
    level: 'bronze',
    title: 'Random trader',
    subtitle: 'Bronze',
    daysRequirement: 'Bronze',
    badgeLabel: 'Random trader',
    description: 'Inconsistent playbook entries, frequent impulse trades.',
    color: 'text-orange-400 border-orange-500/40 bg-orange-500/10',
  },
  copper: {
    level: 'copper',
    title: 'Gambler',
    subtitle: 'Copper',
    daysRequirement: 'Copper',
    badgeLabel: 'Gambler',
    description: 'Chasing losses, sizing erratically, revenge trading after red days.',
    color: 'text-red-400 border-red-500/40 bg-red-500/10',
  },
};

export type TradeQualityGrade = 'A_PLUS' | 'A' | 'B' | 'C';

export type AccountDrawdownType = 'eod' | 'static' | 'intraday_trailing';
export type AccountCategory = 'live' | 'eval';
export type AccountStatus = 'active' | 'blown';

export interface TradingAccount {
  id: string;
  name: string; // e.g. "TPT 50K EVAL"
  size: number; // e.g. 50000
  drawdownType: AccountDrawdownType;
  maxDrawdown: number; // e.g. 2000
  floorLevel?: number; // e.g. 50000
  stopTrailingAtFloor: boolean; // "does drawdown stop trailing at the floor? Yes or no"
  currentBalance: number;
  highWaterMark: number;
  active: boolean;
  accountType?: AccountCategory; // 'live' or 'eval'
  status?: AccountStatus; // 'active' or 'blown'
  blownDate?: string;
}

export interface RuleItem {
  id: string;
  text: string;
  checked: boolean;
  tag?: string;
  tags?: string[];
}

export type ExitDiscipline = 'managed_well' | 'exited_emotionally';
export type LossFeeling = 'fine' | 'frustrated' | 'feel_like_chasing';
export type TiltRiskLevel = 'low' | 'moderate' | 'high';

export interface TiltEvent {
  id: string;
  tradeId?: string;
  tradeOrderNumber?: number;
  tradeName?: string;
  timestamp: string;
  feeling: LossFeeling;
  tiltRisk: TiltRiskLevel;
  lossAmount: number;
  notes?: string;
}

export interface CompletedTrade {
  id: string;
  orderNumber: number; // 1st trade, 2nd trade, etc.
  timestamp: string; // e.g. "SEP 1, 1:18 PM"
  plannedStatus: 'planned' | 'unplanned';
  quality: TradeQualityGrade;
  symbol: string;
  riskDollars: number;
  riskPercent: number; // 5%, 10%, 15%
  pnl: number; // e.g. +$66.50
  rMultiple: number; // e.g. 0.68R
  rulesHeld: boolean;
  discipline?: ExitDiscipline;
  disciplineSelected?: boolean;
  takeProfitTarget?: number;
  name: string; // e.g. "1B long, FVG tap" or "Momo"
  outcome?: 'winner' | 'loser';
  emotionalState?: LossFeeling;
  tiltRisk?: TiltRiskLevel;
  screenshotUrl?: string;
  checklistAnswers: {
    rule1: boolean;
    rule2: boolean;
    rule3: boolean;
    q4CalculatedRisk: boolean;
    q5NotFomo: boolean;
  };
  ruleNotes?: Record<string, string>;
  notes?: string;
  memo?: string;
  accountId?: string;
  accountName?: string;
}

export interface FeelScaleItem {
  level: number;
  title: string;
  description?: string;
  color: string;
}

export interface SleepScaleItem {
  level: number;
  title: string;
}

export interface EmotionalTrackerData {
  feelLevel: number | null;
  sleepLevel?: number | null;
  sleepQuality?: string;
  focusIntention?: string;
  triggersDistractions?: string;
  walkOutNotes: string;
  morningNotes: string;
  updatedAt: string;
  morningCheckInDate?: string;
  morningCheckInCompleted?: boolean;
  sessionOutcome?: 'clean' | 'minor_slip' | 'tilted' | 'pending';
  sessionReflection?: string;
}

export interface DailyScoreRecord {
  id: string;
  date: string; // ISO format e.g. "2026-09-08"
  dayLabel: string; // e.g. "Mon, Sep 7"
  feelLevel: number; // 1-10
  sleepLevel?: number | null; // Optional legacy numeric rating
  sleepQuality?: string;
  focusIntention?: string;
  triggersDistractions?: string;
  morningNotes?: string;
  walkOutNotes?: string;
  dailyProcessScore: number; // 0-100
  emotionalConsistencyPercent: number; // 0-100%
  ruleAdherencePercent: number; // 0-100%
  tradesCount: number;
  plannedTradesCount: number;
  unplannedTradesCount: number;
  wellManagedExitsCount: number;
  emotionalExitsCount: number;
  pnl: number;
  isCleanDay: boolean;
  status: 'clean' | 'tilted' | 'active';
  sessionOutcome?: 'clean' | 'minor_slip' | 'tilted' | 'pending';
  sessionReflection?: string;
}

export interface DeskMessage {
  id: string;
  sender: 'YOU' | 'BUDDY';
  time: string;
  text: string;
}

export interface AppState {
  currentView: 'checkin' | 'tally' | 'session' | 'board' | 'accounts' | 'tracker' | 'profile' | 'invites';
  accounts: TradingAccount[];
  activeAccountId: string;
  rules: RuleItem[];
  systemTags?: string[];
  trades: CompletedTrade[];
  deskMessages: DeskMessage[];
  emotionalTracker: EmotionalTrackerData;
  dailyScoreboard?: DailyScoreRecord[];
  cleanStreak: number;
  tiltScore: number;
  tiltTab: number;
  currentTier: TierLevel;
  customRiskInput: string;
  selectedSizingTier: 'B' | 'A' | 'A_PLUS';
  tiltEvents?: TiltEvent[];
}

// Backward compatibility types
export type TradeQuality = 'B' | 'A' | 'A_PLUS';

export interface QualityPreset {
  id: TradeQuality;
  label: string;
  defaultRiskPercent: number;
  defaultRiskDollars: number;
  description: string;
  color: string;
}

export const QUALITY_PRESETS: Record<TradeQuality, QualityPreset> = {
  B: {
    id: 'B',
    label: 'B Setup (5%)',
    defaultRiskPercent: 5,
    defaultRiskDollars: 100,
    description: 'Minor conviction or lower timeframe confirmation',
    color: 'amber',
  },
  A: {
    id: 'A',
    label: 'A Setup (10%)',
    defaultRiskPercent: 10,
    defaultRiskDollars: 200,
    description: 'Solid high timeframe confluence and clean structure',
    color: 'emerald',
  },
  A_PLUS: {
    id: 'A_PLUS',
    label: 'A+ Setup (15%)',
    defaultRiskPercent: 15,
    defaultRiskDollars: 300,
    description: 'Prime alignment: Key level, clean HTF, zero chop, high volume',
    color: 'indigo',
  },
};

export const TIERS = TIERS_CONFIG;

export type DrawdownType = 'static' | 'eod_trailing' | 'intraday_trailing';

export interface DrawdownConfig {
  accountSize: number;
  maxDrawdown: number;
  drawdownType: DrawdownType;
  stopTrailingAtFloor: boolean;
  floorBalance: number;
  currentBalance: number;
  highWaterMark: number;
  intradayManualPeak?: number;
  dailyRecalculationTime: string;
}

export interface AppSettings {
  customQ1Text: string;
  customQ2Text: string;
  customQ3Text: string;
  hourlyTradeLimit: number;
  tiltStrikeThreshold: number;
}

export interface PreTradeChecklist {
  q1Custom: boolean;
  q2Custom: boolean;
  q3Custom: boolean;
  q4CalculatedRisk: boolean;
  q5NotFomo: boolean;
  quality: TradeQuality;
  riskPercent: number;
  riskDollars: number;
  expectedRR: number;
  winRateEstimate: number;
  expectedValue: number;
  profitFactor: number;
}

export type PostTradeFeeling = 'fine' | 'need_to_chase' | 'revengeful';

export interface PostTradeReview {
  feeling: PostTradeFeeling;
  exitDiscipline: ExitDiscipline;
  notes?: string;
  reviewedAt: string;
}

export interface Trade {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  pnl?: number;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt?: string;
  checklist: PreTradeChecklist;
  postTradeReview?: PostTradeReview;
  exitDiscipline?: ExitDiscipline;
  notes?: string;
  screenshotUrl?: string;
}

export interface MoodEntry {
  type: 'START' | 'END';
  mood: string;
  notes: string;
  timestamp: string;
}

export interface DailySession {
  date: string;
  tiltStrikes: number;
  isFlaggedTilted: boolean;
  isCleanDay: boolean;
  tradesCount: number;
  managedWellCount: number;
  exitedEmotionallyCount: number;
  startMood?: MoodEntry;
  endMood?: MoodEntry;
  frozenAdvancementNote?: string;
}

