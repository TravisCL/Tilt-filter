import { AppState, DailyScoreRecord } from '../types';
import { broadcastStateChange } from './syncService';

export const EST_ROLLOVER_HOUR = 17; // 5 PM
export const EST_ROLLOVER_MINUTE = 35; // 35 mins -> 5:35 PM EST

/**
 * Returns current date/time components converted to America/New_York timezone.
 */
export function getESTDate(date: Date = new Date()): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dateStr: string; // "YYYY-MM-DD"
  formattedDisplay: string; // e.g. "Fri, Sep 11"
} {
  // Use Intl.DateTimeFormat with America/New_York
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = dtf.formatToParts(date);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

  const year = parseInt(getPart('year'), 10) || date.getFullYear();
  const month = parseInt(getPart('month'), 10) || date.getMonth() + 1;
  const day = parseInt(getPart('day'), 10) || date.getDate();
  const hour = parseInt(getPart('hour'), 10) || 0;
  const minute = parseInt(getPart('minute'), 10) || 0;
  const second = parseInt(getPart('second'), 10) || 0;
  const weekday = getPart('weekday') || 'Day';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDisplay = `${weekday}, ${monthNames[month - 1] || 'Sep'} ${day}`;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dateStr,
    formattedDisplay,
  };
}

/**
 * Checks if today in EST had any tilt breach.
 * Tilt breach happens IF AND ONLY IF:
 * 1. The trader admitted to feeling frustrated ('frustrated') on any trade today.
 * 2. The trader admitted to feeling like chasing ('feel_like_chasing') on any trade today.
 */
export function evaluateTodayTiltStatus(
  state: AppState,
  targetDateStr?: string
): {
  isTiltDay: boolean;
  tiltReasons: string[];
  chaseCount: number;
  frustratedCount: number;
  todayLossTally: number;
} {
  const dateToEvaluate = targetDateStr || getESTDate().dateStr;

  // Find all trades logged for this date
  const candidateTrades = (state.trades || []).filter((t) => {
    if (!t.date) return false;
    return t.date === dateToEvaluate;
  });

  // Find tilt events for this date
  const candidateEvents = (state.tiltEvents || []).filter((e) => {
    // If tradeId exists, check trade date
    if (e.tradeId) {
      const parentTrade = (state.trades || []).find((t) => t.id === e.tradeId);
      if (parentTrade?.date === dateToEvaluate) return true;
    }
    return false;
  });

  let chaseCount = 0;
  let frustratedCount = 0;
  const tiltReasons: string[] = [];
  let todayLossTally = 0;

  // Check trade emotional states
  candidateTrades.forEach((t) => {
    if (t.emotionalState === 'feel_like_chasing') {
      chaseCount++;
      tiltReasons.push(`Chased after a loser on Trade #${t.orderNumber} (${t.symbol || 'Trade'})`);
      if (t.pnl && t.pnl < 0) {
        todayLossTally += Math.abs(t.pnl);
      }
    } else if (t.emotionalState === 'frustrated') {
      frustratedCount++;
      tiltReasons.push(`Admitted to feeling frustrated on Trade #${t.orderNumber} (${t.symbol || 'Trade'})`);
      if (t.pnl && t.pnl < 0) {
        todayLossTally += Math.abs(t.pnl);
      }
    }
  });

  // Also check candidateEvents in case feeling was logged
  candidateEvents.forEach((ev) => {
    if (ev.feeling === 'feel_like_chasing' && chaseCount === 0) {
      chaseCount++;
      tiltReasons.push('Chasing impulse logged');
    } else if (ev.feeling === 'frustrated' && frustratedCount === 0) {
      frustratedCount++;
      tiltReasons.push('Frustration logged');
    }
  });

  const isTiltDay = chaseCount > 0 || frustratedCount > 0;

  return {
    isTiltDay,
    tiltReasons,
    chaseCount,
    frustratedCount,
    todayLossTally,
  };
}

/**
 * On a tilt day, drop the trader exactly one tier instead of resetting all the
 * way to zero. Mapped to the tier day-thresholds (30/60/90):
 *   90+ (Diamond)  -> 60 (Platinum)
 *   60+ (Platinum) -> 30 (Gold)
 *   30+ (Gold) and below (Silver/Bronze) -> 0 (Copper)
 */
export function computeTiltDrop(priorStreak: number): number {
  if (priorStreak >= 90) return 60;
  if (priorStreak >= 60) return 30;
  return 0;
}

/**
 * Checks if the board needs to automatically update at 5:35 PM EST.
 * If current EST time is past 5:35 PM and today hasn't been finalized in the dailyScoreboard,
 * this rolls over the board automatically without requiring any manual button clicks.
 */
