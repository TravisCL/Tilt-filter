import { AppState, TierLevel, TIERS_CONFIG, TierInfo } from '../types';
import { evaluateTodayTiltStatus, getESTDate, computeTiltDrop } from './dailyRollover';

export interface TierProgressionDetails {
  level: TierLevel;
  title: string;
  subtitle: string;
  badgeLabel: string;
  minDays: number;
  description: string;
  statusTagline: string;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
  glowColor: string;
  textColor: string;
}

export const TIER_MILESTONES: Record<TierLevel, TierProgressionDetails> = {
  diamond: {
    level: 'diamond',
    title: 'Master of Emotions & Process',
    subtitle: 'Diamond Rank',
    badgeLabel: 'Diamond Master',
    minDays: 90,
    description: 'Automatic execution discipline. Total immunity to tilt spirals and emotional interference.',
    statusTagline: 'Apex Mastery • 90+ Clean Days',
    accentColor: 'text-cyan-300',
    bgGradient: 'from-[#0e2c3d] via-[#09202c] to-[#06141c]',
    borderColor: 'border-cyan-400',
    glowColor: 'shadow-cyan-500/30 ring-cyan-400/40',
    textColor: 'text-cyan-200',
  },
  platinum: {
    level: 'platinum',
    title: 'Honest Professional',
    subtitle: 'Platinum Rank',
    badgeLabel: 'Platinum Pro',
    minDays: 60,
    description: 'Consistent rule adherence, deep emotional self-awareness, and zero tilt leakage across sessions.',
    statusTagline: 'Professional Discipline • 60+ Clean Days',
    accentColor: 'text-teal-300',
    bgGradient: 'from-[#0f2933] via-[#0a1e26] to-[#06141a]',
    borderColor: 'border-teal-400',
    glowColor: 'shadow-teal-500/25 ring-teal-400/40',
    textColor: 'text-teal-200',
  },
  gold: {
    level: 'gold',
    title: 'Process Trader',
    subtitle: 'Gold Rank',
    badgeLabel: 'Gold Standard',
    minDays: 30,
    description: '30 clean days verified. Setup execution is mechanical, patient, and strictly disciplined.',
    statusTagline: 'Process Hardened • 30+ Clean Days',
    accentColor: 'text-amber-300',
    bgGradient: 'from-[#261f0d] via-[#1a1508] to-[#0d0a04]',
    borderColor: 'border-amber-400',
    glowColor: 'shadow-amber-500/25 ring-amber-400/40',
    textColor: 'text-amber-200',
  },
  silver: {
    level: 'silver',
    title: 'Rules Student',
    subtitle: 'Silver Rank',
    badgeLabel: 'Rules Student',
    minDays: 7,
    description: 'Building muscle memory, executing checklist rules, and managing risk exposure with structure.',
    statusTagline: 'Rules Disciplined • 7+ Clean Days',
    accentColor: 'text-sky-300',
    bgGradient: 'from-[#102738] via-[#0b1c29] to-[#07131c]',
    borderColor: 'border-sky-400',
    glowColor: 'shadow-sky-500/25 ring-sky-400/40',
    textColor: 'text-sky-200',
  },
  bronze: {
    level: 'bronze',
    title: 'Foundation Builder',
    subtitle: 'Bronze Rank',
    badgeLabel: 'Foundation',
    minDays: 1,
    description: 'Establishing initial streaks, logging trades through the filter, and breaking impulse habits.',
    statusTagline: 'Building Foundation • 1+ Clean Days',
    accentColor: 'text-orange-300',
    bgGradient: 'from-[#24170e] via-[#18100a] to-[#0d0805]',
    borderColor: 'border-orange-400/60',
    glowColor: 'shadow-orange-500/20 ring-orange-400/30',
    textColor: 'text-orange-200',
  },
  copper: {
    level: 'copper',
    title: 'Reset / In Breach',
    subtitle: 'Copper Rank',
    badgeLabel: 'Tilt Reset',
    minDays: 0,
    description: 'Reset state after a tilt breach. Regain emotional composure and restart clean day progression.',
    statusTagline: 'Clean Slate Required',
    accentColor: 'text-rose-400',
    bgGradient: 'from-[#260f14] via-[#1a0a0e] to-[#0d0507]',
    borderColor: 'border-rose-500/50',
    glowColor: 'shadow-rose-500/20 ring-rose-400/30',
    textColor: 'text-rose-200',
  },
};

export const TIER_ORDER: TierLevel[] = ['diamond', 'platinum', 'gold', 'silver', 'bronze', 'copper'];

/**
 * Calculates the earned status tier strictly from authentic no-tilt days.
 * A tilt drops the trader by one tier (see computeTiltDrop) rather than
 * force-resetting to Copper — Copper is only earned when noTiltDays is truly 0.
 */
