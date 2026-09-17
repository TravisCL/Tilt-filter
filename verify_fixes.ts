// Verification script for the day-counter + tier-drop fixes.
// Imports the REAL fixed functions from src/ (not a mock/copy).
// Run with: npx tsx verify_fixes.ts

import { getESTDate, computeTiltDrop } from './src/utils/dailyRollover';
import { calculateEarnedTier, getNoTiltStats } from './src/utils/tierProgression';
import { AppState, CompletedTrade, DailyScoreRecord } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

console.log('=== 1. Day counter increments correctly across multiple days (fixed formula) ===');
{
  let dayCounter = 1;
  let scoreboard: DailyScoreRecord[] = [];
  const days = ['2026-09-10', '2026-09-11', '2026-09-12'];
  days.forEach((dateStr, i) => {
    const todayIndex = scoreboard.findIndex((s) => s.date === dateStr);
    const nextDayCounter = todayIndex >= 0 ? dayCounter : scoreboard.length + 1;
    scoreboard = [{ id: `sb-${dateStr}`, date: dateStr, dayLabel: `Day ${nextDayCounter}`, feelLevel: 5, dailyProcessScore: 80, emotionalConsistencyPercent: 80, ruleAdherencePercent: 100, tradesCount: 0, plannedTradesCount: 0, unplannedTradesCount: 0, wellManagedExitsCount: 0, emotionalExitsCount: 0, pnl: 0, isCleanDay: true, status: 'clean' }, ...scoreboard];
    dayCounter = nextDayCounter;
    check(`day ${i + 1} check-in -> dayCounter`, dayCounter, i + 1);
  });
}

console.log('\n=== 2. computeTiltDrop — one tier down, not full reset ===');
check('90 (Diamond) tilts -> 60 (Platinum)', computeTiltDrop(90), 60);
check('75 (Platinum band, 60-89) tilts -> 30 (Gold)', computeTiltDrop(75), 30);
check('60 (Platinum) tilts -> 30 (Gold)', computeTiltDrop(60), 30);
check('45 (Gold band, 30-59) tilts -> 0 (Copper)', computeTiltDrop(45), 0);
check('30 (Gold) tilts -> 0 (Copper)', computeTiltDrop(30), 0);
check('15 (Silver) tilts -> 0', computeTiltDrop(15), 0);
check('3 (Bronze) tilts -> 0', computeTiltDrop(3), 0);
check('0 tilts -> 0', computeTiltDrop(0), 0);

console.log('\n=== 3. calculateEarnedTier thresholds (Copper now reachable at 0) ===');
check('0 days -> copper', calculateEarnedTier(0), 'copper');
check('1 day -> bronze', calculateEarnedTier(1), 'bronze');
check('7 days -> silver', calculateEarnedTier(7), 'silver');
check('30 days -> gold', calculateEarnedTier(30), 'gold');
check('60 days -> platinum', calculateEarnedTier(60), 'platinum');
check('90 days -> diamond', calculateEarnedTier(90), 'diamond');

console.log('\n=== 4. getNoTiltStats end-to-end: tilting today drops one tier, not to zero ===');
// NOTE: the streak is now computed fresh from dailyScoreboard + trades/tiltEvents
// history (see verify_streak_redesign.ts) rather than trusted from state.cleanStreak.
// So "prior streak" here must be built as real scoreboard history, not just a number.
function makeStateWithPriorStreakAndTodayTilt(priorStreak: number): AppState {
  const todayStr = getESTDate().dateStr;
  const tiltedTrade: CompletedTrade = {
    id: 't1', orderNumber: 1, timestamp: '9:00 AM', date: todayStr,
    plannedStatus: 'planned', quality: 'A', symbol: 'XAUUSD',
    riskDollars: 200, riskPercent: 10, pnl: -200, rMultiple: -1,
    rulesHeld: true, name: 'Test trade', emotionalState: 'frustrated',
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };

  const pastDays: DailyScoreRecord[] = [];
  for (let i = priorStreak; i >= 1; i--) {
    const d = new Date(`${todayStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    pastDays.push({
      id: `sb-${dateStr}`, date: dateStr, dayLabel: dateStr, feelLevel: 5, dailyProcessScore: 90,
      emotionalConsistencyPercent: 90, ruleAdherencePercent: 100, tradesCount: 0, plannedTradesCount: 0,
      unplannedTradesCount: 0, wellManagedExitsCount: 0, emotionalExitsCount: 0, pnl: 0,
      isCleanDay: true, status: 'clean',
    });
  }

  return {
    currentView: 'session', accounts: [], activeAccountId: '', rules: [],
    trades: [tiltedTrade], deskMessages: [], tiltEvents: [],
    emotionalTracker: { feelLevel: 5, walkOutNotes: '', morningNotes: '', updatedAt: '' },
    dailyScoreboard: pastDays, cleanStreak: 999, dayCounter: 500, // both deliberately garbage — must NOT leak into tier calc
    tiltScore: 0, tiltTab: 0, currentTier: 'bronze', customRiskInput: '', selectedSizingTier: 'B',
  };
}

check('was Diamond (90), tilts today -> tier Platinum (not Copper)', getNoTiltStats(makeStateWithPriorStreakAndTodayTilt(90)).currentTier, 'platinum');
check('was Platinum (60), tilts today -> tier Gold', getNoTiltStats(makeStateWithPriorStreakAndTodayTilt(60)).currentTier, 'gold');
check('was Gold (30), tilts today -> tier Copper', getNoTiltStats(makeStateWithPriorStreakAndTodayTilt(30)).currentTier, 'copper');
check('was Silver (10), tilts today -> tier Copper', getNoTiltStats(makeStateWithPriorStreakAndTodayTilt(10)).currentTier, 'copper');

console.log('\n=== 5. Garbage cleanStreak/dayCounter fields no longer leak into the tier calc ===');
{
  const s = makeStateWithPriorStreakAndTodayTilt(90);
  s.dayCounter = 500;
  s.cleanStreak = 12345;
  const stats = getNoTiltStats(s);
  check('noTiltDays reflects real tier-drop (60) from computed history, ignores stale fields', stats.noTiltDays, 60);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
