import { supabase } from './supabaseClient';
import {
  AppState,
  TradingAccount,
  CompletedTrade,
  DailyScoreRecord,
  TiltEvent,
  DeskMessage,
} from '../types';

// ============================================================
// Row <-> app-model mappers (camelCase app fields <-> snake_case DB columns)
// ============================================================

function accountToRow(a: TradingAccount) {
  return {
    id: a.id,
    name: a.name,
    size: a.size,
    drawdown_type: a.drawdownType,
    max_drawdown: a.maxDrawdown,
    floor_level: a.floorLevel ?? null,
    stop_trailing_at_floor: a.stopTrailingAtFloor,
    current_balance: a.currentBalance,
    high_water_mark: a.highWaterMark,
    active: a.active,
    account_type: a.accountType ?? null,
    status: a.status ?? null,
    blown_date: a.blownDate ?? null,
  };
}

function rowToAccount(r: any): TradingAccount {
  return {
    id: r.id,
    name: r.name,
    size: Number(r.size) || 0,
    drawdownType: r.drawdown_type,
    maxDrawdown: Number(r.max_drawdown) || 0,
    floorLevel: r.floor_level != null ? Number(r.floor_level) : undefined,
    stopTrailingAtFloor: Boolean(r.stop_trailing_at_floor),
    currentBalance: Number(r.current_balance) || 0,
    highWaterMark: Number(r.high_water_mark) || 0,
    active: Boolean(r.active),
    accountType: r.account_type ?? undefined,
    status: r.status ?? undefined,
    blownDate: r.blown_date ?? undefined,
  };
}

function tradeToRow(t: CompletedTrade) {
  return {
    id: t.id,
    order_number: t.orderNumber,
    timestamp: t.timestamp,
    date: t.date ?? null,
    planned_status: t.plannedStatus,
    quality: t.quality,
    symbol: t.symbol,
    risk_dollars: t.riskDollars,
    risk_percent: t.riskPercent,
    pnl: t.pnl,
    r_multiple: t.rMultiple,
    rules_held: t.rulesHeld,
    discipline: t.discipline ?? null,
    discipline_selected: t.disciplineSelected ?? null,
    take_profit_target: t.takeProfitTarget ?? null,
    name: t.name,
    outcome: t.outcome ?? null,
    emotional_state: t.emotionalState ?? null,
    tilt_risk: t.tiltRisk ?? null,
    screenshot_url: t.screenshotUrl ?? null,
    checklist_answers: t.checklistAnswers,
    rule_notes: t.ruleNotes ?? null,
    notes: t.notes ?? null,
    memo: t.memo ?? null,
    account_id: t.accountId ?? null,
    account_name: t.accountName ?? null,
    link_group_id: t.linkGroupId ?? null,
    direction: t.direction ?? null,
    entry_price: t.entryPrice ?? null,
    exit_price: t.exitPrice ?? null,
  };
}

function rowToTrade(r: any): CompletedTrade {
  return {
    id: r.id,
    orderNumber: r.order_number,
    timestamp: r.timestamp,
    date: r.date ?? undefined,
    plannedStatus: r.planned_status,
    quality: r.quality,
    symbol: r.symbol,
    riskDollars: Number(r.risk_dollars) || 0,
    riskPercent: Number(r.risk_percent) || 0,
    pnl: Number(r.pnl) || 0,
    rMultiple: Number(r.r_multiple) || 0,
    rulesHeld: Boolean(r.rules_held),
    discipline: r.discipline ?? undefined,
    disciplineSelected: r.discipline_selected ?? undefined,
    takeProfitTarget: r.take_profit_target != null ? Number(r.take_profit_target) : undefined,
    name: r.name,
    outcome: r.outcome ?? undefined,
    emotionalState: r.emotional_state ?? undefined,
    tiltRisk: r.tilt_risk ?? undefined,
    screenshotUrl: r.screenshot_url ?? undefined,
    checklistAnswers: r.checklist_answers,
    ruleNotes: r.rule_notes ?? undefined,
    notes: r.notes ?? undefined,
    memo: r.memo ?? undefined,
    accountId: r.account_id ?? undefined,
    accountName: r.account_name ?? undefined,
    linkGroupId: r.link_group_id ?? undefined,
    direction: r.direction ?? undefined,
    entryPrice: r.entry_price != null ? Number(r.entry_price) : undefined,
    exitPrice: r.exit_price != null ? Number(r.exit_price) : undefined,
  };
}

