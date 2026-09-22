// Verifies moving an account between the Live and Eval categories.
// Run with: npx tsx verify_account_category_move.ts

import { moveAccountCategory } from './src/components/AccountsView';
import { TradingAccount } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function account(id: string, name: string, accountType: 'live' | 'eval'): TradingAccount {
  return {
    id, name, size: 50000, drawdownType: 'static', maxDrawdown: 2000,
    stopTrailingAtFloor: false, currentBalance: 50000, highWaterMark: 50000, active: true,
    accountType, status: 'active',
  };
}

console.log('=== 1. Move a Live account to Eval ===');
{
  const accounts = [account('acc1', 'A', 'live'), account('acc2', 'B', 'eval')];
  const updated = moveAccountCategory(accounts, 'acc1', 'eval');
  check('acc1 moved to eval', updated.find((a) => a.id === 'acc1')?.accountType, 'eval');
  check('acc2 untouched', updated.find((a) => a.id === 'acc2')?.accountType, 'eval');
}

console.log('\n=== 2. Move an Eval account to Live ===');
{
  const accounts = [account('acc1', 'A', 'live'), account('acc2', 'B', 'eval')];
  const updated = moveAccountCategory(accounts, 'acc2', 'live');
  check('acc2 moved to live', updated.find((a) => a.id === 'acc2')?.accountType, 'live');
  check('acc1 untouched', updated.find((a) => a.id === 'acc1')?.accountType, 'live');
}

console.log('\n=== 3. Every other field on the account stays intact ===');
{
  const accounts = [account('acc1', 'A', 'live')];
  const updated = moveAccountCategory(accounts, 'acc1', 'eval');
  const moved = updated.find((a) => a.id === 'acc1')!;
  check('name unchanged', moved.name, 'A');
  check('balance unchanged', moved.currentBalance, 50000);
  check('status unchanged', moved.status, 'active');
}

console.log('\n=== 4. Moving a non-existent id is a no-op ===');
{
  const accounts = [account('acc1', 'A', 'live')];
  const updated = moveAccountCategory(accounts, 'does-not-exist', 'eval');
  check('unchanged when id not found', updated, accounts);
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
