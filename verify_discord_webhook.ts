// Verifies postTradeToDiscord's request shape and its "never throws / never
// blocks the trade save" guarantee, by mocking global fetch — does not hit
// a real Discord webhook.
// Run with: npx tsx verify_discord_webhook.ts

import { postTradeToDiscord } from './src/utils/discordWebhook';
import { CompletedTrade } from './src/types';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

function makeTrade(overrides: Partial<CompletedTrade>): CompletedTrade {
  return {
    id: 't1', orderNumber: 1, timestamp: '9:00 AM', date: '2026-09-21', plannedStatus: 'planned',
    quality: 'A', symbol: 'MNQ', riskDollars: 100, riskPercent: 10, pnl: 50, rMultiple: 0.5,
    rulesHeld: true, name: 'test', accountName: 'Test Acct', outcome: 'winner',
    checklistAnswers: { rule1: true, rule2: true, rule3: true, q4CalculatedRisk: true, q5NotFomo: true },
    ...overrides,
  };
}

async function main() {
  console.log('=== 1. No screenshot — posts JSON embed ===');
  {
    let capturedUrl = '';
    let capturedOptions: any = null;
    (global as any).fetch = async (url: string, options: any) => {
      capturedUrl = url;
      capturedOptions = options;
      return { ok: true } as Response;
    };

    await postTradeToDiscord('https://discord.com/api/webhooks/fake/test', makeTrade({}));
    check('posts to the given webhook URL', capturedUrl, 'https://discord.com/api/webhooks/fake/test');
    check('uses JSON content-type', capturedOptions.headers['Content-Type'], 'application/json');
    const body = JSON.parse(capturedOptions.body);
    check('embed title includes symbol + result', body.embeds[0].title, 'MNQ — Winner');
    check('embed account field', body.embeds[0].fields[0].value, 'Test Acct');
  }

  console.log('\n=== 2. Multiple accounts (copied trade) — listed in one post ===');
  {
    let body: any = null;
    (global as any).fetch = async (_url: string, options: any) => {
      body = JSON.parse(options.body);
      return { ok: true } as Response;
    };
    await postTradeToDiscord('https://discord.com/api/webhooks/fake/test', makeTrade({}), ['Account A', 'Account B']);
    check('accounts field lists both, comma-separated', body.embeds[0].fields[0].value, 'Account A, Account B');
  }

  console.log('\n=== 3. Fetch throws (network down) — never propagates, resolves cleanly ===');
  {
    (global as any).fetch = async () => {
      throw new Error('network down');
    };
    let threw = false;
    try {
      await postTradeToDiscord('https://discord.com/api/webhooks/fake/test', makeTrade({}));
    } catch {
      threw = true;
    }
    check('does not throw even when the network call fails', threw, false);
  }

  console.log('\n=== 4. Loser trade gets rose color, correct P&L sign ===');
  {
    let body: any = null;
    (global as any).fetch = async (_url: string, options: any) => {
      body = JSON.parse(options.body);
      return { ok: true } as Response;
    };
    await postTradeToDiscord('https://discord.com/api/webhooks/fake/test', makeTrade({ pnl: -75, outcome: 'loser' }));
    check('loser color is rose (0xf43f5e)', body.embeds[0].color, 0xf43f5e);
    check('P&L field shows negative sign', body.embeds[0].fields[1].value, '-$75');
  }

  console.log('\n=== 5. Trade with a screenshot — posts multipart/form-data with the image attached ===');
  {
    let sawFormDataPost = false;
    let sawDataUrlFetch = false;
    const tinyPngDataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    (global as any).fetch = async (url: string, options?: any) => {
      if (url === tinyPngDataUrl) {
        sawDataUrlFetch = true;
        // Minimal Response-like object with .blob()
        return { blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }) } as any;
      }
      if (options?.body instanceof FormData) {
        sawFormDataPost = true;
        return { ok: true } as Response;
      }
      return { ok: true } as Response;
    };

    await postTradeToDiscord('https://discord.com/api/webhooks/fake/test', makeTrade({ screenshotUrl: tinyPngDataUrl }));
    check('data URL was fetched to convert to a blob', sawDataUrlFetch, true);
    check('final webhook post used multipart FormData (file attachment)', sawFormDataPost, true);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
