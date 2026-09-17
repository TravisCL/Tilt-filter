// Verifies the fix for cross-contaminated trades between same-named accounts
// (the exact bug the client hit: two accounts both named "50K TPT" were each
// showing all 3 of the other's trades because matching fell back to name).
// Run with: npx tsx verify_account_trade_match.ts

import { getAccountTrades } from './src/components/AccountsView';
import { TradingAccount, CompletedTrade } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function makeAccount(id: string, name: string): TradingAccount {
  return {
    id, name, size: 50000, drawdownType: 'eod', maxDrawdown: 2000,
    stopTrailingAtFloor: true, currentBalance: 50000, highWaterMark: 50000, active: true,
  };
}

function makeTrade(id: string, accountId: string, accountName: string): CompletedTrade {
  return {
    id, orderNumber: 1, timestamp: '9:00 AM', plannedStatus: 'planned', quality: 'A',
    symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: 50, rMultiple: 0.5, rulesHeld: true,
    name: 'test', accountId, accountName,
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
}

console.log('=== Client scenario: two accounts, both named "50K TPT" ===');
{
  const activeAccount = makeAccount('acc-active', '50K TPT');
  const blownAccount = makeAccount('acc-blown', '50K TPT');

  const activeTrades = [
    makeTrade('t1', 'acc-active', '50K TPT'),
    makeTrade('t2', 'acc-active', '50K TPT'),
    makeTrade('t3', 'acc-active', '50K TPT'),
  ];
  const blownTrades = [
    makeTrade('t4', 'acc-blown', '50K TPT'),
    makeTrade('t5', 'acc-blown', '50K TPT'),
    makeTrade('t6', 'acc-blown', '50K TPT'),
  ];
  const allTrades = [...activeTrades, ...blownTrades];

  const resultForActive = getAccountTrades(activeAccount, allTrades, 'acc-active', 2);
  const resultForBlown = getAccountTrades(blownAccount, allTrades, 'acc-active', 2);

  check('active account sees only its own 3 trades (not the blown one\'s)', resultForActive.map((t) => t.id).sort(), ['t1', 't2', 't3']);
  check('blown account sees only its own 3 trades (not the active one\'s)', resultForBlown.map((t) => t.id).sort(), ['t4', 't5', 't6']);
  check('no trade double-counted across both', resultForActive.length + resultForBlown.length, 6);
}

console.log('\n=== Legacy trade with no accountId still falls back to name match ===');
{
  const onlyAccount = makeAccount('acc-1', 'Legacy Account');
  const legacyTrade: CompletedTrade = {
    id: 'legacy1', orderNumber: 1, timestamp: '9:00 AM', plannedStatus: 'planned', quality: 'A',
    symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: 50, rMultiple: 0.5, rulesHeld: true,
    name: 'old trade', accountName: 'Legacy Account', // no accountId at all
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
  const result = getAccountTrades(onlyAccount, [legacyTrade], 'acc-1', 1);
  check('legacy trade (no accountId) still matches by name as before', result.map((t) => t.id), ['legacy1']);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
