import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { AppState, CompletedTrade, DailyScoreRecord } from '../types';
import { getESTDate } from '../utils/dailyRollover';

interface TradeManagementTallyProps {
  state: AppState;
}

export const TradeManagementTally: React.FC<TradeManagementTallyProps> = ({ state }) => {
  const estToday = getESTDate();
  const currentMonthKey = `${estToday.year}-${String(estToday.month).padStart(2, '0')}`;

  // Find all unique months present across trades and daily scoreboard
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);

    (state.dailyScoreboard || []).forEach((record: DailyScoreRecord) => {
      if (record.date) {
        const monthKey = record.date.slice(0, 7);
        if (monthKey.length === 7) {
          monthSet.add(monthKey);
        }
      }
    });

    (state.trades || []).forEach((trade: CompletedTrade) => {
      if (trade.date) {
        const monthKey = trade.date.slice(0, 7);
        if (monthKey.length === 7) {
          monthSet.add(monthKey);
        }
      }
    });

    // Sort descending (latest month first)
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [state.dailyScoreboard, state.trades, currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [viewMode, setViewMode] = useState<'monthly' | 'breakdown'>('monthly');

  // Reset selectedMonth if it is no longer available in the updated state (e.g., on Clean Slate Reset)
  useEffect(() => {
    if (!availableMonths.includes(selectedMonth)) {
      setSelectedMonth(currentMonthKey);
    }
  }, [availableMonths, selectedMonth, currentMonthKey]);

  // Helper to format Month Key "YYYY-MM" to readable string e.g. "September 2026"
  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Helper to format short month "Sep 2026"
  const formatShortMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    if (!year || !month) return monthKey;
    const dateObj = new Date(year, month - 1, 1);
    return dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  // Calculate monthly stats for a specific month
  const getMonthlyStats = (monthKey: string) => {
    const isCurrentMonth = monthKey === currentMonthKey;
    const todayStr = estToday.dateStr;

    // Filter historical scoreboard records for this month
    const monthScoreboard = (state.dailyScoreboard || []).filter((r) =>
      r.date.startsWith(monthKey)
    );

    // Filter session trades for this month
    const monthTrades = (state.trades || []).filter((t) => {
      if (t.date) return t.date.startsWith(monthKey);
      return isCurrentMonth; // fallback to current month if unassigned
    });

    // Compute live session trade exit tags
    const sessionManagedWell = monthTrades.filter(
      (t) => t.discipline === 'managed_well' && t.disciplineSelected !== false
    ).length;
    const sessionExitedEmotionally = monthTrades.filter(
      (t) => t.discipline === 'exited_emotionally' && t.disciplineSelected !== false
    ).length;
    const sessionUnspecified = monthTrades.filter(
      (t) =>
        !(
          (t.discipline === 'managed_well' || t.discipline === 'exited_emotionally') &&
          t.disciplineSelected !== false
        )
    ).length;

    // Aggregate from daily scoreboard records that are NOT today's session (to prevent double counting)
    const historicalScoreboard = monthScoreboard.filter((r) => r.date !== todayStr);

    const historicalManagedWell = historicalScoreboard.reduce(
      (acc, r) => acc + (r.wellManagedExitsCount || 0),
      0
    );
    const historicalExitedEmotionally = historicalScoreboard.reduce(
      (acc, r) => acc + (r.emotionalExitsCount || 0),
      0
    );
    const historicalTradesCount = historicalScoreboard.reduce(
      (acc, r) => acc + (r.tradesCount || 0),
      0
    );

    const totalManagedWell = sessionManagedWell + historicalManagedWell;
    const totalExitedEmotionally = sessionExitedEmotionally + historicalExitedEmotionally;
    const totalTrades = Math.max(
      monthTrades.length + historicalTradesCount,
      totalManagedWell + totalExitedEmotionally + sessionUnspecified
    );
    const totalUnspecified = Math.max(0, totalTrades - (totalManagedWell + totalExitedEmotionally));

    const totalRated = totalManagedWell + totalExitedEmotionally;
    const adherenceRate =
      totalRated > 0 ? Math.round((totalManagedWell / totalRated) * 100) : 100;

    return {
      monthKey,
      totalTrades,
      totalManagedWell,
      totalExitedEmotionally,
      totalUnspecified,
      adherenceRate,
      daysLogged: monthScoreboard.length + (monthTrades.length > 0 && !monthScoreboard.some(r => r.date === todayStr) ? 1 : 0),
      sessionTradesCount: monthTrades.length,
      historicalScoreboard,
    };
  };

  const currentStats = useMemo(() => getMonthlyStats(selectedMonth), [
    selectedMonth,
    state.trades,
    state.dailyScoreboard,
  ]);

  // Handle month navigation
  const currentIndex = availableMonths.indexOf(selectedMonth);
  const hasNext = currentIndex > 0;
  const hasPrev = currentIndex < availableMonths.length - 1;

  const handlePrevMonth = () => {
    if (hasPrev) {
      setSelectedMonth(availableMonths[currentIndex + 1]);
    }
  };

  const handleNextMonth = () => {
    if (hasNext) {
      setSelectedMonth(availableMonths[currentIndex - 1]);
    }
  };

  return (
    <div
      id="board-trade-management-tally"
      className="p-4 sm:p-5 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-4 shadow-xs"
    >
      {/* Header with Monthly Title & Month Selector Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#142630] pb-3.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300">
              Trade Management Tally
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[#0e242d] border border-emerald-500/30 text-emerald-300 font-mono text-[10px] font-extrabold uppercase">
              Monthly Aggregation
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Exit discipline, process execution, and emotional exits calculated monthly.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#071318] border border-[#142933] p-1 rounded-xl">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={!hasPrev}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              hasPrev
                ? 'hover:bg-[#122832] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-white min-w-[130px] justify-center">
            <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{formatShortMonth(selectedMonth)}</span>
          </div>

          <button
            type="button"
            onClick={handleNextMonth}
            disabled={!hasNext}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              hasNext
                ? 'hover:bg-[#122832] text-slate-300 hover:text-white'
                : 'text-slate-600 cursor-not-allowed opacity-40'
            }`}
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Managed Well (Monthly Total) */}
        <div className="p-3.5 rounded-xl bg-[#08151a] border border-emerald-500/25 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300">Managed Well</span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-400 opacity-80" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {currentStats.totalManagedWell}
            </span>
            <span className="text-[11px] font-semibold text-emerald-500/80">
              {currentStats.totalTrades > 0
                ? `${Math.round((currentStats.totalManagedWell / currentStats.totalTrades) * 100)}% of monthly`
                : '0%'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Rules followed to planned exit target
          </div>
        </div>

        {/* Exited Emotionally (Monthly Total) */}
        <div className="p-3.5 rounded-xl bg-[#150a0e] border border-rose-500/25 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shrink-0" />
              <span className="text-xs font-bold text-rose-300">Exited Emotionally</span>
            </div>
            <AlertTriangle className="w-4 h-4 text-rose-400 opacity-80" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
              {currentStats.totalExitedEmotionally}
            </span>
            <span className="text-[11px] font-semibold text-rose-500/80">
              {currentStats.totalTrades > 0
                ? `${Math.round((currentStats.totalExitedEmotionally / currentStats.totalTrades) * 100)}% of monthly`
                : '0%'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            Early cut / panic exit / rule deviation
          </div>
        </div>

        {/* Monthly Discipline Execution Score */}
        <div className="p-3.5 rounded-xl bg-[#081216] border border-[#13252f] flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0" />
              <span className="text-xs font-bold text-slate-300">Monthly Adherence</span>
            </div>
            <TrendingUp className="w-4 h-4 text-teal-400 opacity-80" />
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl sm:text-3xl font-black font-mono ${
                currentStats.adherenceRate >= 80
                  ? 'text-emerald-400'
                  : currentStats.adherenceRate >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {currentStats.adherenceRate}%
            </span>
            <span className="text-[11px] font-semibold text-slate-400 font-mono">
              {currentStats.totalTrades} {currentStats.totalTrades === 1 ? 'trade' : 'trades'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400">
            {formatMonthLabel(selectedMonth)} execution rate
          </div>
        </div>
      </div>

      {/* Proportional Monthly Distribution Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
          <span>{formatMonthLabel(selectedMonth)} Exit Breakdown</span>
          <span>
            {currentStats.totalTrades} total recorded {currentStats.totalTrades === 1 ? 'trade' : 'trades'}
          </span>
        </div>

        <div className="w-full h-2.5 bg-[#0a171d] rounded-full overflow-hidden flex shadow-inner">
          {currentStats.totalTrades > 0 ? (
            <>
              <div
                style={{
                  width: `${(currentStats.totalManagedWell / currentStats.totalTrades) * 100}%`,
                }}
                className="h-full bg-emerald-400 transition-all"
                title={`Managed well: ${currentStats.totalManagedWell}`}
              />
              <div
                style={{
                  width: `${(currentStats.totalExitedEmotionally / currentStats.totalTrades) * 100}%`,
                }}
                className="h-full bg-rose-500 transition-all"
                title={`Exited emotionally: ${currentStats.totalExitedEmotionally}`}
              />
              <div
                style={{
                  width: `${(currentStats.totalUnspecified / currentStats.totalTrades) * 100}%`,
                }}
                className="h-full bg-slate-600 transition-all"
                title={`Unspecified: ${currentStats.totalUnspecified}`}
              />
            </>
          ) : (
            <div className="w-full h-full bg-[#12242c]" title="Day 1 Clean Slate - No trades recorded" />
          )}
        </div>

        {/* Legend */}
        {currentStats.totalTrades > 0 ? (
          <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Managed Well: <strong>{currentStats.totalManagedWell}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span>Exited Emotionally: <strong>{currentStats.totalExitedEmotionally}</strong></span>
            </div>
            {currentStats.totalUnspecified > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Unspecified: <strong>{currentStats.totalUnspecified}</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 italic pt-0.5">
            Day 1 Blank State &bull; No trade exits logged yet for this month.
          </div>
        )}
      </div>

      {/* Month-over-Month Comparison when multiple months exist */}
      {availableMonths.length > 1 && (
        <div className="pt-3 border-t border-[#142630] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Month-over-Month History
            </span>
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'monthly' ? 'breakdown' : 'monthly')}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold transition-colors cursor-pointer"
            >
              {viewMode === 'monthly' ? 'View all months comparison ↓' : 'Hide monthly comparison ↑'}
            </button>
          </div>

          {viewMode === 'breakdown' && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {availableMonths.map((mKey) => {
                const stats = getMonthlyStats(mKey);
                const isSelected = mKey === selectedMonth;

                return (
                  <div
                    key={mKey}
                    onClick={() => setSelectedMonth(mKey)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#10242e] border-emerald-500/50 shadow-xs'
                        : 'bg-[#081216] border-[#13252f] hover:border-[#1a3745]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span className={`font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {formatMonthLabel(mKey)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 font-mono font-bold">
                        {stats.totalManagedWell} well
                      </span>
                      <span className="text-slate-500">&bull;</span>
                      <span className="text-rose-400 font-mono font-bold">
                        {stats.totalExitedEmotionally} emotional
                      </span>
                      <span className="text-slate-500">&bull;</span>
                      <span
                        className={`font-mono font-bold ${
                          stats.adherenceRate >= 80 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {stats.adherenceRate}% rate
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
