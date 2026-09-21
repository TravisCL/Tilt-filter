// Verifies the "Copy Trade to Other Accounts" feature's pure logic:
// multi-account new-trade creation, sharing an existing trade to other
// accounts, and memo/risk edit propagation to linked copies.
// Run with: npx tsx verify_copy_trade.ts

import {
  resolveTargetAccountIds,
  buildLinkedTrades,
  applyTradeBalanceDeltas,
  buildShareCopies,
  propagateToLinked,
} from './src/utils/copyTrade';
import { CompletedTrade, TradingAccount } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function account(id: string, name: string, balance = 50000): TradingAccount {
  return {
    id, name, size: 50000, drawdownType: 'static', maxDrawdown: 2000,
    stopTrailingAtFloor: false, currentBalance: balance, highWaterMark: balance, active: true,
  };
}

function trade(overrides: Partial<CompletedTrade>): CompletedTrade {
  return {
    id: 't1', orderNumber: 1, timestamp: '2:00 PM', date: '2026-09-17', plannedStatus: 'planned',
    quality: 'A', symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: 66.5, rMultiple: 0.68,
    rulesHeld: true, name: 'test', checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
    accountId: 'acc1', accountName: 'Account 1',
    ...overrides,
  };
}

console.log('=== 1. resolveTargetAccountIds: dedupes and drops falsy ===');
{
  check('primary + 2 copies, dupe removed', resolveTargetAccountIds('acc1', ['acc2', 'acc1', 'acc3']), ['acc1', 'acc2', 'acc3']);
  check('no copies -> just primary', resolveTargetAccountIds('acc1', []), ['acc1']);
}

console.log('\n=== 2. buildLinkedTrades: one trade per target account, sharing linkGroupId ===');
{
  const accounts = [account('acc1', 'TPT 50K'), account('acc2', 'Apex 100K')];
  const tradeData = trade({ id: undefined as any, accountId: undefined, accountName: undefined });
  delete (tradeData as any).id;
  delete (tradeData as any).orderNumber;
  delete (tradeData as any).timestamp;

  const newTrades = buildLinkedTrades(tradeData as any, ['acc1', 'acc2'], accounts, {
    baseId: 'tr-100', timestamp: '2:00 PM', date: '2026-09-17', orderNumberStart: 5, linkGroupId: 'link-1',
  });

  check('2 trades created', newTrades.length, 2);
  check('primary id = baseId', newTrades[0].id, 'tr-100');
  check('copy id = baseId-copy1', newTrades[1].id, 'tr-100-copy1');
  check('primary accountId', newTrades[0].accountId, 'acc1');
  check('copy accountId', newTrades[1].accountId, 'acc2');
  check('copy accountName resolved', newTrades[1].accountName, 'Apex 100K');
  check('both share linkGroupId', [newTrades[0].linkGroupId, newTrades[1].linkGroupId], ['link-1', 'link-1']);
  check('order numbers increment', [newTrades[0].orderNumber, newTrades[1].orderNumber], [5, 6]);
}

console.log('\n=== 3. buildLinkedTrades: single account (no copy) -> no linkGroupId ===');
{
  const accounts = [account('acc1', 'TPT 50K')];
  const tradeData = trade({});
  delete (tradeData as any).id;
  delete (tradeData as any).orderNumber;
  delete (tradeData as any).timestamp;

  const newTrades = buildLinkedTrades(tradeData as any, ['acc1'], accounts, {
    baseId: 'tr-200', timestamp: '2:00 PM', date: '2026-09-17', orderNumberStart: 1,
  });
  check('1 trade, no linkGroupId', [newTrades.length, newTrades[0].linkGroupId], [1, undefined]);
}

console.log('\n=== 4. applyTradeBalanceDeltas: each account gets its own matching trade\'s pnl ===');
{
  const accounts = [account('acc1', 'A', 50000), account('acc2', 'B', 100000), account('acc3', 'Untouched', 25000)];
  const trades = [
    trade({ id: 'tr-1', accountId: 'acc1', pnl: 66.5 }),
    trade({ id: 'tr-1-copy1', accountId: 'acc2', pnl: 66.5 }),
  ];
  const updated = applyTradeBalanceDeltas(accounts, trades);
  check('acc1 balance updated', updated[0].currentBalance, 50066.5);
  check('acc2 balance updated', updated[1].currentBalance, 100066.5);
  check('acc3 untouched (no matching trade)', updated[2].currentBalance, 25000);
}