function scoreboardToRow(s: DailyScoreRecord) {
  return {
    id: s.id,
    date: s.date,
    day_label: s.dayLabel,
    feel_level: s.feelLevel,
    sleep_level: s.sleepLevel ?? null,
    sleep_quality: s.sleepQuality ?? null,
    focus_intention: s.focusIntention ?? null,
    triggers_distractions: s.triggersDistractions ?? null,
    morning_notes: s.morningNotes ?? null,
    walk_out_notes: s.walkOutNotes ?? null,
    daily_process_score: s.dailyProcessScore,
    emotional_consistency_percent: s.emotionalConsistencyPercent,
    rule_adherence_percent: s.ruleAdherencePercent,
    trades_count: s.tradesCount,
    planned_trades_count: s.plannedTradesCount,
    unplanned_trades_count: s.unplannedTradesCount,
    well_managed_exits_count: s.wellManagedExitsCount,
    emotional_exits_count: s.emotionalExitsCount,
    pnl: s.pnl,
    is_clean_day: s.isCleanDay,
    status: s.status,
    session_outcome: s.sessionOutcome ?? null,
    session_reflection: s.sessionReflection ?? null,
  };
}

function rowToScoreboard(r: any): DailyScoreRecord {
  return {
    id: r.id,
    date: r.date,
    dayLabel: r.day_label,
    feelLevel: r.feel_level,
    sleepLevel: r.sleep_level ?? undefined,
    sleepQuality: r.sleep_quality ?? undefined,
    focusIntention: r.focus_intention ?? undefined,
    triggersDistractions: r.triggers_distractions ?? undefined,
    morningNotes: r.morning_notes ?? undefined,
    walkOutNotes: r.walk_out_notes ?? undefined,
    dailyProcessScore: r.daily_process_score,
    emotionalConsistencyPercent: r.emotional_consistency_percent,
    ruleAdherencePercent: r.rule_adherence_percent,
    tradesCount: r.trades_count,
    plannedTradesCount: r.planned_trades_count,
    unplannedTradesCount: r.unplanned_trades_count,
    wellManagedExitsCount: r.well_managed_exits_count,
    emotionalExitsCount: r.emotional_exits_count,
    pnl: Number(r.pnl) || 0,
    isCleanDay: Boolean(r.is_clean_day),
    status: r.status,
    sessionOutcome: r.session_outcome ?? undefined,
    sessionReflection: r.session_reflection ?? undefined,
  };
}

function tiltEventToRow(e: TiltEvent) {
  return {
    id: e.id,
    trade_id: e.tradeId ?? null,
    trade_order_number: e.tradeOrderNumber ?? null,
    trade_name: e.tradeName ?? null,
    timestamp: e.timestamp,
    feeling: e.feeling,
    tilt_risk: e.tiltRisk,
    loss_amount: e.lossAmount,
    notes: e.notes ?? null,
  };
}

function rowToTiltEvent(r: any): TiltEvent {
  return {
    id: r.id,
    tradeId: r.trade_id ?? undefined,
    tradeOrderNumber: r.trade_order_number ?? undefined,
    tradeName: r.trade_name ?? undefined,
    timestamp: r.timestamp,
    feeling: r.feeling,
    tiltRisk: r.tilt_risk,
    lossAmount: Number(r.loss_amount) || 0,
    notes: r.notes ?? undefined,
  };
}

function messageToRow(m: DeskMessage) {
  return { id: m.id, sender: m.sender, time: m.time, text: m.text };
}

function rowToMessage(r: any): DeskMessage {
  return { id: r.id, sender: r.sender, time: r.time, text: r.text };
}

function appMetaToRow(s: AppState) {
  return {
    id: 'singleton',
    current_view: s.currentView,
    active_account_id: s.activeAccountId,
    rules: s.rules,
    system_tags: s.systemTags ?? null,
    emotional_tracker: s.emotionalTracker,
    clean_streak: s.cleanStreak,
    day_counter: s.dayCounter ?? 1,
    tilt_score: s.tiltScore,
    tilt_tab: s.tiltTab,
    current_tier: s.currentTier,
    custom_risk_input: s.customRiskInput,
    selected_sizing_tier: s.selectedSizingTier,
    discord_webhook_enabled: s.discordWebhookEnabled ?? false,
    discord_webhook_url: s.discordWebhookUrl ?? null,
    updated_at: new Date().toISOString(),
  };
}