export function calculateEarnedTier(noTiltDays: number): TierLevel {
  if (noTiltDays >= 90) return 'diamond';
  if (noTiltDays >= 60) return 'platinum';
  if (noTiltDays >= 30) return 'gold';
  if (noTiltDays >= 7) return 'silver';
  if (noTiltDays >= 1) return 'bronze';
  return 'copper';
}

export interface NoTiltStats {
  noTiltDays: number;
  cleanStreak: number;
  totalLoggedCleanDays: number;
  currentTier: TierLevel;
  tierInfo: TierProgressionDetails;
  nextTier: TierProgressionDetails | null;
  daysToNextTier: number;
  progressPercent: number;
  isMaxTier: boolean;
  activeTiltTab: number;
  isTodayTilt: boolean;
  tiltReasons: string[];
}

export function getNoTiltStats(state: AppState): NoTiltStats {
  const estDate = getESTDate();
  const todayStr = estDate.dateStr;

  // STRICT TILT EVALUATION:
  // A day is a tilt day IF AND ONLY IF the trader admitted to feeling frustrated OR chased after a loser.
  const todayTiltEval = evaluateTodayTiltStatus(state, todayStr);

  // Check historical scoreboard clean days
  const loggedCleanDays = (state.dailyScoreboard || []).filter(
    (s) => s.isCleanDay || s.status === 'clean' || s.sessionOutcome === 'clean'
  ).length;

  const cleanStreak = Math.max(0, state.cleanStreak ?? 0);
  const totalLoggedCleanDays = Math.max(cleanStreak, loggedCleanDays);

  // If today had frustration or chase impulse logged, today is a tilt breach
  const hasActiveTiltToday = todayTiltEval.isTiltDay;
  const activeTiltTab = hasActiveTiltToday
    ? Math.max(state.tiltTab || 0, todayTiltEval.todayLossTally || 0)
    : 0;

  // Active No Tilt Days:
  // If the trader tilted today (frustrated or chased), drop exactly one tier
  // (see computeTiltDrop) instead of resetting all the way to 0.
  // Otherwise, the trader has NOT tilted: they are on clean day 1+ (their accumulated clean streak).
  // Note: dayCounter (total days using the app, never decreasing) is intentionally
  // NOT part of this — it would prevent the tier from ever dropping on a tilt.
  const noTiltDays = hasActiveTiltToday
    ? computeTiltDrop(cleanStreak)
    : Math.max(
        1, // If no tilt occurred today, they have at least 1 clean day
        cleanStreak,
        totalLoggedCleanDays
      );

  const earnedTier = calculateEarnedTier(noTiltDays);
  const tierInfo = TIER_MILESTONES[earnedTier];

  // Determine next milestone and days to rank up
  let nextTier: TierProgressionDetails | null = null;
  let daysToNextTier = 0;
  let progressPercent = 100;
  let isMaxTier = false;

  if (earnedTier === 'diamond') {
    isMaxTier = true;
    nextTier = null;
    daysToNextTier = 0;
    progressPercent = 100;
  } else if (earnedTier === 'platinum') {
    nextTier = TIER_MILESTONES.diamond;
    daysToNextTier = Math.max(0, 90 - noTiltDays);
    const range = 90 - 60;
    const currentInRange = Math.max(0, noTiltDays - 60);
    progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));
  } else if (earnedTier === 'gold') {
    nextTier = TIER_MILESTONES.platinum;
    daysToNextTier = Math.max(0, 60 - noTiltDays);
    const range = 60 - 30;
    const currentInRange = Math.max(0, noTiltDays - 30);
    progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));
  } else if (earnedTier === 'silver') {
    nextTier = TIER_MILESTONES.gold;
    daysToNextTier = Math.max(0, 30 - noTiltDays);
    const range = 30 - 7;
    const currentInRange = Math.max(0, noTiltDays - 7);
    progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));
  } else if (earnedTier === 'bronze') {
    nextTier = TIER_MILESTONES.silver;
    daysToNextTier = Math.max(0, 7 - noTiltDays);
    progressPercent = Math.min(100, Math.round((noTiltDays / 7) * 100));
  } else {
    // Copper (reset)
    nextTier = TIER_MILESTONES.bronze;
    daysToNextTier = 1;
    progressPercent = 0;
  }

  return {
    noTiltDays,
    cleanStreak,
    totalLoggedCleanDays,
    currentTier: earnedTier,
    tierInfo,
    nextTier,
    daysToNextTier,
    progressPercent,
    isMaxTier,
    activeTiltTab,
    isTodayTilt: hasActiveTiltToday,
    tiltReasons: todayTiltEval.tiltReasons,
  };
}
