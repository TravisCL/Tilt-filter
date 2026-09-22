// Verifies postAoiToDiscord's request shape and its "never throws" guarantee,
// by mocking global fetch — does not hit a real Discord webhook.
// Run with: npx tsx verify_aoi_webhook.ts

import { postAoiToDiscord } from './src/utils/discordWebhook';

let pass = 0;
let fail = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
  ok ? pass++ : fail++;
}

async function main() {
  console.log('=== 1. Posts JSON embed with direction/entry/exit/account ===');
  {
    let capturedUrl = '';
    let capturedBody: any = null;
    (global as any).fetch = async (url: string, options?: any) => {
      capturedUrl = url;
      capturedBody = JSON.parse(options.body);
      return { ok: true };
    };

    await postAoiToDiscord('https://discord.test/webhook/aoi', {
      symbol: 'MNQ',
      direction: 'LONG',
      entryPrice: 19850,
      exitPrice: 19900,
      accountName: 'Vanraj-test',
      note: 'Sunday gap fill setup',
    });

    check('posted to the VIP webhook URL', capturedUrl, 'https://discord.test/webhook/aoi');
    check('title mentions AOI and the symbol', capturedBody.embeds[0].title.includes('AOI') && capturedBody.embeds[0].title.includes('MNQ'), true);
    check('LONG direction uses green', capturedBody.embeds[0].color, 0x10b981);
    check('fields include Direction/Entry/Exit/Account', capturedBody.embeds[0].fields.map((f: any) => f.name), ['Direction', 'Entry', 'Exit', 'Account']);
    check('note becomes the description', capturedBody.embeds[0].description, 'Sunday gap fill setup');
  }

  console.log('\n=== 2. SHORT direction uses red, omits absent fields ===');
  {
    let capturedBody: any = null;
    (global as any).fetch = async (_url: string, options?: any) => {
      capturedBody = JSON.parse(options.body);
      return { ok: true };
    };

    await postAoiToDiscord('https://discord.test/webhook/aoi', {
      direction: 'SHORT',
      entryPrice: 19900,
    });

    check('SHORT direction uses red', capturedBody.embeds[0].color, 0xf43f5e);
    check('only Direction and Entry fields present (no exit/account)', capturedBody.embeds[0].fields.map((f: any) => f.name), ['Direction', 'Entry']);
    check('no description when no note given', capturedBody.embeds[0].description, undefined);
  }

  console.log('\n=== 3. Never throws on network failure ===');
  {
    (global as any).fetch = async () => {
      throw new Error('network down');
    };
    let threw = false;
    try {
      await postAoiToDiscord('https://discord.test/webhook/aoi', { direction: 'LONG' });
    } catch {
      threw = true;
    }
    check('swallowed the network error, never threw', threw, false);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main();