// ============================================================
// Pull: read everything from Supabase
// ============================================================

export interface PulledState {
  accounts: TradingAccount[];
  trades: CompletedTrade[];
  dailyScoreboard: DailyScoreRecord[];
  tiltEvents: TiltEvent[];
  deskMessages: DeskMessage[];
  meta: {
    currentView?: AppState['currentView'];
    activeAccountId?: string;
    rules?: AppState['rules'];
    systemTags?: string[];
    emotionalTracker?: AppState['emotionalTracker'];
    cleanStreak?: number;
    dayCounter?: number;
    tiltScore?: number;
    tiltTab?: number;
    currentTier?: AppState['currentTier'];
    customRiskInput?: string;
    selectedSizingTier?: AppState['selectedSizingTier'];
    discordWebhookEnabled?: boolean;
    discordWebhookUrl?: string;
  } | null;
  isEmpty: boolean;
}

export async function pullStateFromSupabase(): Promise<PulledState | null> {
  if (!supabase) return null;

  try {
    const [accountsRes, tradesRes, scoreboardRes, tiltRes, messagesRes, metaRes] = await Promise.all([
      supabase.from('accounts').select('*'),
      supabase.from('trades').select('*').order('order_number', { ascending: true }),
      supabase.from('daily_scoreboard').select('*'),
      supabase.from('tilt_events').select('*'),
      supabase.from('desk_messages').select('*'),
      supabase.from('app_meta').select('*').eq('id', 'singleton').maybeSingle(),
    ]);

    for (const res of [accountsRes, tradesRes, scoreboardRes, tiltRes, messagesRes, metaRes]) {
      if (res.error) throw res.error;
    }

    const accounts = (accountsRes.data || []).map(rowToAccount);
    const trades = (tradesRes.data || []).map(rowToTrade);
    const dailyScoreboard = (scoreboardRes.data || []).map(rowToScoreboard);
    const tiltEvents = (tiltRes.data || []).map(rowToTiltEvent);
    const deskMessages = (messagesRes.data || []).map(rowToMessage);
    const metaRow = metaRes.data;

    const isEmpty = accounts.length === 0 && trades.length === 0 && dailyScoreboard.length === 0;

    return {
      accounts,
      trades,
      dailyScoreboard,
      tiltEvents,
      deskMessages,
      meta: metaRow
        ? {
            currentView: metaRow.current_view ?? undefined,
            activeAccountId: metaRow.active_account_id ?? undefined,
            rules: metaRow.rules ?? undefined,
            systemTags: metaRow.system_tags ?? undefined,
            emotionalTracker: metaRow.emotional_tracker ?? undefined,
            cleanStreak: metaRow.clean_streak ?? undefined,
            dayCounter: metaRow.day_counter ?? undefined,
            tiltScore: metaRow.tilt_score ?? undefined,
            tiltTab: metaRow.tilt_tab ?? undefined,
            currentTier: metaRow.current_tier ?? undefined,
            customRiskInput: metaRow.custom_risk_input ?? undefined,
            selectedSizingTier: metaRow.selected_sizing_tier ?? undefined,
            discordWebhookEnabled: metaRow.discord_webhook_enabled ?? undefined,
            discordWebhookUrl: metaRow.discord_webhook_url ?? undefined,
          }
        : null,
      isEmpty,
    };
  } catch (e) {
    console.warn('[Supabase] pull failed, staying on local data:', e);
    return null;
  }
}

/** Merges a Supabase pull result into an existing AppState — used both on initial
 * bootstrap and on every live realtime update, so both paths stay identical. */
