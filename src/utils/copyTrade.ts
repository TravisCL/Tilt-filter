import { CompletedTrade, TradingAccount } from '../types';

/**
 * Pure helpers behind the "Copy Trade to Other Accounts" feature. Kept
 * outside App.tsx/AccountsView.tsx so the core account-targeting, balance,
 * and link-propagation logic is unit-testable (see verify_copy_trade.ts)
 * instead of only reachable through component closures.
 */

/** De-duplicated list of every account a trade should be logged to. */
export function resolveTargetAccountIds(primaryAccountId: string, copyToAccountIds: string[]): string[] {
  return Array.from(new Set([primaryAccountId, ...copyToAccountIds].filter(Boolean)));
}

export interface BuildLinkedTradesOptions {
  baseId: string;
  timestamp: string;
  date: string;
  orderNumberStart: number;
  linkGroupId?: string;
}

/** Builds one CompletedTrade per target account for a brand-new trade, all sharing linkGroupId when copied to more than one account. */
export function buildLinkedTrades(
  tradeData: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'>,
  targetAccountIds: string[],
  accounts: TradingAccount[],
  opts: BuildLinkedTradesOptions
): CompletedTrade[] {
  return targetAccountIds.map((accId, idx) => {
    const acc = accounts.find((a) => a.id === accId);
    return {
      ...tradeData,
      id: idx === 0 ? opts.baseId : `${opts.baseId}-copy${idx}`,
      orderNumber: opts.orderNumberStart + idx,
      timestamp: opts.timestamp,
      date: opts.date,
      accountId: acc?.id || accId || 'default-account',
      accountName: acc?.name || tradeData.accountName || 'Primary Account',
      linkGroupId: opts.linkGroupId,
    };
  });
}

/** Applies each trade's P&L to the account it belongs to (one trade per account, at most). */
export function applyTradeBalanceDeltas(accounts: TradingAccount[], trades: CompletedTrade[]): TradingAccount[] {
  return accounts.map((acc) => {
    const matchingTrade = trades.find((t) => t.accountId === acc.id);
    if (!matchingTrade || typeof matchingTrade.pnl !== 'number') return acc;
    const currentBal = typeof acc.currentBalance === 'number' ? acc.currentBalance : acc.size;
    const newBal = currentBal + matchingTrade.pnl;
    const newPeak = Math.max(acc.highWaterMark ?? acc.size ?? 0, newBal);
    return { ...acc, currentBalance: newBal, highWaterMark: newPeak };
  });
}

/**
 * Builds copies of an already-logged trade for other accounts ("Share to
 * other accounts"). The original trade is untouched here — the caller is
 * responsible for stamping it with the returned linkGroupId if it didn't
 * already have one.
 */
export function buildShareCopies(
  trade: CompletedTrade,
  targetAccountIds: string[],
  accounts: TradingAccount[],
  orderNumberStart: number
): { copies: CompletedTrade[]; linkGroupId: string } {
  const linkGroupId = trade.linkGroupId || `link-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const copies = targetAccountIds
    .filter((id) => id !== trade.accountId)
    .map((accId, idx) => {
      const acc = accounts.find((a) => a.id === accId);
      return {
        ...trade,
        id: `${trade.id}-share${Date.now()}-${idx}`,
        orderNumber: orderNumberStart + idx,
        accountId: acc?.id || accId,
        accountName: acc?.name || '',
        linkGroupId,
      };
    });
  return { copies, linkGroupId };
}

/**
 * Applies updateFn to the trade matching tradeId, and — only when
 * shouldPropagate is true and that trade has a linkGroupId — to every other
 * trade sharing that linkGroupId too. Used for memo/risk edit propagation;
 * never used for delete or move (those intentionally affect one copy only).
 */
export function propagateToLinked<T extends CompletedTrade>(
  trades: T[],
  tradeId: string,
  updateFn: (t: T) => T,
  shouldPropagate: boolean
): T[] {
  const trade = trades.find((t) => t.id === tradeId);
  const linkGroupId = trade?.linkGroupId;
  return trades.map((t) => {
    const matches = t.id === tradeId || (shouldPropagate && !!linkGroupId && t.linkGroupId === linkGroupId);
    return matches ? updateFn(t) : t;
  });
}
