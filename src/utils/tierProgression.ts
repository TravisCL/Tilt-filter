import { AppState, TierLevel, TIERS_CONFIG, TierInfo } from '../types';

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
 * Calculates the earned status tier strictly from authentic no-tilt days and tilt impact.
 * Ensures the status symbol is earned through discipline, not arbitrary clicking.
 */
export function calculateEarnedTier(noTiltDays: number, activeTiltTab: number = 0): TierLevel {
  if (activeTiltTab > 0) {
    return 'copper';
  }
  if (noTiltDays >= 90) return 'diamond';
  if (noTiltDays >= 60) return 'platinum';
  if (noTiltDays >= 30) return 'gold';
  if (noTiltDays >= 7) return 'silver';
  if (noTiltDays >= 1) return 'bronze';
  return 'silver'; // Default foundational starting status
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
}

export function getNoTiltStats(state: AppState): NoTiltStats {
  const cleanStreak = Math.max(0, state.cleanStreak ?? 0);
  const totalLoggedCleanDays = Math.max(
    cleanStreak,
    (state.dailyScoreboard || []).filter((s) => s.isCleanDay || s.status === 'clean').length
  );
  
  // Use clean streak as the primary live no-tilt metric
  const noTiltDays = cleanStreak;

  // Active tilt tab calculation
  const activeTiltEvents = (state.tiltEvents || []).filter(
    (e) => typeof e.lossAmount === 'number' && e.lossAmount > 0
  );
  const calculatedTiltTab = activeTiltEvents
    .filter((e) => e.feeling === 'feel_like_chasing' || e.feeling === 'frustrated')
    .reduce((acc, curr) => acc + (curr.lossAmount || 0), 0);
  const activeTiltTab = Math.max(state.tiltTab || 0, calculatedTiltTab);

  const earnedTier = calculateEarnedTier(noTiltDays, activeTiltTab);
  const tierInfo = TIER_MILESTONES[earnedTier];

  // Determine next milestone
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
    const range = 7 - 1;
    const currentInRange = Math.max(0, noTiltDays - 1);
    progressPercent = Math.min(100, Math.round((currentInRange / range) * 100));
  } else {
    // copper
    nextTier = TIER_MILESTONES.silver;
    daysToNextTier = 7;
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
  };
}
