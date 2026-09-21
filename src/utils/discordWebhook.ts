import { CompletedTrade } from '../types';

/**
 * Posts a completed trade to a Discord webhook. Fire-and-forget by design —
 * never throws. The trade is always saved locally/to Supabase first; this is
 * called afterward and its failure must never affect that save.
 *
 * accountNames: pass more than one when the same trade was copied to
 * multiple accounts (see the "Copy trade to other accounts" feature) — all
 * of them get listed in this single post instead of posting once per account.
 */
export async function postTradeToDiscord(
  webhookUrl: string,
  trade: CompletedTrade,
  accountNames?: string[]
): Promise<void> {
  try {
    const accounts =
      accountNames && accountNames.length > 0
        ? accountNames.join(', ')
        : trade.accountName || 'Unassigned account';

    const resultLabel = trade.outcome
      ? trade.outcome.charAt(0).toUpperCase() + trade.outcome.slice(1)
      : (trade.pnl || 0) >= 0
      ? 'Winner'
      : 'Loser';

    const isWin = (trade.pnl || 0) >= 0;
    const pnlStr = isWin ? `+$${trade.pnl.toLocaleString()}` : `-$${Math.abs(trade.pnl).toLocaleString()}`;

    const embed: Record<string, unknown> = {
      title: `${trade.symbol || trade.name} — ${resultLabel}`,
      color: isWin ? 0x10b981 : 0xf43f5e,
      fields: [
        { name: 'Account(s)', value: accounts, inline: true },
        { name: 'P&L', value: pnlStr, inline: true },
        { name: 'R Multiple', value: `${trade.rMultiple}R`, inline: true },
      ],
      timestamp: new Date().toISOString(),
    };
    if (trade.notes || trade.memo) {
      embed.description = trade.notes || trade.memo;
    }

    const hasScreenshot = Boolean(trade.screenshotUrl && trade.screenshotUrl.startsWith('data:'));

    if (hasScreenshot) {
      const blob = await (await fetch(trade.screenshotUrl as string)).blob();
      (embed as { image?: { url: string } }).image = { url: 'attachment://screenshot.png' };
      const formData = new FormData();
      formData.append('payload_json', JSON.stringify({ embeds: [embed] }));
      formData.append('files[0]', blob, 'screenshot.png');
      await fetch(webhookUrl, { method: 'POST', body: formData });
    } else {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });
    }
  } catch (e) {
    console.warn('[Discord webhook] post failed (trade was already saved, unaffected):', e);
  }
}