export function mergePulledIntoState(pulled: PulledState, prev: AppState): AppState {
  return {
    ...prev,
    accounts: pulled.accounts,
    trades: pulled.trades,
    dailyScoreboard: pulled.dailyScoreboard,
    tiltEvents: pulled.tiltEvents,
    deskMessages: pulled.deskMessages.length > 0 ? pulled.deskMessages : prev.deskMessages,
    ...(pulled.meta
      ? {
          activeAccountId: pulled.meta.activeAccountId || prev.activeAccountId,
          rules: pulled.meta.rules && pulled.meta.rules.length > 0 ? pulled.meta.rules : prev.rules,
          systemTags: pulled.meta.systemTags && pulled.meta.systemTags.length > 0 ? pulled.meta.systemTags : prev.systemTags,
          emotionalTracker: pulled.meta.emotionalTracker || prev.emotionalTracker,
          cleanStreak: pulled.meta.cleanStreak ?? prev.cleanStreak,
          dayCounter: pulled.meta.dayCounter ?? prev.dayCounter,
          tiltScore: pulled.meta.tiltScore ?? prev.tiltScore,
          tiltTab: pulled.meta.tiltTab ?? prev.tiltTab,
          currentTier: pulled.meta.currentTier || prev.currentTier,
          customRiskInput: pulled.meta.customRiskInput ?? prev.customRiskInput,
          selectedSizingTier: pulled.meta.selectedSizingTier || prev.selectedSizingTier,
          discordWebhookEnabled: pulled.meta.discordWebhookEnabled ?? prev.discordWebhookEnabled,
          discordWebhookUrl: pulled.meta.discordWebhookUrl ?? prev.discordWebhookUrl,
        }
      : {}),
  };
}

// ============================================================
// Push: write everything to Supabase (debounced)
// ============================================================

async function syncTable(table: string, rows: { id: string }[]) {
  if (!supabase) return;

  const { data: existing, error: selErr } = await supabase.from(table).select('id');
  if (selErr) {
    console.error(`[Supabase] ${table} select failed:`, selErr);
    throw selErr;
  }

  const localIds = new Set(rows.map((r) => r.id));
  const toDelete = (existing || []).map((r: any) => r.id).filter((id: string) => !localIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().in('id', toDelete);
    if (delErr) {
      console.error(`[Supabase] ${table} delete failed:`, delErr);
      throw delErr;
    }
  }

  if (rows.length > 0) {
    const { error: upErr } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
    if (upErr) {
      console.error(`[Supabase] ${table} upsert failed:`, upErr);
      throw upErr;
    }
  }
}

export async function pushStateToSupabase(state: AppState): Promise<void> {
  if (!supabase) return;

  await Promise.all([
    syncTable('accounts', (state.accounts || []).map(accountToRow)),
    syncTable('trades', (state.trades || []).map(tradeToRow)),
    syncTable('daily_scoreboard', (state.dailyScoreboard || []).map(scoreboardToRow)),
    syncTable('tilt_events', (state.tiltEvents || []).map(tiltEventToRow)),
    syncTable('desk_messages', (state.deskMessages || []).map(messageToRow)),
    supabase.from('app_meta').upsert(appMetaToRow(state), { onConflict: 'id' }),
  ]);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight: Promise<void> | null = null;

/**
 * Debounced push — call on every state change. Coalesces rapid-fire updates
 * (e.g. fast typing) into a single network round-trip ~800ms after the last change.
 */
export function scheduleSupabasePush(state: AppState) {
  if (!supabase) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushInFlight = pushStateToSupabase(state)
      .catch((e) => console.error('[Supabase] push failed:', e))
      .finally(() => {
        pushInFlight = null;
      });
  }, 800);
}

/**
 * Resolves once any currently scheduled (debouncing) or in-flight push has
 * finished. Realtime-driven pulls must await this first — otherwise a pull
 * can land with stale data from BEFORE our own most recent local write and
 * silently overwrite it when merged back into state (e.g. a just-logged
 * tilt admission getting wiped by an echo of our own earlier, staler write).
 */
export async function waitForPendingPush(): Promise<void> {
  while (pushTimer !== null) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (pushInFlight) {
    await pushInFlight;
  }
}

// ============================================================
// Live cross-device sync (Supabase Realtime)
// Without this, a change only reaches other devices/tabs the next time
// they happen to reload — this makes every device reflect changes
// within ~1s of any other device saving, no refresh needed.
// Requires the tables to be added to the `supabase_realtime` publication
// (see supabase/enable_realtime.sql).
// ============================================================

const REALTIME_TABLES = ['accounts', 'trades', 'daily_scoreboard', 'tilt_events', 'desk_messages', 'app_meta'];

export function subscribeToSupabaseRealtime(onRemoteChange: () => void): () => void {
  if (!supabase) return () => {};

  const channel = supabase.channel('app-state-sync');
  REALTIME_TABLES.forEach((table) => {
    channel.on('postgres_changes' as any, { event: '*', schema: 'public', table }, () => {
      onRemoteChange();
    });
  });
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
