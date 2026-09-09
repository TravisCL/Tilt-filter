import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { SessionView } from './components/SessionView';
import { TrackerView } from './components/TrackerView';
import { AccountsView } from './components/AccountsView';
import { BoardView } from './components/BoardView';
import { ProfileView } from './components/ProfileView';
import { InvitesView } from './components/InvitesView';
import { AppState, CompletedTrade, TierLevel } from './types';
import { loadAppState, saveAppState, resetToCleanSlate } from './utils/initialData';

export default function App() {
  const [state, setState] = useState<AppState>(loadAppState);

  // Sync state to local storage
  useEffect(() => {
    saveAppState(state);
  }, [state]);

  const handleSelectView = (view: AppState['currentView']) => {
    setState((prev) => ({ ...prev, currentView: view }));
  };

  const handleCleanSlate = () => {
    const fresh = resetToCleanSlate();
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
    setState((prev) => {
      const activeAccount = prev.accounts.find((a) => a.id === prev.activeAccountId) || prev.accounts[0];
      const newTrade: CompletedTrade = {
        ...tradeData,
        id: `tr-${Date.now()}`,
        orderNumber: prev.trades.length + 1,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        accountId: tradeData.accountId || activeAccount?.id,
        accountName: tradeData.accountName || activeAccount?.name,
      };

      const updatedTrades = [...prev.trades, newTrade];

      let updatedAccounts = prev.accounts;
      if (activeAccount && typeof newTrade.pnl === 'number') {
        updatedAccounts = prev.accounts.map((acc) => {
          if (acc.id === activeAccount.id) {
            const newBal = acc.currentBalance + newTrade.pnl;
            const newPeak = Math.max(acc.highWaterMark ?? 0, newBal);
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

      return {
        ...prev,
        trades: updatedTrades,
        accounts: updatedAccounts,
        tiltScore: newTiltScore,
        tiltTab: newTiltTab,
        tiltEvents: newTiltEvents,
        deskMessages: newDeskMessages,
      };
    });
  };

  const handleCallItADay = () => {
    setState((prev) => ({
      ...prev,
      cleanStreak: prev.cleanStreak + 1,
      deskMessages: [
        ...prev.deskMessages,
        {
          id: `m-day-call-${Date.now()}`,
          sender: 'BUDDY',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '🏁 Session concluded cleanly. All rules respected. Rest and reset for tomorrow.',
        },
      ],
    }));
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#060e11] text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-black">
      {/* Desktop Left Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar
          currentView={state.currentView}
          onSelectView={handleSelectView}
          syncVersion="9.68"
          onCleanSlate={handleCleanSlate}
        />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#071115] overflow-x-hidden min-h-screen">
        {(state.currentView === 'session' || state.currentView === 'checkin') && (
          <SessionView
            state={state}
            onUpdateState={setState}
            onCallItADay={handleCallItADay}
            onLogTrade={handleLogTrade}
          />
        )}

        {(state.currentView === 'tracker' || state.currentView === 'tally') && (
          <TrackerView
            state={state}
            onUpdateEmotionalTracker={handleUpdateEmotionalTracker}
            onUpdateState={setState}
            onGoToSession={() => handleSelectView('session')}
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
