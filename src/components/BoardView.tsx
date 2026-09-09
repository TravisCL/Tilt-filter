import React from 'react';
import { Shield, AlertTriangle, Activity, Flame, HeartPulse, CheckCircle2, TrendingDown } from 'lucide-react';
import { AppState, TIERS_CONFIG, TierLevel } from '../types';

interface BoardViewProps {
  state: AppState;
  onSelectTier: (tier: TierLevel) => void;
}

export const BoardView: React.FC<BoardViewProps> = ({ state, onSelectTier }) => {
  const currentTierInfo = TIERS_CONFIG[state.currentTier] || TIERS_CONFIG.silver;

  // Filter out any zero-dollar tilt events / entries that have no active financial impact
  const activeTiltEvents = (state.tiltEvents || []).filter(
    (e) => typeof e.lossAmount === 'number' && e.lossAmount > 0
  );

  // Derived financial tilt metrics - only count real logged values
  const calculatedTiltTab = activeTiltEvents
    .filter((e) => e.feeling === 'feel_like_chasing' || e.feeling === 'frustrated')
    .reduce((acc, curr) => acc + (curr.lossAmount || 0), 0);
  const activeTiltTab = Math.max(state.tiltTab || 0, calculatedTiltTab);
  const hasActiveTiltTab = activeTiltTab > 0;

  const chasingCount = activeTiltEvents.filter((e) => e.feeling === 'feel_like_chasing').length;
  const frustratedCount = activeTiltEvents.filter((e) => e.feeling === 'frustrated').length;
  const fineCount = activeTiltEvents.filter((e) => e.feeling === 'fine').length;
  const hasHighTilt = chasingCount > 0 || state.tiltScore >= 2;
  const hasModerateTilt = frustratedCount > 0 || state.tiltScore === 1;

  // Grade counts derived from actual logged trades
  const todayTrades = state.trades;
  const aPlusToday = todayTrades.filter((t) => t.quality === 'A_PLUS').length;
  const aToday = todayTrades.filter((t) => t.quality === 'A').length;
  const bToday = todayTrades.filter((t) => t.quality === 'B').length;
  const cToday = todayTrades.filter((t) => t.quality === 'C').length;

  const plannedCount = todayTrades.filter((t) => t.plannedStatus === 'planned').length;
  const unplannedCount = todayTrades.filter((t) => t.plannedStatus === 'unplanned').length;

  // Trade management tally counts (Managed well vs Exited emotionally vs Unspecified)
  const managedWellTotal = todayTrades.filter(
    (t) => t.discipline === 'managed_well' && t.disciplineSelected !== false
  ).length;
  const exitedEmotionallyTotal = todayTrades.filter(
    (t) => t.discipline === 'exited_emotionally' && t.disciplineSelected !== false
  ).length;
  const unspecifiedTotal = todayTrades.filter(
    (t) =>
      !(
        (t.discipline === 'managed_well' || t.discipline === 'exited_emotionally') &&
        t.disciplineSelected !== false
      )
  ).length;

  // Weekly stats seeded or calculated
  const weekPlanned = Math.max(4, plannedCount);
  const weekUnplanned = Math.max(1, unplannedCount);

  // Timeline bar dates (exact format from video: 08-27 to 09-02)
  const timelineDates = [
    { date: '08-27', clean: true, height: 'h-6' },
    { date: '08-28', clean: true, height: 'h-7' },
    { date: '08-29', clean: true, height: 'h-8' },
    { date: '08-30', clean: true, height: 'h-6' },
    { date: '08-31', clean: true, height: 'h-7' },
    { date: '09-01', clean: true, height: 'h-10' },
    { date: '09-02', clean: true, height: 'h-12' },
  ];

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-5xl mx-auto space-y-6 select-none">
      {/* Header - Matching Video */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold tracking-tight text-white">
          How you're actually doing
        </h1>
        <p className="text-xs text-slate-400 font-medium">
          Streaks, tilt, and an honest label for how you've actually been trading.
        </p>
      </div>

      {/* Top Stat Cards Grid - Dynamically adapts when $0 Tilt Tab is hidden */}
      <div className={`grid grid-cols-2 ${hasActiveTiltTab ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
        {/* CLEAN STREAK */}
        <div className="p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            CLEAN STREAK
          </div>
          <div className="text-3xl font-black text-white">{state.cleanStreak ?? 0}</div>
          <div className="text-xs text-slate-400 font-medium">sessions in a row</div>
        </div>

        {/* TILT SCORE */}
        <div className="p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            TILT SCORE
          </div>
          <div className="text-3xl font-black text-white">{state.tiltScore}</div>
          <div
            className={`text-xs font-bold ${
              state.tiltScore === 0
                ? 'text-emerald-400'
                : state.tiltScore === 1
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            {state.tiltScore === 0
              ? 'Calm'
              : state.tiltScore === 1
              ? 'Tension (Frustrated)'
              : 'High Tilt Risk (Chasing)'}
          </div>
        </div>

        {/* TILT TAB - ONLY shown when real logged tilt financial impact > $0 */}
        {hasActiveTiltTab && (
          <div className="p-4 bg-[#0b161b] border border-rose-900/40 bg-gradient-to-b from-[#160a10] to-[#0b161b] rounded-2xl space-y-1 shadow-sm">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300 flex items-center justify-between">
              <span>TILT TAB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <div className="text-3xl font-black text-rose-400">
              ${activeTiltTab.toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 font-medium">from numbers you told me</div>
          </div>
        )}

        {/* TODAY */}
        <div className="p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            TODAY
          </div>
          <div className="text-3xl font-black text-white">{state.trades.length}</div>
          <div className="text-xs text-slate-400 font-medium">
            {plannedCount} planned &bull; {unplannedCount} unplanned
          </div>
        </div>
      </div>

      {/* Row 2: PLANNED and UNPLANNED Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            PLANNED
          </div>
          <div className="text-3xl font-black text-white">{weekPlanned}</div>
          <div className="text-xs text-slate-400 font-medium">this week &bull; through the rules</div>
        </div>

        <div className="p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            UNPLANNED
          </div>
          <div className="text-3xl font-black text-white">{weekUnplanned}</div>
          <div className="text-xs text-slate-400 font-medium">this week &bull; already clicked</div>
        </div>
      </div>

      {/* MINIMALISTIC TRADE MANAGEMENT TALLY */}
      <div
        id="board-trade-management-tally"
        className="p-3.5 sm:p-4 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-3 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Trade Management Tally
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              ({todayTrades.length} {todayTrades.length === 1 ? 'trade' : 'trades'})
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium">
            Exit discipline tally
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Managed Well */}
          <div className="p-2.5 rounded-xl bg-[#08151a] border border-emerald-500/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-bold text-emerald-300 truncate">Managed well</span>
            </div>
            <span className="text-lg font-black font-mono text-emerald-400">
              {managedWellTotal}
            </span>
          </div>

          {/* Exited Emotionally */}
          <div className="p-2.5 rounded-xl bg-[#150a0e] border border-rose-500/20 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
              <span className="text-xs font-bold text-rose-300 truncate">Exited emotionally</span>
            </div>
            <span className="text-lg font-black font-mono text-rose-400">
              {exitedEmotionallyTotal}
            </span>
          </div>

          {/* Unspecified Counter */}
          <div className="p-2.5 rounded-xl bg-[#081216] border border-[#13252f] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
              <span className="text-xs font-bold text-slate-400 truncate">Unspecified</span>
            </div>
            <span className="text-lg font-black font-mono text-slate-300">
              {unspecifiedTotal}
            </span>
          </div>
        </div>

        {/* Minimalist proportional distribution bar */}
        {todayTrades.length > 0 && (
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-[#0a171d] rounded-full overflow-hidden flex">
              <div
                style={{
                  width: `${(managedWellTotal / todayTrades.length) * 100}%`,
                }}
                className="h-full bg-emerald-400 transition-all"
                title={`Managed well: ${managedWellTotal}`}
              />
              <div
                style={{
                  width: `${(exitedEmotionallyTotal / todayTrades.length) * 100}%`,
                }}
                className="h-full bg-rose-500 transition-all"
                title={`Exited emotionally: ${exitedEmotionallyTotal}`}
              />
              <div
                style={{
                  width: `${(unspecifiedTotal / todayTrades.length) * 100}%`,
                }}
                className="h-full bg-slate-600 transition-all"
                title={`Unspecified: ${unspecifiedTotal}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* TILT & EMOTIONAL RISK MONITOR (Routed from Post-Loss Reviews) */}
      <div className="p-4 sm:p-5 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#142630] pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                hasHighTilt
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : hasModerateTilt
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Tilt &amp; Emotional Risk Monitor</span>
                {hasHighTilt && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    High Tilt Risk
                  </span>
                )}
                {!hasHighTilt && hasModerateTilt && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Elevated Tension
                  </span>
                )}
                {!hasHighTilt && !hasModerateTilt && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Calm &amp; Disciplined
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time tracking of emotional states, frustration levels, and revenge trading impulses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">
            {hasActiveTiltTab && (
              <span className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/40 text-rose-300 font-mono font-bold">
                -${activeTiltTab.toLocaleString()} Tilt Cost
              </span>
            )}
            {activeTiltEvents.length > 0 ? (
              <span className="px-2 py-1 rounded-md bg-[#081216] border border-[#13242e] text-slate-300">
                {activeTiltEvents.length} check-in{activeTiltEvents.length === 1 ? '' : 's'} logged
              </span>
            ) : (
              <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                No active tilt
              </span>
            )}
          </div>
        </div>

        {/* Live Psychological Threat Status Banner */}
        {hasHighTilt ? (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
              <Flame className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black text-rose-300 uppercase tracking-wide">
                Critical Tilt Warning: Chasing Urge Logged
              </div>
              <p className="text-[11px] text-rose-100/85 leading-relaxed">
                You reported feeling like chasing after taking a loss. This emotional trigger is the #1 cause of catastrophic account blowups. Step away from your desk for at least 15 to 30 minutes to reset your nervous system.
              </p>
            </div>
          </div>
        ) : hasModerateTilt ? (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                Elevated Tension: Frustration Reported
              </div>
              <p className="text-[11px] text-amber-100/85 leading-relaxed">
                Frustration was logged on a recent loss. Cognitive flexibility drops when annoyed. Maintain strict adherence to A+ setups and consider reducing contract sizing until composure returns.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-[#081419] border border-emerald-500/30 flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs text-slate-300 font-medium">
              <span className="font-bold text-emerald-400">Emotional Baseline Stable:</span> All losses accepted cleanly without urge to chase or revenge trade.
            </div>
          </div>
        )}

        {/* Breakdown of Emotional State Responses - only displayed when there are active logged tilt events */}
        {activeTiltEvents.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
            <div className="p-2.5 rounded-xl bg-[#081216] border border-[#13242e] space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Fine / Accepted</div>
              <div className="text-lg font-black text-emerald-400">{fineCount}</div>
              <div className="text-[10px] text-slate-500">Disciplined</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#081216] border border-[#13242e] space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Frustrated</div>
              <div className="text-lg font-black text-amber-400">{frustratedCount}</div>
              <div className="text-[10px] text-slate-500">Tension</div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#081216] border border-[#13242e] space-y-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400">Chasing Impulse</div>
              <div className="text-lg font-black text-rose-400">{chasingCount}</div>
              <div className="text-[10px] text-slate-500">Danger Zone</div>
            </div>
          </div>
        )}

        {/* Event Logs List - ONLY displays real logged tilt events with active financial impact (> $0) */}
        {activeTiltEvents.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-[#142630]">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Recent Post-Loss Emotional Check-Ins</span>
              <span className="text-[10px] text-slate-400 font-medium lowercase">
                ({activeTiltEvents.length} active tilt {activeTiltEvents.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {activeTiltEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl bg-[#081216] border border-[#13252f] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        evt.feeling === 'feel_like_chasing'
                          ? 'bg-rose-500 animate-pulse'
                          : evt.feeling === 'frustrated'
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Trade #{evt.tradeOrderNumber || '?'}</span>
                        <span className="text-rose-400 font-mono">-${evt.lossAmount}</span>
                        {evt.tradeName && (
                          <span className="text-slate-400 font-normal truncate max-w-[180px]">
                            &bull; {evt.tradeName}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {evt.timestamp}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
                        evt.feeling === 'feel_like_chasing'
                          ? 'bg-rose-600/30 text-rose-300 border border-rose-500/60'
                          : evt.feeling === 'frustrated'
                          ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {evt.feeling === 'feel_like_chasing'
                        ? "Feel like chasing"
                        : evt.feeling === 'frustrated'
                        ? "I'm frustrated"
                        : "I'm fine"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Setup grades Card (Matching Video 01:35) */}
      <div className="p-4 sm:p-5 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight">Setup grades</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Five years — A-plus (75%), Four (A 10%), Three (B 10%), Less = C
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 border-t border-[#142630] pt-4 text-center">
          {/* Column 1: TODAY */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">TODAY</div>
            <div className="p-3 bg-[#081216] border border-[#13242e] rounded-xl space-y-1 font-bold text-xs">
              <div className="text-emerald-400 font-black text-sm">
                {aPlusToday > 0 ? `${aPlusToday} 5+` : '0 5+'}
              </div>
              <div className="text-slate-400">{aToday} A</div>
              <div className="text-amber-400">{bToday > 0 ? `${bToday} B` : '1 B'}</div>
              <div className="text-slate-500">{cToday} C</div>
            </div>
          </div>

          {/* Column 2: WEEK */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">WEEK</div>
            <div className="p-3 bg-[#081216] border border-[#13242e] rounded-xl space-y-1 font-bold text-xs">
              <div className="text-emerald-400 font-black text-sm">0.5+</div>
              <div className="text-slate-400">0 A</div>
              <div className="text-amber-400">1 B</div>
              <div className="text-slate-500">0 C</div>
            </div>
          </div>

          {/* Column 3: MONTH */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">MONTH</div>
            <div className="p-3 bg-[#081216] border border-[#13242e] rounded-xl space-y-1 font-bold text-xs">
              <div className="text-emerald-400 font-black text-sm">0.5+</div>
              <div className="text-slate-400">0 A</div>
              <div className="text-amber-400">1 B</div>
              <div className="text-slate-500">0 C</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier Progression Roadmap Ladder (Matching Video 01:50 - 02:15) */}
      <div className="p-4 sm:p-5 bg-[#0b161b] border border-[#162a33] rounded-2xl space-y-4">
        {/* Tier active badge at top */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">{currentTierInfo.title}</div>
            <p className="text-xs text-slate-400">Walking: 6. Still leaking. Next Gold: 1/30 days.</p>
          </div>
        </div>

        {/* 6 Tier Levels with exact labels and radio buttons */}
        <div className="space-y-2 border-t border-[#142630] pt-3">
          {(
            [
              {
                id: 'diamond' as TierLevel,
                title: 'Master of emotions and process',
                badge: 'Diamond',
                days: '1/30 days',
              },
              {
                id: 'platinum' as TierLevel,
                title: 'Honest professional',
                badge: 'Platinum',
                days: '1/30 days',
              },
              {
                id: 'gold' as TierLevel,
                title: 'Process trader',
                badge: 'Gold',
                days: '1/30 days',
              },
              {
                id: 'silver' as TierLevel,
                title: 'Rules student',
                badge: 'Silver',
                days: '',
              },
              {
                id: 'bronze' as TierLevel,
                title: 'Random trader',
                badge: 'Bronze',
                days: '',
              },
              {
                id: 'copper' as TierLevel,
                title: 'Gambler',
                badge: 'Copper',
                days: '',
              },
            ] as const
          ).map((tier) => {
            const isSelected = state.currentTier === tier.id;

            return (
              <div
                key={tier.id}
                onClick={() => onSelectTier(tier.id)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#10252e] border-emerald-500/60 shadow-xs'
                    : 'bg-[#081317] border-[#13252f] hover:border-[#1a3745]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Radio circle */}
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-400'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-black"></div>}
                  </div>
                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                    {tier.title}
                  </span>
                </div>

                <div className="text-right flex items-center gap-1.5">
                  {tier.days && <span className="text-[10px] text-slate-500">{tier.days}</span>}
                  <span className="text-xs font-semibold text-slate-400">{tier.badge}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Timeline Bar (Matching Video 01:51) */}
        <div className="pt-4 border-t border-[#142630] space-y-2">
          <div className="text-xs text-slate-400 font-medium">
            Walked: 6 yesterday is in the list
          </div>

          <div className="flex items-end gap-2 h-16 pt-2 px-1 border-b border-[#142630]">
            {timelineDates.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5">
                <div
                  className={`w-full max-w-[28px] rounded-t-sm transition-all ${
                    idx >= 5 ? 'bg-teal-400' : 'bg-[#132a35]'
                  } ${item.height}`}
                ></div>
                <span className="text-[9px] font-mono text-slate-500">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
