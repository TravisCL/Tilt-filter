// Verifies the new computed-from-history streak logic (computeCurrentStreak),
// which replaces the old persisted-counter-that-needs-finalizing design.
// Run with: npx tsx verify_streak_redesign.ts

import { computeCurrentStreak, computeStreakHistory, getNoTiltStats } from './src/utils/tierProgression';
import { AppState, CompletedTrade, DailyScoreRecord, TiltEvent } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function scoreboardRow(date: string, statusIsLieAboutClean = false): DailyScoreRecord {
  // Deliberately sets status:'clean' regardless of actual behavior, simulating
  // the OLD broken finalization that always marks days clean at check-in time.
  // The new streak logic must NOT trust this field at all.
  return {
    id: `sb-${date}`, date, dayLabel: date, feelLevel: 5, dailyProcessScore: 90,
    emotionalConsistencyPercent: 90, ruleAdherencePercent: 100, tradesCount: 0,
    plannedTradesCount: 0, unplannedTradesCount: 0, wellManagedExitsCount: 0,
    emotionalExitsCount: 0, pnl: 0, isCleanDay: statusIsLieAboutClean, status: 'clean',
  };
}

function tiltedTrade(id: string, date: string): CompletedTrade {
  return {
    id, orderNumber: 1, timestamp: '2:00 PM', date, plannedStatus: 'planned', quality: 'A',
    symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: -100, rMultiple: -1, rulesHeld: true,
    name: 'test', emotionalState: 'frustrated',
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
}

function baseState(overrides: Partial<AppState>): AppState {
  return {
    currentView: 'session', accounts: [], activeAccountId: '', rules: [],
    trades: [], deskMessages: [], tiltEvents: [],
    emotionalTracker: { feelLevel: 5, walkOutNotes: '', morningNotes: '', updatedAt: '' },
    dailyScoreboard: [], cleanStreak: 999, dayCounter: 1, // cleanStreak deliberately wrong/unused now
    tiltScore: 0, tiltTab: 0, currentTier: 'bronze', customRiskInput: '', selectedSizingTier: 'B',
    ...overrides,
  };
}

console.log('=== 1. Fresh user, today only, no tilt -> streak = 1 ===');
{
  const state = baseState({ dailyScoreboard: [scoreboardRow('2026-09-17')] });
  check('brand new user, clean today', computeCurrentStreak(state, '2026-09-17'), 1);
}

console.log('\n=== 2. Five consecutive clean check-in days (no trades/tilt events at all) ===');
{
  const state = baseState({
    dailyScoreboard: [
      scoreboardRow('2026-09-13'), scoreboardRow('2026-09-14'), scoreboardRow('2026-09-15'),
      scoreboardRow('2026-09-16'), scoreboardRow('2026-09-17'),
    ],
  });
  check('5 consecutive clean check-ins', computeCurrentStreak(state, '2026-09-17'), 5);
}

console.log('\n=== 3. A tilt day in the middle breaks the streak (only days AFTER it count) ===');
{
  const state = baseState({
    dailyScoreboard: [
      scoreboardRow('2026-09-13'), scoreboardRow('2026-09-14'), // these are before the tilt, don't count
      scoreboardRow('2026-09-15'), // tilt day
      scoreboardRow('2026-09-16'), scoreboardRow('2026-09-17'),
    ],
    trades: [tiltedTrade('t1', '2026-09-15')],
  });
  check('streak only counts days after the tilt (16, 17 = 2 days)', computeCurrentStreak(state, '2026-09-17'), 2);
}

console.log('\n=== 4. Today IS a tilt day -> drop one tier from prior streak, not reset to 0 ===');
{
  // Build up 90+ prior clean days (just need enough scoreboard entries before today, none of them tilted)
  const dates: string[] = [];
  for (let i = 90; i >= 1; i--) {
    const d = new Date(Date.UTC(2026, 8, 17));
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const state = baseState({
    dailyScoreboard: [...dates.map((d) => scoreboardRow(d)), scoreboardRow('2026-09-17')],
    trades: [tiltedTrade('t2', '2026-09-17')], // tilts TODAY
  });
  check('was on a 90-day streak, tilts today -> drops to 60 (one tier), not 0', computeCurrentStreak(state, '2026-09-17'), 60);
}

console.log('\n=== 5. Gaps (days with no check-in) are skipped, do not break the streak ===');
{
  const state = baseState({
    // 09-10 and 09-11 missing (weekend off, no check-in) — should not count against or for the streak
    dailyScoreboard: [
      scoreboardRow('2026-09-08'), scoreboardRow('2026-09-09'),
      scoreboardRow('2026-09-12'), scoreboardRow('2026-09-17'),
    ],
  });
  check('gaps just skipped, 4 checked-in clean days total', computeCurrentStreak(state, '2026-09-17'), 4);
}

console.log('\n=== 6. Robustness: correct even when the (now-unused) status field lies ===');
{
  // status:'clean' on every row (simulating the old broken finalization), but
  // there IS a real tilted trade on 09-15 that the stored status never reflected.
  const state = baseState({
    dailyScoreboard: [
      scoreboardRow('2026-09-14'), scoreboardRow('2026-09-15'), scoreboardRow('2026-09-16'), scoreboardRow('2026-09-17'),
    ],
    trades: [tiltedTrade('t3', '2026-09-15')],
  });
  check(
    'ignores the stale status field, correctly finds the real tilt on 09-15 (only 16,17 count = 2)',
    computeCurrentStreak(state, '2026-09-17'),
    2
  );
}

console.log('\n=== 7. Works even if the app was "closed" for days (no timer ever ran) — pure computation ===');
{
  // Same as test 2, but cleanStreak field is garbage (999) and nothing ever "finalized" anything.
  // This is the actual bug scenario: no reliance on any background process at all.
  const state = baseState({
    dailyScoreboard: [scoreboardRow('2026-09-15'), scoreboardRow('2026-09-16'), scoreboardRow('2026-09-17')],
    cleanStreak: 999, // deliberately garbage — must be ignored entirely
  });
  const stats = getNoTiltStats(state);
  check('getNoTiltStats never reads state.cleanStreak, computes fresh', stats.noTiltDays, 3);
}

console.log('\n=== 8. Tier calculation end-to-end matches the computed streak ===');
{
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.UTC(2026, 8, 17));
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  const state = baseState({ dailyScoreboard: dates.map((d) => scoreboardRow(d)) });
  const stats = getNoTiltStats(state);
  check('30 consecutive clean days -> Gold tier', stats.currentTier, 'gold');
  check('noTiltDays = 30', stats.noTiltDays, 30);
}

console.log('\n=== 9. Live tiltScore (Board page "TILT SCORE" widget) — computed, not stale ===');
{
  const calm = baseState({ dailyScoreboard: [scoreboardRow('2026-09-17')] });
  check('no admissions today -> tiltScore 0 (Calm)', getNoTiltStats(calm).tiltScore, 0);

  const frustratedTrade: CompletedTrade = { ...tiltedTrade('t4', '2026-09-17'), emotionalState: 'frustrated' };
  const frustrated = baseState({ dailyScoreboard: [scoreboardRow('2026-09-17')], trades: [frustratedTrade] });
  check('frustrated today -> tiltScore 1 (Tension)', getNoTiltStats(frustrated).tiltScore, 1);

  const chasingTrade: CompletedTrade = { ...tiltedTrade('t5', '2026-09-17'), emotionalState: 'feel_like_chasing' };
  const chasing = baseState({ dailyScoreboard: [scoreboardRow('2026-09-17')], trades: [chasingTrade] });
  check('chased a loser today -> tiltScore 2 (High Tilt Risk)', getNoTiltStats(chasing).tiltScore, 2);

  // Even if state.tiltScore (the old, now-dead field) is stuck at some stale value,
  // the live computed one must reflect reality, not that field.
  const staleFieldButCalmToday = baseState({
    dailyScoreboard: [scoreboardRow('2026-09-17')],
    tiltScore: 2, // stale leftover from the old (now-removed) 5:35pm rollover
  });
  check('stale state.tiltScore=2 ignored, computed live as 0 (Calm today)', getNoTiltStats(staleFieldButCalmToday).tiltScore, 0);
}

console.log('\n=== 10. computeStreakHistory: best-ever record + total tilt days (client-requested) ===');
{
  // 5 clean days, tilt, then 2 more clean days (current, ongoing).
  const state = baseState({
    dailyScoreboard: [
      scoreboardRow('2026-09-10'), scoreboardRow('2026-09-11'), scoreboardRow('2026-09-12'),
      scoreboardRow('2026-09-13'), scoreboardRow('2026-09-14'), // 5-day run, then tilt
      scoreboardRow('2026-09-15'), // tilt day
      scoreboardRow('2026-09-16'), scoreboardRow('2026-09-17'), // current 2-day run
    ],
    trades: [tiltedTrade('t6', '2026-09-15')],
  });
  const h = computeStreakHistory(state, '2026-09-17');
  check('current streak = 2 (days after the tilt)', h.currentStreak, 2);
  check('longest streak ever = 5 (the run before the tilt, still the record)', h.longestStreak, 5);
  check('total tilt days = 1', h.totalTiltDays, 1);
}

console.log('\n=== 11. Record updates once the current streak surpasses the old best ===');
{
  const dates = ['2026-09-11', '2026-09-12', '2026-09-13']; // 3-day old best (before a tilt)
  const state = baseState({
    dailyScoreboard: [
      ...dates.map((d) => scoreboardRow(d)),
      scoreboardRow('2026-09-14'), // tilt day
      scoreboardRow('2026-09-15'), scoreboardRow('2026-09-16'),
      scoreboardRow('2026-09-17'), scoreboardRow('2026-09-18'), scoreboardRow('2026-09-19'),
      scoreboardRow('2026-09-20'), scoreboardRow('2026-09-21'), // 15-21 = 7-day run, beats the old 3-day best
    ],
    trades: [tiltedTrade('t7', '2026-09-14')],
  });
  const h = computeStreakHistory(state, '2026-09-21');
  check('current streak = 7', h.currentStreak, 7);
  check('record updates to match the new best (7, not stuck at old 3)', h.longestStreak, 7);
  check('total tilt days = 1', h.totalTiltDays, 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
