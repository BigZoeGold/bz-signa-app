import { BN, BB, CG, BYBIT_ONLY } from '../constants';

const TIMEOUT = 12000;

async function apiGet(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const r = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── Fetch All Pairs from CoinGecko ────────────────────────
export async function fetchAllPairs() {
  const cg = await apiGet(
    `${CG}/coins/markets?vs_currency=usd&order=volume_desc&per_page=250&page=1`
  );
  const cgPairs = cg.map(c => ({
    symbol: c.symbol.toUpperCase() + 'USDT',
    name: c.name,
    price: c.current_price || 0,
    change: c.price_change_percentage_24h || 0,
    source: 'cg',
  }));

  // Fetch commodity pairs from Bybit
  let bybitExtras = [];
  try {
    const br = await apiGet(`${BB}/market/tickers?category=linear`);
    bybitExtras = (br?.result?.list || [])
      .filter(p => BYBIT_ONLY.includes(p.symbol))
      .map(p => ({
        symbol: p.symbol,
        name: p.symbol,
        price: +p.lastPrice || 0,
        change: (+p.price24hPcnt || 0) * 100,
        source: 'bybit',
      }));
  } catch (e) {}

  const bybitSyms = new Set(bybitExtras.map(p => p.symbol));
  return [...bybitExtras, ...cgPairs.filter(p => !bybitSyms.has(p.symbol))];
}

// ─── Fetch Klines ──────────────────────────────────────────
export async function fetchKlines(symbol, interval, limit = 100) {
  if (BYBIT_ONLY.includes(symbol)) return klBybit(symbol, interval, limit);
  try {
    return await klBinance(symbol, interval, limit);
  } catch (e) {
    return klBybit(symbol, interval, limit);
  }
}

async function klBinance(symbol, interval, limit) {
  const d = await apiGet(`${BN}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
  return d.map(c => ({ t: +c[0], o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5] }));
}

async function klBybit(symbol, interval, limit) {
  const im = { '15m': '15', '1h': '60', '4h': '240', '1d': 'D' };
  const d = await apiGet(
    `${BB}/market/kline?category=linear&symbol=${symbol}&interval=${im[interval] || interval}&limit=${limit}`
  );
  return (d?.result?.list || [])
    .map(c => ({ t: +c[0], o: +c[1], h: +c[2], l: +c[3], c: +c[4], v: +c[5] }))
    .reverse();
}
