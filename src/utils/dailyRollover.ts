import { AppState, DailyScoreRecord } from '../types';

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

// NOTE: there used to be a checkAndApplyESTDailyRollover() here that finalized
// each day at 5:35 PM EST and incremented cleanStreak/tiltScore/tiltTab. It was
// removed — the streak is no longer a persisted counter that needs finalizing on
// a schedule; see computeCurrentStreak() in tierProgression.ts, which derives it
// fresh from this file's evaluateTodayTiltStatus() every time it's needed. That
// removes the entire "finalization never ran" class of bug (the streak used to
// silently stop updating if the app wasn't open at the cutoff).
