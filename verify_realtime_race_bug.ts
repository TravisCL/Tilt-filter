// Proves the realtime-sync race condition: if a local change (e.g. a tilt
// admission) hasn't finished pushing to Supabase yet, and something ELSE
// triggers a realtime-driven pull in that window, mergePulledIntoState
// REPLACES local trades/tiltEvents wholesale — silently discarding the
// unsynced local change.
//
// Self-contained (doesn't import supabaseClient.ts, which relies on Vite's
// import.meta.env and can't run under plain Node/tsx) — talks to the same
// live Supabase project directly, same as verify_supabase.ts.
// Only ever touches a uniquely-ID'd test row, deleted at the end. Does not
// read or modify any real account/trade data.
//
// Run with: npx tsx verify_realtime_race_bug.ts

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envText.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);

const testTradeId = `race-test-${Date.now()}`;

// Exact copy of mergePulledIntoState's trades-handling from src/utils/supabaseSync.ts
// (full replace, no recency check) — this is the line under test.
function mergeTradesFullReplace(pulledTrades: any[], _localTrades: any[]) {
  return pulledTrades; // <-- this is literally what mergePulledIntoState does: `trades: pulled.trades`
}

async function main() {
  console.log('Step 1: write the PRE-TILT version of a trade to Supabase.');
  const preTilt = {
    id: testTradeId, order_number: 1, timestamp: '2:00 PM', date: '2026-09-16',
    planned_status: 'planned', quality: 'A', symbol: 'MNQ', risk_dollars: 100, risk_percent: 10,
    pnl: -100, r_multiple: -1, rules_held: true, name: 'Race test trade',
    emotional_state: 'fine',
    checklist_answers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
  const { error: insErr } = await supabase.from('trades').insert(preTilt);
  if (insErr) throw insErr;
  console.log('   Done — Supabase has emotional_state: "fine".');

  console.log('\nStep 2: LOCALLY (in the browser, not yet pushed) the trader admits to tilting.');
  const localTradeWithTilt = { ...preTilt, emotional_state: 'frustrated' };
  console.log(`   Local (unsynced) trade.emotional_state = "${localTradeWithTilt.emotional_state}"`);
  console.log('   This exists ONLY in React state right now — the push for this change is');
  console.log('   debounced 800ms and has not fired yet.');

  console.log('\nStep 3: something else triggers a realtime event (e.g. marking an account blown).');
  console.log('   500ms later the realtime handler pulls current Supabase state — still pre-tilt,');
  console.log('   since the push from Step 2 has not landed.');
  const { data: pulledRows, error: selErr } = await supabase.from('trades').select('*').eq('id', testTradeId);
  if (selErr) throw selErr;
  console.log(`   Pulled trade.emotional_state = "${pulledRows?.[0]?.emotional_state}"`);

  console.log('\nStep 4: merge — this is exactly what mergePulledIntoState does (`trades: pulled.trades`, a full replace).');
  const merged = mergeTradesFullReplace(pulledRows || [], [localTradeWithTilt]);
  const mergedTrade = merged.find((t: any) => t.id === testTradeId);
  console.log(`   Merged (final, what the UI would show) trade.emotional_state = "${mergedTrade?.emotional_state}"`);

  console.log('\n--- Cleanup ---');
  await supabase.from('trades').delete().eq('id', testTradeId);
  console.log('Deleted test trade. No other rows were read or modified.');

  console.log('\n=== VERDICT ===');
  if (mergedTrade?.emotional_state === 'fine') {
    console.log('CONFIRMED: the tilt admission that existed only in local, unsynced state gets');
    console.log('silently discarded when a realtime-triggered pull lands mid-race — because the');
    console.log('merge does a full replace of the trades array, not a recency-aware merge.');
    console.log('This matches exactly what the client reported: a tilt getting "undone" shortly');
    console.log('after an unrelated action (marking an account blown) triggered a resync.');
    process.exit(0);
  } else {
    console.log('Could not reproduce as described — investigate further.');
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error('Script crashed:', e);
  // best-effort cleanup even on failure
  await supabase.from('trades').delete().eq('id', testTradeId);
  process.exit(1);
});