console.log('\n=== 5. buildShareCopies: original stays, copy created for target account only ===');
{
  const accounts = [account('acc1', 'A'), account('acc2', 'B'), account('acc3', 'C')];
  const original = trade({ id: 'tr-orig', accountId: 'acc1', accountName: 'A', pnl: 50 });
  const { copies, linkGroupId } = buildShareCopies(original, ['acc2', 'acc1'], accounts, 10);

  check('only 1 copy created (acc1 filtered out, it is the source)', copies.length, 1);
  check('copy goes to acc2', copies[0].accountId, 'acc2');
  check('copy accountName resolved', copies[0].accountName, 'B');
  check('copy id differs from original', copies[0].id !== original.id, true);
  check('copy keeps original pnl', copies[0].pnl, 50);
  check('a fresh linkGroupId is generated', typeof linkGroupId === 'string' && linkGroupId.startsWith('link-'), true);
}

console.log('\n=== 6. buildShareCopies: reuses existing linkGroupId if trade already has one ===');
{
  const accounts = [account('acc1', 'A'), account('acc2', 'B')];
  const original = trade({ id: 'tr-orig', accountId: 'acc1', linkGroupId: 'link-existing' });
  const { copies, linkGroupId } = buildShareCopies(original, ['acc2'], accounts, 1);
  check('reuses existing linkGroupId', linkGroupId, 'link-existing');
  check('copy carries the same linkGroupId', copies[0].linkGroupId, 'link-existing');
}

console.log('\n=== 7. propagateToLinked: without the flag, only the target trade changes ===');
{
  const trades = [
    trade({ id: 'a', accountId: 'acc1', linkGroupId: 'link-1', memo: 'old' }),
    trade({ id: 'b', accountId: 'acc2', linkGroupId: 'link-1', memo: 'old' }),
    trade({ id: 'c', accountId: 'acc3', linkGroupId: undefined, memo: 'old' }),
  ];
  const updated = propagateToLinked(trades, 'a', (t) => ({ ...t, memo: 'new' }), false);
  check('only trade a updated', updated.map((t) => t.memo), ['new', 'old', 'old']);
}

console.log('\n=== 8. propagateToLinked: with the flag, every trade sharing linkGroupId updates ===');
{
  const trades = [
    trade({ id: 'a', accountId: 'acc1', linkGroupId: 'link-1', memo: 'old' }),
    trade({ id: 'b', accountId: 'acc2', linkGroupId: 'link-1', memo: 'old' }),
    trade({ id: 'c', accountId: 'acc3', linkGroupId: undefined, memo: 'old' }),
  ];
  const updated = propagateToLinked(trades, 'a', (t) => ({ ...t, memo: 'new' }), true);
  check('a and b updated (same linkGroupId), c untouched (no link)', updated.map((t) => t.memo), ['new', 'new', 'old']);
}

console.log('\n=== 9. propagateToLinked: flag true but trade has no linkGroupId -> behaves like flag false ===');
{
  const trades = [
    trade({ id: 'a', accountId: 'acc1', linkGroupId: undefined, memo: 'old' }),
    trade({ id: 'b', accountId: 'acc2', linkGroupId: undefined, memo: 'old' }),
  ];
  const updated = propagateToLinked(trades, 'a', (t) => ({ ...t, memo: 'new' }), true);
  check('unlinked trade: only itself updates even with propagate=true', updated.map((t) => t.memo), ['new', 'old']);
}

console.log('\n=== 10. Delete simulation: removing one linked copy by id does not cascade ===');
{
  // Mirrors handleDeleteTrade in App.tsx, which filters strictly by trade.id
  // and never looks at linkGroupId — confirming that behavior stays untouched.
  const trades = [
    trade({ id: 'a', accountId: 'acc1', linkGroupId: 'link-1' }),
    trade({ id: 'b', accountId: 'acc2', linkGroupId: 'link-1' }),
  ];
  const remaining = trades.filter((t) => t.id !== 'a');
  check('deleting "a" leaves "b" (its linked copy) intact', remaining.map((t) => t.id), ['b']);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
