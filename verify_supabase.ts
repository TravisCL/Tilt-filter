// Live round-trip test against the real Supabase project (schema.sql already run there).
// Reads URL/key straight from .env (no Vite runtime needed here).
// Run with: npx tsx verify_supabase.ts
// Cleans up all rows it inserts — safe to run repeatedly against a project already in use.

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envText.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean, detail?: unknown) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}${detail !== undefined ? `: ${JSON.stringify(detail)}` : ''}`);
  cond ? pass++ : fail++;
}

async function main() {
  const testId = `test-${Date.now()}`;

  // --- accounts ---
  {
    const row = {
      id: `${testId}-acc`, name: 'Test Account', size: 50000, drawdown_type: 'eod',
      max_drawdown: 2000, floor_level: 48000, stop_trailing_at_floor: true,
      current_balance: 50000, high_water_mark: 50000, active: true, account_type: 'eval', status: 'active',
    };
    const { error: insErr } = await supabase.from('accounts').insert(row);
    check('accounts insert', !insErr, insErr?.message);
    const { data, error: selErr } = await supabase.from('accounts').select('*').eq('id', row.id).single();
    check('accounts read-back matches', !selErr && data?.name === 'Test Account' && Number(data?.max_drawdown) === 2000, data);
    const { error: delErr } = await supabase.from('accounts').delete().eq('id', row.id);
    check('accounts delete', !delErr, delErr?.message);
  }

  // --- trades ---
  {
    const row = {
      id: `${testId}-trade`, order_number: 1, timestamp: '9:30 AM', date: '2026-09-14',
      planned_status: 'planned', quality: 'A_PLUS', symbol: 'XAUUSD', risk_dollars: 300, risk_percent: 15,
      pnl: 450.5, r_multiple: 1.5, rules_held: true, discipline: 'managed_well', discipline_selected: true,
      name: 'IB sweep long', outcome: 'winner', emotional_state: 'fine', tilt_risk: 'low',
      checklist_answers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
      notes: 'clean setup', account_id: null, account_name: 'Test Account',
    };
    const { error: insErr } = await supabase.from('trades').insert(row);
    check('trades insert', !insErr, insErr?.message);
    const { data, error: selErr } = await supabase.from('trades').select('*').eq('id', row.id).single();
    check(
      'trades read-back matches (incl. jsonb checklist)',
      !selErr && Number(data?.pnl) === 450.5 && data?.checklist_answers?.q5NotFomo === true,
      data
    );
    const { error: delErr } = await supabase.from('trades').delete().eq('id', row.id);
    check('trades delete', !delErr, delErr?.message);
  }

  // --- daily_scoreboard ---
  // Uses a far-future date so it never collides with a real day's row
  // (the table has a UNIQUE constraint on `date`).
  {
    const row = {
      id: `${testId}-day`, date: '2099-01-01', day_label: 'Day 99 (Test)', feel_level: 7,
      daily_process_score: 90, emotional_consistency_percent: 90, rule_adherence_percent: 100,
      trades_count: 2, planned_trades_count: 2, unplanned_trades_count: 0, well_managed_exits_count: 2,
      emotional_exits_count: 0, pnl: 450.5, is_clean_day: true, status: 'clean', session_outcome: 'clean',
    };
    const { error: insErr } = await supabase.from('daily_scoreboard').insert(row);
    check('daily_scoreboard insert', !insErr, insErr?.message);
    const { data, error: selErr } = await supabase.from('daily_scoreboard').select('*').eq('id', row.id).single();
    check('daily_scoreboard read-back matches', !selErr && data?.day_label === 'Day 99 (Test)' && data?.is_clean_day === true, data);
    const { error: delErr } = await supabase.from('daily_scoreboard').delete().eq('id', row.id);
    check('daily_scoreboard delete', !delErr, delErr?.message);
  }

  // --- tilt_events ---
  {
    const row = {
      id: `${testId}-tilt`, timestamp: '2:00 PM', feeling: 'frustrated', tilt_risk: 'high',
      loss_amount: 200, notes: 'chased a loser',
    };
    const { error: insErr } = await supabase.from('tilt_events').insert(row);
    check('tilt_events insert', !insErr, insErr?.message);
    const { data, error: selErr } = await supabase.from('tilt_events').select('*').eq('id', row.id).single();
    check('tilt_events read-back matches', !selErr && data?.feeling === 'frustrated' && Number(data?.loss_amount) === 200, data);
    const { error: delErr } = await supabase.from('tilt_events').delete().eq('id', row.id);
    check('tilt_events delete', !delErr, delErr?.message);
  }

  // --- desk_messages ---
  {
    const row = { id: `${testId}-msg`, sender: 'BUDDY', time: '2:05 PM', text: 'Test message' };
    const { error: insErr } = await supabase.from('desk_messages').insert(row);
    check('desk_messages insert', !insErr, insErr?.message);
    const { data, error: selErr } = await supabase.from('desk_messages').select('*').eq('id', row.id).single();
    check('desk_messages read-back matches', !selErr && data?.text === 'Test message', data);
    const { error: delErr } = await supabase.from('desk_messages').delete().eq('id', row.id);
    check('desk_messages delete', !delErr, delErr?.message);
  }

  // --- app_meta (singleton upsert, jsonb round-trip) ---
  // Snapshots the REAL row first and restores every touched field back to its
  // exact prior value afterward — this table can hold real production data
  // (it's a single shared row), so this must never assume defaults.
  {
    const before = await supabase.from('app_meta').select('*').eq('id', 'singleton').maybeSingle();
    check('app_meta singleton row exists before test', Boolean(before.data), before.error?.message);
    const priorDayCounter = before.data?.day_counter;
    const priorCleanStreak = before.data?.clean_streak;
    const priorTracker = before.data?.emotional_tracker;

    const testTracker = { feelLevel: 8, sleepLevel: 7, walkOutNotes: '', morningNotes: 'test', updatedAt: 'now' };
    const { error: upErr } = await supabase
      .from('app_meta')
      .upsert({ id: 'singleton', day_counter: 999, clean_streak: 999, emotional_tracker: testTracker }, { onConflict: 'id' });
    check('app_meta upsert', !upErr, upErr?.message);

    const { data, error: selErr } = await supabase.from('app_meta').select('*').eq('id', 'singleton').maybeSingle();
    check(
      'app_meta read-back matches (incl. jsonb emotional_tracker)',
      !selErr && data?.day_counter === 999 && data?.clean_streak === 999 && data?.emotional_tracker?.morningNotes === 'test',
      data
    );

    // restore exactly what was there before this test touched it
    const { error: restoreErr } = await supabase
      .from('app_meta')
      .upsert(
        { id: 'singleton', day_counter: priorDayCounter, clean_streak: priorCleanStreak, emotional_tracker: priorTracker },
        { onConflict: 'id' }
      );
    check('app_meta restored to exact prior values', !restoreErr, restoreErr?.message);

    const { data: verifyRestore } = await supabase.from('app_meta').select('*').eq('id', 'singleton').maybeSingle();
    check(
      'app_meta restore verified',
      verifyRestore?.day_counter === priorDayCounter && verifyRestore?.clean_streak === priorCleanStreak,
      { priorDayCounter, priorCleanStreak, nowDayCounter: verifyRestore?.day_counter, nowCleanStreak: verifyRestore?.clean_streak }
    );
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error('Test script crashed:', e);
  process.exit(1);
});
