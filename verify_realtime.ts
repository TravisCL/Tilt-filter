// Verifies Supabase Realtime is actually enabled and delivering change events —
// the core of the cross-device sync fix. Run with: npx tsx verify_realtime.ts
// Subscribes to the same tables the app does, then makes a change via a second
// client (simulating "another device"), and checks the event arrives.

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = readFileSync('.env', 'utf-8');
const env: Record<string, string> = {};
envText.split('\n').forEach((line) => {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const listenerClient = createClient(url, key);
const writerClient = createClient(url, key); // simulates a second device

async function main() {
  let received = false;
  let receivedPayload: any = null;

  const channel = listenerClient.channel('verify-realtime-test');
  channel.on(
    'postgres_changes' as any,
    { event: '*', schema: 'public', table: 'desk_messages' },
    (payload: any) => {
      received = true;
      receivedPayload = payload;
    }
  );

  const subscribeResult: string = await new Promise((resolve) => {
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        resolve(status);
      }
    });
  });

  console.log('Subscription status:', subscribeResult);
  if (subscribeResult !== 'SUBSCRIBED') {
    console.log('FAIL — could not subscribe to realtime channel. Realtime may not be enabled on the project, or enable_realtime.sql was not applied.');
    process.exit(1);
  }

  // give the subscription a moment to fully attach server-side
  await new Promise((r) => setTimeout(r, 1000));

  const testId = `realtime-test-${Date.now()}`;
  console.log('Writing test row from a second client (simulating another device)...');
  const { error: insErr } = await writerClient
    .from('desk_messages')
    .insert({ id: testId, sender: 'BUDDY', time: 'test', text: 'realtime verification ping' });

  if (insErr) {
    console.log('FAIL — could not write test row:', insErr.message);
    process.exit(1);
  }

  // wait up to 5s for the realtime event to arrive
  const deadline = Date.now() + 5000;
  while (!received && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }

  // cleanup regardless of outcome
  await writerClient.from('desk_messages').delete().eq('id', testId);
  listenerClient.removeChannel(channel);

  if (received) {
    console.log('PASS — realtime event received:', receivedPayload?.eventType, receivedPayload?.new?.id);
    console.log('\nRealtime is working. Cross-device sync will work once the app code is live.');
    process.exit(0);
  } else {
    console.log('FAIL — no realtime event arrived within 5s.');
    console.log('This usually means the table was not added to the supabase_realtime publication.');
    console.log('Re-run supabase/enable_realtime.sql in the SQL Editor and try again.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Test script crashed:', e);
  process.exit(1);
});
