import React, { useState, useEffect, useRef } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { SessionView } from './components/SessionView';
import { TrackerView } from './components/TrackerView';
import { AccountsView } from './components/AccountsView';
import { BoardView } from './components/BoardView';
import { ProfileView } from './components/ProfileView';
import { InvitesView } from './components/InvitesView';
import { AppState, CompletedTrade, TierLevel } from './types';
import { loadAppState, saveAppState, resetToCleanSlate, isMorningCheckInCompleted, deduplicateTrades } from './utils/initialData';
import { getESTDate } from './utils/dailyRollover';
import { getNoTiltStats } from './utils/tierProgression';
import { postTradeToDiscord } from './utils/discordWebhook';
import { resolveTargetAccountIds, buildLinkedTrades, applyTradeBalanceDeltas } from './utils/copyTrade';
import {
  broadcastStateChange,
  broadcastTradeLogged,
  requestStateSync,
  subscribeToStateSync,
} from './utils/syncService';
import {
  pullStateFromSupabase,
  pushStateToSupabase,
  scheduleSupabasePush,
  mergePulledIntoState,
  subscribeToSupabaseRealtime,
  waitForPendingPush,
} from './utils/supabaseSync';
import { isSupabaseConfigured } from './utils/supabaseClient';

export default function App() {
  const [state, setState] = useState<AppState>(loadAppState);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    return saved === 'light' ? 'light' : 'dark';
  });
  const isRemoteUpdateRef = useRef<boolean>(false);
  const hasMountedRef = useRef<boolean>(false);
  const lastTradeSubmitRef = useRef<{ time: number; fingerprint: string }>({ time: 0, fingerprint: '' });
  const supabaseBootstrappedRef = useRef<boolean>(false);

  // Apply the light/dark theme to the document root and persist the choice.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // One-time Supabase bootstrap on app load: adopt cloud data if it exists
  // (so data survives redeploys/code changes), or seed the cloud from
  // whatever's currently in localStorage if this is the very first sync.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    (async () => {
      const pulled = await pullStateFromSupabase();
      if (!pulled) return; // network/config issue — stay on local data

      const localHasData =
        state.accounts.length > 0 || state.trades.length > 0 || (state.dailyScoreboard || []).length > 0;

      if (pulled.isEmpty) {
        if (localHasData) {
          // First time connecting this device/browser to a fresh Supabase project:
          // push what we already have up, rather than wiping it with empty cloud data.
          await pushStateToSupabase(state).catch((e) => console.warn('[Supabase] initial seed failed:', e));
        }
        supabaseBootstrappedRef.current = true;
        return;
      }

      setState((prev) => mergePulledIntoState(pulled, prev));
      supabaseBootstrappedRef.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live cross-device sync: whenever ANY device changes data in Supabase,
  // pull the fresh state and adopt it here within ~1s — no refresh needed.
  // isRemoteUpdateRef prevents this from immediately re-pushing what we just pulled.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleRemoteChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (!supabaseBootstrappedRef.current) return; // don't race the initial bootstrap
        // Let any of our own pending/in-flight writes land first, so this pull
        // can never be staler than what we just saved locally (see waitForPendingPush).
        await waitForPendingPush();
        const pulled = await pullStateFromSupabase();
        if (!pulled || pulled.isEmpty) return;
        isRemoteUpdateRef.current = true;
        setState((prev) => mergePulledIntoState(pulled, prev));
      }, 500);
    };

    const unsubscribe = subscribeToSupabaseRealtime(handleRemoteChange);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
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
    scheduleSupabasePush(state);
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
    tradeData: Omit<CompletedTrade, 'id' | 'orderNumber' | 'timestamp'>,
    copyToAccountIds: string[] = []
  ) => {
    // Debounce & deduplicate rapid double-submits within 1500ms
    const now = Date.now();
    const fingerprint = `${tradeData.accountId || ''}_${tradeData.pnl}_${tradeData.name || ''}_${tradeData.outcome || ''}_${tradeData.symbol || ''}_${tradeData.emotionalState || ''}`;
    if (now - lastTradeSubmitRef.current.time < 1500 && lastTradeSubmitRef.current.fingerprint === fingerprint) {
      console.warn('[Debounce Guard] Ignored duplicate trade submit burst:', fingerprint);
      return;
    }
    lastTradeSubmitRef.current = { time: now, fingerprint };

    // Precomputed once, outside the state updater (not inside setState — an
    // updater can be re-invoked by React, and a network side effect like a
    // Discord post must fire exactly once, not on every re-invocation).
    const tradeId = `tr-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const tradeTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const tradeDate = tradeData.date || getESTDate().dateStr;
    // Only a real "link" if this trade is being logged to more than one account.
    const linkGroupId =
      copyToAccountIds.length > 0
        ? `link-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        : undefined;

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

      const primaryAccountId = tradeData.accountId || prev.activeAccountId || (prev.accounts[0]?.id ?? '');
      const targetAccountIds = resolveTargetAccountIds(primaryAccountId, copyToAccountIds);

      const newTrades: CompletedTrade[] = buildLinkedTrades(tradeData, targetAccountIds, prev.accounts, {
        baseId: tradeId,
        timestamp: tradeTimestamp,
        date: tradeDate,
        orderNumberStart: prev.trades.length + 1,
        linkGroupId,
      });
      const newTrade = newTrades[0]; // the "primary" trade — used for tilt tracking, desk messages, broadcast

      const updatedTrades = deduplicateTrades([...prev.trades, ...newTrades]);

      // Update the ledger of every target account this trade (or its copies) was logged to
      const updatedAccounts = applyTradeBalanceDeltas(prev.accounts, newTrades);

      let newTiltScore = prev.tiltScore;
      let newTiltTab = prev.tiltTab;
      const newTiltEvents = [...(prev.tiltEvents || [])];
      let newDeskMessages = prev.deskMessages;

      // Tilt tracking fires ONCE per trade taken, not once per copy — the trader
      // felt the emotion a single time, regardless of how many accounts it was logged to.
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

    // Save happens above regardless of what follows — Discord posting is a
    // best-effort side effect and must never block or fail the trade save.
    if (state.discordWebhookEnabled && state.discordWebhookUrl) {
      const primaryAccountId = tradeData.accountId || state.activeAccountId || (state.accounts[0]?.id ?? '');
      const targetAccountIds = Array.from(new Set([primaryAccountId, ...copyToAccountIds].filter(Boolean)));
      const accountNames = targetAccountIds
        .map((id) => state.accounts.find((a) => a.id === id)?.name)
        .filter((n): n is string => Boolean(n));
      const primaryAccount = state.accounts.find((a) => a.id === primaryAccountId) || state.accounts[0];

      const postedTrade: CompletedTrade = {
        ...tradeData,
        id: tradeId,
        orderNumber: state.trades.length + 1,
        timestamp: tradeTimestamp,
        date: tradeDate,
        accountId: primaryAccount?.id || primaryAccountId || 'default-account',
        accountName: primaryAccount?.name || tradeData.accountName || 'Primary Account',
      };
      postTradeToDiscord(state.discordWebhookUrl, postedTrade, accountNames.length > 1 ? accountNames : undefined).catch(() => {
        // postTradeToDiscord already swallows its own errors; this catch is
        // just a safety net so a rejection can never surface here.
      });
    }
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

  const handleMoveTrade = (tradeId: string, newAccountId: string) => {
    setState((prev) => {
      const trade = (prev.trades || []).find((t) => t.id === tradeId);
      if (!trade) return prev;

      const oldAccountId = trade.accountId;
      if (oldAccountId === newAccountId) return prev;

      const newAccount = (prev.accounts || []).find((a) => a.id === newAccountId);
      if (!newAccount) return prev;

      const pnl = typeof trade.pnl === 'number' ? trade.pnl : 0;

      // Move the PnL's balance impact from the old account to the new one
      const updatedAccounts = (prev.accounts || []).map((acc) => {
        if (acc.id === oldAccountId) {
          return { ...acc, currentBalance: (acc.currentBalance ?? acc.size) - pnl };
        }
        if (acc.id === newAccountId) {
          return { ...acc, currentBalance: (acc.currentBalance ?? acc.size) + pnl };
        }
        return acc;
      });

      const updatedTrades = (prev.trades || []).map((t) =>
        t.id === tradeId ? { ...t, accountId: newAccountId, accountName: newAccount.name } : t
      );

      const nextState: AppState = {
        ...prev,
        trades: updatedTrades,
        accounts: updatedAccounts,
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

  const noTiltStats = getNoTiltStats(state);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--c-060f17)] text-slate-100 font-sans antialiased selection:bg-sky-400 selection:text-black">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-3 py-2.5 bg-[var(--c-081522)] border-b border-[var(--c-132c3f)]">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-label="Open navigation menu"
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--c-0c1e30)] border border-[var(--c-173752)] text-slate-200"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span className="text-white font-black text-xs uppercase">Trader Status</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--c-0c1e30)] border border-[var(--c-173752)] text-[10px] font-mono font-black text-sky-300">
          <span>{noTiltStats.noTiltDays} NO TILT DAYS</span>
        </div>
      </div>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full overflow-y-auto">
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="absolute top-3 right-[-44px] flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--c-0c1e30)] border border-[var(--c-173752)] text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              state={state}
              currentView={state.currentView}
              onSelectView={(view) => {
                handleSelectView(view);
                setMobileNavOpen(false);
              }}
              syncVersion="9.68"
              onCleanSlate={() => {
                handleCleanSlate();
                setMobileNavOpen(false);
              }}
              isCheckInCompletedToday={isMorningCheckInCompleted(state.emotionalTracker)}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          state={state}
          currentView={state.currentView}
          onSelectView={handleSelectView}
          syncVersion="9.68"
          onCleanSlate={handleCleanSlate}
          isCheckInCompletedToday={isMorningCheckInCompleted(state.emotionalTracker)}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--c-07121b)] overflow-x-hidden min-h-screen">
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
          <AccountsView
            state={state}
            onUpdateState={setState}
            onDeleteTrade={handleDeleteTrade}
            onMoveTrade={handleMoveTrade}
          />
        )}

        {state.currentView === 'board' && (
          <BoardView state={state} onSelectTier={handleSelectTier} />
        )}

        {state.currentView === 'profile' && (
          <ProfileView state={state} onUpdateState={setState} onCleanSlate={handleCleanSlate} />
        )}

        {state.currentView === 'invites' && <InvitesView />}
      </main>
    </div>
  );
}
