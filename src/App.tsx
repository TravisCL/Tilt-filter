import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { SessionView } from './components/SessionView';
import { TrackerView } from './components/TrackerView';
import { AccountsView } from './components/AccountsView';
import { BoardView } from './components/BoardView';
import { ProfileView } from './components/ProfileView';
import { InvitesView } from './components/InvitesView';
import { AppState, CompletedTrade, TierLevel } from './types';
import { loadAppState, saveAppState, resetToCleanSlate, isMorningCheckInCompleted, deduplicateTrades } from './utils/initialData';
import { checkAndApplyESTDailyRollover, getESTDate } from './utils/dailyRollover';
import {
  broadcastStateChange,
  broadcastTradeLogged,
  requestStateSync,
  subscribeToStateSync,
} from './utils/syncService';

export default function App() {
  const [state, setState] = useState<AppState>(loadAppState);
  const isRemoteUpdateRef = useRef<boolean>(false);
  const hasMountedRef = useRef<boolean>(false);
  const lastTradeSubmitRef = useRef<{ time: number; fingerprint: string }>({ time: 0, fingerprint: '' });

  // 5:35 PM EST Automated Board Update Timer:
  // Automatically evaluates tilt vs no-tilt status at 5:35 PM EST based strictly on whether
  // the trader ever admitted to feeling frustrated or chased after a loser today.
  useEffect(() => {
    // Check immediately on mount/view load
    setState((current) => {
      const { state: updatedState, updated } = checkAndApplyESTDailyRollover(current);
      return updated ? updatedState : current;
    });

    // Check periodically every 15 seconds so rollover hits right at 5:35 PM EST
    const interval = setInterval(() => {
      setState((current) => {
        const { state: updatedState, updated } = checkAndApplyESTDailyRollover(current);
        return updated ? updatedState : current;
      });
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // Ensure responsive layouts recalculate and request freshest state on initial popup mount
  useEffect(() => {
    const triggerReflow = () => {
      window.dispatchEvent(new Event('resize'));
    };
    requestAnimationFrame(triggerReflow);
    const t1 = setTimeout(triggerReflow, 50);
    const t2 = setTimeout(triggerReflow, 200);

    // Request freshest sync state from any active peer window or parent opener
    requestStateSync();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Subscribe to real-time state and trade journal synchronization from popped-out windows, tabs, and parent
  useEffect(() => {
    const unsubscribe = subscribeToStateSync((syncedState, _sourceId, eventDetail) => {
      isRemoteUpdateRef.current = true;
      setState((current) => {
        // Defensive safeguard 1: Prevent empty accounts broadcasts from overwriting active user accounts
        let mergedAccounts = syncedState.accounts;
        if ((!mergedAccounts || mergedAccounts.length === 0) && current.accounts.length > 0) {
          mergedAccounts = current.accounts;
        }

        // Defensive safeguard 2: Complete deduplicated trade journal synchronization
        const candidateTrades: CompletedTrade[] = [
          ...(current.trades || []),
          ...(syncedState.trades || []),
          ...(eventDetail?.trade ? [eventDetail.trade] : []),
          ...(Array.isArray(eventDetail?.trades) ? eventDetail.trades : []),
        ];

        const mergedTrades = deduplicateTrades(candidateTrades);

        // Preserve current window's active view so popped-out windows don't jump away from the journal
        const nextState: AppState = {
          ...syncedState,
          accounts: mergedAccounts,
          trades: mergedTrades,
          activeAccountId: syncedState.activeAccountId || current.activeAccountId,
          currentView: current.currentView,
        };

        return nextState;
      });
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Broadcast state changes and save to local storage (skip initial mount to avoid racing existing windows)
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }
    broadcastStateChange(state);
  }, [state]);

  const handleSelectView = (view: AppState['currentView']) => {
    setState((prev) => ({ ...prev, currentView: view }));
  };

  const handleCleanSlate = () => {
    const fresh = resetToCleanSlate();
    saveAppState(fresh);
    broadcastStateChange(fresh);
    setState(fresh);
  };

  const handleUpdateEmotionalTracker = (emotionalTracker: AppState['emotionalTracker']) => {
    setState((prev) => ({ ...prev, emotionalTracker }));
  };

  const handleSelectTier = (tier: TierLevel) => {
    setState((prev) => ({ ...prev, currentTier: tier }));
  };

  const handleLogTrade = (
    tradeData: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'>
  ) => {
    // Debounce & deduplicate rapid double-submits within 1500ms
    const now = Date.now();
    const fingerprint = `${tradeData.accountId || ''}_${tradeData.pnl}_${tradeData.name || ''}_${tradeData.outcome || ''}_${tradeData.symbol || ''}_${tradeData.emotionalState || ''}`;
    if (now - lastTradeSubmitRef.current.time < 1500 && lastTradeSubmitRef.current.fingerprint === fingerprint) {
      console.warn('[Debounce Guard] Ignored duplicate trade submit burst:', fingerprint);
      return;
    }
    lastTradeSubmitRef.current = { time: now, fingerprint };

    setState((prev) => {
      // Check if identical trade was already recorded in state within the last few seconds
      const isDuplicateInState = (prev.trades || []).some(
        (t) =>
          t.accountId === (tradeData.accountId || prev.activeAccountId) &&
          t.pnl === tradeData.pnl &&
          t.name === tradeData.name &&
          t.emotionalState === tradeData.emotionalState
      );

      if (isDuplicateInState && now - lastTradeSubmitRef.current.time < 3000) {
        console.warn('[Duplicate Guard] Prevented duplicate state injection of trade');
        return prev;
      }

      // Explicitly bind the trade to the specified account or the currently active selected account ID
      const targetAccountId = tradeData.accountId || prev.activeAccountId || (prev.accounts[0]?.id ?? '');
      const targetAccount = prev.accounts.find((a) => a.id === targetAccountId) || prev.accounts[0];
      const boundAccountId = targetAccount?.id || targetAccountId || 'default-account';
      const boundAccountName = targetAccount?.name || tradeData.accountName || 'Primary Account';

      const newTrade: CompletedTrade = {
        ...tradeData,
        id: `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        orderNumber: prev.trades.length + 1,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: tradeData.date || getESTDate().dateStr,
        accountId: boundAccountId,
        accountName: boundAccountName,
      };

      const updatedTrades = deduplicateTrades([...prev.trades, newTrade]);

      // Update exclusively the ledger of the specific target account this trade belongs to
      let updatedAccounts = prev.accounts;
      if (targetAccount && typeof newTrade.pnl === 'number') {
        updatedAccounts = prev.accounts.map((acc) => {
          if (acc.id === targetAccount.id) {
            const currentBal = typeof acc.currentBalance === 'number' ? acc.currentBalance : acc.size;
            const newBal = currentBal + newTrade.pnl;
            const newPeak = Math.max(acc.highWaterMark ?? acc.size ?? 0, newBal);
            return {
              ...acc,
              currentBalance: newBal,
              highWaterMark: newPeak,
            };
          }
          return acc;
        });
      }

      let newTiltScore = prev.tiltScore;
      let newTiltTab = prev.tiltTab;
      const newTiltEvents = [...(prev.tiltEvents || [])];
      let newDeskMessages = prev.deskMessages;

      if (newTrade.emotionalState) {
        const lossAmt = Math.abs(newTrade.pnl || newTrade.riskDollars);
        const tiltRisk =
          newTrade.emotionalState === 'feel_like_chasing'
            ? 'high'
            : newTrade.emotionalState === 'frustrated'
            ? 'moderate'
            : 'low';

        newTiltEvents.unshift({
          id: `tilt-${Date.now()}`,
          tradeId: newTrade.id,
          tradeOrderNumber: newTrade.orderNumber,
          tradeName: newTrade.name,
          timestamp: newTrade.timestamp,
          feeling: newTrade.emotionalState,
          tiltRisk,
          lossAmount: lossAmt,
          notes: newTrade.notes,
        });

        if (newTrade.emotionalState === 'feel_like_chasing') {
          newTiltScore = prev.tiltScore + 2;
          newTiltTab = prev.tiltTab + lossAmt;
          newDeskMessages = [
            ...newDeskMessages,
            {
              id: `msg-tilt-${Date.now()}`,
              sender: 'BUDDY',
              time: newTrade.timestamp,
              text: `🚨 CHASE IMPULSE FLAGGED on Trade #${newTrade.orderNumber} (-$${lossAmt}). Potential tilt routed to Board tab! You stated you feel like chasing. Step away immediately.`,
            },
          ];
        } else if (newTrade.emotionalState === 'frustrated') {
          newTiltScore = prev.tiltScore + 1;
          newTiltTab = prev.tiltTab + lossAmt;
          newDeskMessages = [
            ...newDeskMessages,
            {
              id: `msg-tilt-${Date.now()}`,
              sender: 'BUDDY',
              time: newTrade.timestamp,
              text: `⚠️ FRUSTRATION LOGGED on Trade #${newTrade.orderNumber} (-$${lossAmt}). Data routed to Board tab. Take a 5-minute break to reset your heart rate.`,
            },
          ];
        } else if (newTrade.emotionalState === 'fine') {
          newDeskMessages = [
            ...newDeskMessages,
            {
              id: `msg-tilt-${Date.now()}`,
              sender: 'BUDDY',
              time: newTrade.timestamp,
              text: `🛡️ Clean Loss Accepted on Trade #${newTrade.orderNumber} (-$${lossAmt}). Process followed without emotional tilt. Logged to Board tab.`,
            },
          ];
        }
      }

      const nextState: AppState = {
        ...prev,
        trades: updatedTrades,
        accounts: updatedAccounts,
        tiltScore: newTiltScore,
        tiltTab: newTiltTab,
        tiltEvents: newTiltEvents,
        deskMessages: newDeskMessages,
      };

      // Instantly broadcast the trade payload directly across all windows
      broadcastTradeLogged(newTrade, nextState);

      return nextState;
    });
  };

  const handleDeleteTrade = (tradeId: string) => {
    setState((prev) => {
      const tradeToDelete = (prev.trades || []).find((t) => t.id === tradeId);
      if (!tradeToDelete) return prev;

      const remainingTrades = deduplicateTrades(
        (prev.trades || []).filter((t) => t.id !== tradeId)
      );

      // Revert account balance impact
      const updatedAccounts = (prev.accounts || []).map((acc) => {
        if (acc.id === tradeToDelete.accountId && typeof tradeToDelete.pnl === 'number') {
          const revertedBal = (acc.currentBalance ?? acc.size) - tradeToDelete.pnl;
          return {
            ...acc,
            currentBalance: revertedBal,
          };
        }
        return acc;
      });

      // Filter out tilt events associated with this deleted trade
      const updatedTiltEvents = (prev.tiltEvents || []).filter((ev) => ev.tradeId !== tradeId);

      const nextState: AppState = {
        ...prev,
        trades: remainingTrades,
        accounts: updatedAccounts,
        tiltEvents: updatedTiltEvents,
      };

      broadcastStateChange(nextState);
      return nextState;
    });
  };

  const handleCleanDuplicates = () => {
    setState((prev) => {
      const cleanedTrades = deduplicateTrades(prev.trades || []);
      const nextState: AppState = {
        ...prev,
        trades: cleanedTrades,
      };
      broadcastStateChange(nextState);
      return nextState;
    });
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#060f17] text-slate-100 font-sans antialiased selection:bg-sky-400 selection:text-black">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-3 py-2.5 bg-[#081522] border-b border-[#132c3f]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-white font-black text-xs uppercase">Trader Status</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1e30] border border-[#173752] text-[10px] font-mono font-black text-sky-300">
          <span>{state.cleanStreak || 0} NO TILT DAYS</span>
        </div>
      </div>

      {/* Desktop Left Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          state={state}
          currentView={state.currentView}
          onSelectView={handleSelectView}
          syncVersion="9.68"
          onCleanSlate={handleCleanSlate}
          isCheckInCompletedToday={isMorningCheckInCompleted(state.emotionalTracker)}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#07121b] overflow-x-hidden min-h-screen">
        {(state.currentView === 'session' || state.currentView === 'checkin') && (
          <SessionView
            state={state}
            onUpdateState={setState}
            onLogTrade={handleLogTrade}
            onDeleteTrade={handleDeleteTrade}
            onCleanDuplicates={handleCleanDuplicates}
          />
        )}

        {(state.currentView === 'tracker' || state.currentView === 'tally') && (
          <TrackerView
            state={state}
            onUpdateEmotionalTracker={handleUpdateEmotionalTracker}
            onUpdateState={setState}
            onGoToSession={() => handleSelectView('session')}
            onCleanSlate={handleCleanSlate}
          />
        )}

        {state.currentView === 'accounts' && (
          <AccountsView state={state} onUpdateState={setState} />
        )}

        {state.currentView === 'board' && (
          <BoardView state={state} onSelectTier={handleSelectTier} />
        )}

        {state.currentView === 'profile' && (
          <ProfileView state={state} onCleanSlate={handleCleanSlate} />
        )}

        {state.currentView === 'invites' && <InvitesView />}
      </main>
    </div>
  );
}
