// Verifies CSV export: date-range filtering and CSV building (columns, escaping).
// Run with: npx tsx verify_csv_export.ts

import { buildTradesCSV, filterTradesByDateRange } from './src/components/AccountsView';
import { CompletedTrade } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function makeTrade(overrides: Partial<CompletedTrade>): CompletedTrade {
  return {
    id: 't1', orderNumber: 1, timestamp: '9:00 AM', date: '2026-09-15', plannedStatus: 'planned',
    quality: 'A', symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: 50, rMultiple: 0.5,
    rulesHeld: true, name: 'test', accountName: 'Test Acct',
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
    ...overrides,
  };
}

console.log('=== Date range filtering ===');
{
  const trades = [
    makeTrade({ id: 't1', date: '2026-09-10' }),
    makeTrade({ id: 't2', date: '2026-09-15' }),
    makeTrade({ id: 't3', date: '2026-09-20' }),
  ];
  check('both bounds set — inclusive range', filterTradesByDateRange(trades, '2026-09-10', '2026-09-15').map((t) => t.id), ['t1', 't2']);
  check('no bounds — everything', filterTradesByDateRange(trades, '', '').map((t) => t.id), ['t1', 't2', 't3']);
  check('only from — open-ended after', filterTradesByDateRange(trades, '2026-09-15', '').map((t) => t.id), ['t2', 't3']);
  check('only to — open-ended before', filterTradesByDateRange(trades, '', '2026-09-15').map((t) => t.id), ['t1', 't2']);
}

console.log('\n=== CSV building ===');
{
  const csv = buildTradesCSV([
    makeTrade({ id: 't1', date: '2026-09-15', timestamp: '9:00 AM', accountName: 'Acct A', symbol: 'MNQ', outcome: 'winner', notes: 'clean setup' }),
  ]);
  const lines = csv.split('\n');
  check('header row', lines[0], 'Date,Time,Account,Ticker,Direction,Entry,Exit,Result,Notes');
  check('data row — no direction/entry/exit captured on this trade -> blank', lines[1], '2026-09-15,9:00 AM,Acct A,MNQ,,,,Winner,clean setup');
}

console.log('\n=== CSV building — direction/entry/exit populated when captured ===');
{
  const csv = buildTradesCSV([
    makeTrade({
      id: 't1', date: '2026-09-15', timestamp: '9:00 AM', accountName: 'Acct A', symbol: 'MNQ',
      outcome: 'winner', notes: 'clean setup', direction: 'LONG', entryPrice: 19850.25, exitPrice: 19900.5,
    }),
  ]);
  const lines = csv.split('\n');
  check('data row — real direction/entry/exit values', lines[1], '2026-09-15,9:00 AM,Acct A,MNQ,LONG,19850.25,19900.5,Winner,clean setup');
}

console.log('\n=== CSV escaping (commas and quotes in notes) ===');
{
  const csv = buildTradesCSV([
    makeTrade({ id: 't1', notes: 'said "great setup", took it anyway' }),
  ]);
  const lines = csv.split('\n');
  check('comma/quote in notes gets properly quoted+escaped', lines[1].endsWith('"said ""great setup"", took it anyway"'), true);
}

console.log('\n=== Result derived from pnl when outcome missing ===');
{
  const csv = buildTradesCSV([
    makeTrade({ id: 't1', outcome: undefined, pnl: 25 }),
    makeTrade({ id: 't2', outcome: undefined, pnl: -25 }),
    makeTrade({ id: 't3', outcome: undefined, pnl: 0 }),
  ]);
  const lines = csv.split('\n').slice(1);
  check('positive pnl -> Winner', lines[0].includes(',Winner,'), true);
  check('negative pnl -> Loser', lines[1].includes(',Loser,'), true);
  check('zero pnl -> Breakeven', lines[2].includes(',Breakeven,'), true);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
