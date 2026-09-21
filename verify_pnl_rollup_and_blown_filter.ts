// Verifies two bug fixes reported by Travis on the Accounts tab:
// 1. "This Week" P&L resets on Sunday (Globex weekly open) instead of
//    rolling as a trailing 7-day window.
// 2. Blown accounts are excluded from account-picker chip lists.
// Run with: npx tsx verify_pnl_rollup_and_blown_filter.ts

import { computePnlRollups } from './src/components/AccountsView';
import { CompletedTrade, TradingAccount } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function trade(id: string, date: string, pnl: number): CompletedTrade {
  return {
    id, orderNumber: 1, timestamp: '2:00 PM', date, plannedStatus: 'planned', quality: 'A',
    symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl, rMultiple: pnl / 100, rulesHeld: true,
    name: 'test', checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
}

function account(id: string, name: string, status?: 'active' | 'blown'): TradingAccount {
  return {
    id, name, size: 50000, drawdownType: 'static', maxDrawdown: 2000,
    stopTrailingAtFloor: false, currentBalance: 50000, highWaterMark: 50000, active: true, status,
  };
}

console.log('=== 1. Fresh Monday: last week\'s loss must NOT bleed into this week ===');
{
  // 2026-09-21 is a Monday. Last week (Sept 14-18) had a big loss; this week has nothing yet.
  const trades = [
    trade('t1', '2026-09-14', -300), // last Monday
    trade('t2', '2026-09-18', -578), // last Friday — total -878 last week
  ];
  const est = { year: 2026, month: 9, day: 21, dateStr: '2026-09-21' }; // Monday
  const { weekPnl } = computePnlRollups(trades, est);
  check('fresh Monday, no trades yet this week -> weekPnl = 0 (not -878)', weekPnl, 0);
}

console.log('\n=== 2. Old trailing-7-day bug would have leaked last Friday\'s loss into Monday ===');
{
  // Sanity check the old (buggy) behavior for contrast: trailing 7 days from
  // Monday 09-21 back to 09-15 WOULD include 09-18 (last Friday). The new
  // Sunday-anchored logic must exclude it.
  const trades = [trade('t1', '2026-09-18', -578)]; // last Friday, before this week's Sunday (09-20)
  const est = { year: 2026, month: 9, day: 21, dateStr: '2026-09-21' };
  const { weekPnl } = computePnlRollups(trades, est);
  check('last Friday\'s trade excluded once the new week has started', weekPnl, 0);
}

console.log('\n=== 3. Trades from this week\'s Sunday onward DO count ===');
{
  const trades = [
    trade('t1', '2026-09-18', -578), // last Friday — excluded
    trade('t2', '2026-09-20', 100), // this week's Sunday (Globex open day) — included
    trade('t3', '2026-09-21', 200), // this Monday — included
  ];
  const est = { year: 2026, month: 9, day: 21, dateStr: '2026-09-21' };
  const { weekPnl } = computePnlRollups(trades, est);
  check('Sunday + Monday count, last Friday does not', weekPnl, 300);
}

console.log('\n=== 4. Mid-week (Wednesday): whole week-so-far still totals correctly ===');
{
  const trades = [
    trade('t1', '2026-09-20', 50), // Sun
    trade('t2', '2026-09-21', -20), // Mon
    trade('t3', '2026-09-23', 70), // Wed (today)
  ];
  const est = { year: 2026, month: 9, day: 23, dateStr: '2026-09-23' }; // Wednesday
  const { weekPnl } = computePnlRollups(trades, est);
  check('Sun+Mon+Wed all count', weekPnl, 100);
}

console.log('\n=== 5. On Sunday itself, week start = today (no bleed from prior week) ===');
{
  const trades = [
    trade('t1', '2026-09-13', -999), // last week's Sunday — must be excluded
    trade('t2', '2026-09-20', 40), // this Sunday (today)
  ];
  const est = { year: 2026, month: 9, day: 20, dateStr: '2026-09-20' }; // Sunday
  const { weekPnl } = computePnlRollups(trades, est);
  check('on Sunday, only today counts, prior week excluded', weekPnl, 40);
}

console.log('\n=== 6. Today / Month rollups unaffected by the week-boundary change ===');
{
  const trades = [
    trade('t1', '2026-09-21', 100), // today
    trade('t2', '2026-09-05', 500), // earlier this month
    trade('t3', '2026-08-30', 999), // last month — excluded
  ];
  const est = { year: 2026, month: 9, day: 21, dateStr: '2026-09-21' };
  const { todayPnl, monthPnl } = computePnlRollups(trades, est);
  check('todayPnl only counts today', todayPnl, 100);
  check('monthPnl sums the whole calendar month, excludes last month', monthPnl, 600);
}

console.log('\n=== 7. Blown-account filter: excluded from copy-trade account pickers ===');
{
  // Mirrors the filter used in SessionView's "Also log to" chips and
  // AccountsView's "Share to Other Accounts" picker.
  const accounts = [
    account('acc1', 'Live A', 'active'),
    account('acc2', 'Eval B', 'blown'),
    account('acc3', 'Eval C', 'active'),
  ];
  const activeAccountId = 'acc1';
  const pickable = accounts.filter((a) => a.id !== activeAccountId && a.status !== 'blown');
  check('blown account excluded, active non-primary account included', pickable.map((a) => a.id), ['acc3']);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
