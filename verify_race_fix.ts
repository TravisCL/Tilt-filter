// Verifies the FIX for the realtime race condition (see verify_realtime_race_bug.ts
// for the original repro). Simulates the actual timing: a push is debounced 800ms,
// a realtime-triggered pull is debounced 500ms and now must wait for any pending
// push before it's allowed to pull — reproducing App.tsx's real waitForPendingPush()
// logic against the live database.
//
// Run with: npx tsx verify_race_fix.ts

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envText.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const testTradeId = `race-fix-test-${Date.now()}`;

// --- Reimplementation of the FIXED scheduleSupabasePush / waitForPendingPush from supabaseSync.ts ---
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight: Promise<void> | null = null;

function scheduleSupabasePush(row: any) {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushInFlight = Promise.resolve(supabase.from('trades').upsert(row, { onConflict: 'id' }))
      .then(() => undefined)
      .finally(() => {
        pushInFlight = null;
      });
  }, 800);
}

async function waitForPendingPush(): Promise<void> {
  while (pushTimer !== null) {
    await new Promise((r) => setTimeout(r, 50));
  }
  if (pushInFlight) await pushInFlight;
}
// --- end reimplementation ---

async function main() {
  console.log('Step 1: write PRE-TILT trade.');
  const preTilt = {
    id: testTradeId, order_number: 1, timestamp: '2:00 PM', date: '2026-09-16',
    planned_status: 'planned', quality: 'A', symbol: 'MNQ', risk_dollars: 100, risk_percent: 10,
    pnl: -100, r_multiple: -1, rules_held: true, name: 'Race fix test trade',
    emotional_state: 'fine',
    checklist_answers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
  };
  await supabase.from('trades').insert(preTilt);

  console.log('Step 2: local tilt admission -> schedules a push (800ms debounce), same as the real app.');
  const postTilt = { ...preTilt, emotional_state: 'frustrated' };
  scheduleSupabasePush(postTilt);

  console.log('Step 3: 100ms later, an unrelated action triggers a realtime event -> pull debounced 500ms.');
  await new Promise((r) => setTimeout(r, 100));
  console.log('   (at this point the push has NOT fired yet — pushTimer is still pending)');

  console.log('Step 4: pull handler now does what the fix requires: await waitForPendingPush() BEFORE pulling.');
  const pullStart = Date.now();
  await waitForPendingPush();
  console.log(`   waitForPendingPush() resolved after ${Date.now() - pullStart}ms (waited for the 800ms push to land)`);

  const { data: pulledRows } = await supabase.from('trades').select('*').eq('id', testTradeId);
  const finalState = pulledRows?.[0]?.emotional_state;
  console.log(`   Pulled AFTER waiting: trade.emotional_state = "${finalState}"`);

  console.log('\n--- Cleanup ---');
  await supabase.from('trades').delete().eq('id', testTradeId);

  console.log('\n=== VERDICT ===');
  if (finalState === 'frustrated') {
    console.log('FIX CONFIRMED: waiting for the pending push before pulling means the pull now');
    console.log('always reflects our own latest write. The tilt is no longer lost.');
    process.exit(0);
  } else {
    console.log(`FIX DID NOT WORK — expected "frustrated", got "${finalState}".`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error('Script crashed:', e);
  await supabase.from('trades').delete().eq('id', testTradeId);
  process.exit(1);
});
