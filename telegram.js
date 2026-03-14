import { fmt } from './indicators';

export async function sendTelegram(alert, settings) {
  const { tgEnabled, tgToken, tgChatId } = settings;
  if (!tgEnabled) return;
  const token = tgToken?.trim();
  const chatId = tgChatId?.trim();
  if (!token || !chatId) return;

  const dir = alert.dir === 'BULL' ? '🟢 LONG' : '🔴 SHORT';
  const msg = [
    `🚨 *BigZoe Signal Alert*`, ``,
    `*${alert.sym}* — ${alert.stratName}`,
    `Direction: ${dir}`,
    `Timeframe: ${alert.tf} | Session: ${alert.session}`,
    `Score: ${alert.score}/100`, ``,
    `📍 *Entry:* \`${fmt(alert.entry)}\``,
    `🛑 *Stop Loss:* \`${fmt(alert.sl)}\``,
    `🎯 *Take Profit:* \`${fmt(alert.tp)}\``,
    `📊 *R:R:* 1:${alert.rr}`,
    alert.posSize ? `📦 *Size:* \`${alert.posSize}\`` : '',
    ``, `💬 _${alert.desc}_`,
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      }
    );
    const d = await r.json();
    return d.ok;
  } catch (e) {
    return false;
  }
}

export async function testTelegram(settings) {
  return sendTelegram({
    sym: 'BTCUSDT',
    dir: 'BULL',
    stratName: 'HTF Clean Entry',
    tf: '15m',
    session: 'London',
    score: 85,
    entry: 65000,
    sl: 64200,
    tp: 67400,
    rr: 3,
    posSize: '0.0123',
    desc: 'TEST signal from BigZoe Signal Tracker — Telegram is working! 🎉',
  }, settings);
}