export function checkAndApplyESTDailyRollover(state: AppState): {
  state: AppState;
  updated: boolean;
} {
  const estNow = getESTDate();
  const isPastRolloverTime =
    estNow.hour > EST_ROLLOVER_HOUR ||
    (estNow.hour === EST_ROLLOVER_HOUR && estNow.minute >= EST_ROLLOVER_MINUTE);

  if (!isPastRolloverTime) {
    return { state, updated: false };
  }

  const todayStr = estNow.dateStr;
  const existingScoreboard = state.dailyScoreboard || [];
  const existingRecord = existingScoreboard.find((r) => r.date === todayStr);

  // If already recorded and finalized for today, nothing more to do
  if (existingRecord && existingRecord.status !== 'active') {
    return { state, updated: false };
  }

  // Evaluate today's tilt status strictly from emotional self-admissions
  const tiltEvaluation = evaluateTodayTiltStatus(state, todayStr);
  const isClean = !tiltEvaluation.isTiltDay;

  const priorStreak = state.cleanStreak || 0;
  // Day counter: only advance when a brand-new day's record is being created.
  // Derived from scoreboard length rather than trusted blindly, so it self-heals
  // even if it was previously stuck (see the "never incremented" bug).
  const currentDay = existingRecord ? (state.dayCounter || 1) : existingScoreboard.length + 1;
  const nextCleanStreak = isClean ? priorStreak + 1 : computeTiltDrop(priorStreak);
  const nextTiltScore = isClean ? 0 : Math.max(1, state.tiltScore || 1);
  const nextTiltTab = isClean ? 0 : tiltEvaluation.todayLossTally || state.tiltTab || 0;

  const todayTrades = (state.trades || []).filter((t) => t.date === todayStr);
  const todayPnl = todayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const plannedTrades = todayTrades.filter((t) => t.plannedStatus === 'planned').length;

  const recordPayload: DailyScoreRecord = {
    id: existingRecord?.id || `sb-${todayStr}-${Date.now()}`,
    date: todayStr,
    dayLabel: `Day ${currentDay} (${estNow.formattedDisplay})`,
    feelLevel: state.emotionalTracker?.feelLevel ?? 5,
    sleepLevel: state.emotionalTracker?.sleepLevel ?? 8,
    morningNotes: state.emotionalTracker?.morningNotes || '',
    walkOutNotes: isClean
      ? 'No tilt day verified at 5:35 PM EST. Zero frustration or chase impulses.'
      : `Tilt day logged at 5:35 PM EST: ${tiltEvaluation.tiltReasons.join('; ')}`,
    dailyProcessScore: isClean ? 100 : 40,
    emotionalConsistencyPercent: isClean ? 100 : 50,
    ruleAdherencePercent: todayTrades.length > 0 ? Math.round((plannedTrades / todayTrades.length) * 100) : 100,
    tradesCount: todayTrades.length,
    plannedTradesCount: plannedTrades,
    unplannedTradesCount: todayTrades.length - plannedTrades,
    wellManagedExitsCount: todayTrades.filter((t) => t.discipline === 'managed_well').length,
    emotionalExitsCount: todayTrades.filter((t) => t.discipline === 'exited_emotionally').length,
    pnl: todayPnl,
    isCleanDay: isClean,
    status: isClean ? 'clean' : 'tilted',
    sessionOutcome: isClean ? 'clean' : 'tilted',
  };

  const updatedScoreboard = existingRecord
    ? existingScoreboard.map((r) => (r.date === todayStr ? recordPayload : r))
    : [recordPayload, ...existingScoreboard];

  const nextState: AppState = {
    ...state,
    dayCounter: currentDay,
    cleanStreak: nextCleanStreak,
    tiltScore: nextTiltScore,
    tiltTab: nextTiltTab,
    dailyScoreboard: updatedScoreboard,
    deskMessages: [
      ...state.deskMessages,
      {
        id: `msg-535-rollover-${Date.now()}`,
        sender: 'BUDDY',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isClean
          ? `🏆 5:35 PM EST UPDATE: Day ${currentDay} confirmed as a NO TILT DAY! Clean streak is now ${nextCleanStreak} days.`
          : `⚠️ 5:35 PM EST UPDATE: Day ${currentDay} marked as a TILT DAY (${tiltEvaluation.tiltReasons.join(', ')}). Streak dropped to ${nextCleanStreak} days.`,
      },
    ],
  };

  broadcastStateChange(nextState);
  return { state: nextState, updated: true };
}
