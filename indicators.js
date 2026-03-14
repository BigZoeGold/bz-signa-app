// ─── EMA ───────────────────────────────────────────────────
export function ema(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let e = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    e = closes[i] * k + e * (1 - k);
  }
  return e;
}

// ─── ATR ───────────────────────────────────────────────────
export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const trs = candles.slice(1).map((c, i) =>
    Math.max(c.h - c.l, Math.abs(c.h - candles[i].c), Math.abs(c.l - candles[i].c))
  );
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

// ─── Trend ─────────────────────────────────────────────────
export function trend(candles) {
  if (candles.length < 10) return 'SIDE';
  const r = candles.slice(-10);
  let bull = 0, bear = 0;
  for (let i = 1; i < r.length; i++) {
    if (r[i].h > r[i - 1].h) bull++; else bear++;
    if (r[i].l > r[i - 1].l) bull++; else bear++;
  }
  return bull > bear * 1.3 ? 'BULL' : bear > bull * 1.3 ? 'BEAR' : 'SIDE';
}

// ─── Swing Lows ────────────────────────────────────────────
export function swingLows(candles, lb = 2) {
  const out = [];
  for (let i = lb; i < candles.length - lb; i++) {
    let ok = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i - j].l <= candles[i].l || candles[i + j].l <= candles[i].l) {
        ok = false; break;
      }
    }
    if (ok) out.push({ idx: i, price: candles[i].l });
  }
  return out;
}

// ─── Swing Highs ───────────────────────────────────────────
export function swingHighs(candles, lb = 2) {
  const out = [];
  for (let i = lb; i < candles.length - lb; i++) {
    let ok = true;
    for (let j = 1; j <= lb; j++) {
      if (candles[i - j].h >= candles[i].h || candles[i + j].h >= candles[i].h) {
        ok = false; break;
      }
    }
    if (ok) out.push({ idx: i, price: candles[i].h });
  }
  return out;
}

// ─── Median Body ───────────────────────────────────────────
export function medBody(candles) {
  const bodies = candles.map(c => Math.abs(c.c - c.o)).sort((a, b) => a - b);
  return bodies[Math.floor(bodies.length / 2)] || 0;
}

// ─── Fair Value Gap ────────────────────────────────────────
export function findFVG(candles, dir) {
  for (let i = candles.length - 4; i < candles.length - 2; i++) {
    if (i < 0) continue;
    if (dir === 'BULL' && candles[i + 2].l > candles[i].h) {
      return { low: candles[i].h, high: candles[i + 2].l, mid: (candles[i].h + candles[i + 2].l) / 2 };
    }
    if (dir === 'BEAR' && candles[i + 2].h < candles[i].l) {
      return { low: candles[i + 2].h, high: candles[i].l, mid: (candles[i + 2].h + candles[i].l) / 2 };
    }
  }
  return null;
}

// ─── Break of Structure ────────────────────────────────────
export function detectBOS(candles, dir) {
  if (candles.length < 5) return false;
  const sw = dir === 'BULL'
    ? swingHighs(candles.slice(0, -1), 2)
    : swingLows(candles.slice(0, -1), 2);
  if (!sw.length) return false;
  const ls = sw[sw.length - 1].price;
  const lc = candles[candles.length - 1];
  if (dir === 'BULL') return Math.min(lc.o, lc.c) < ls && lc.c > ls;
  return Math.max(lc.o, lc.c) > ls && lc.c < ls;
}

// ─── Change of Character ───────────────────────────────────
export function detectCHoCH(candles, prevDir) {
  if (candles.length < 6) return false;
  const lc = candles[candles.length - 1];
  if (prevDir === 'BEAR') {
    const lh = swingHighs(candles.slice(0, -1), 2);
    return lh.length && lc.c > lh[lh.length - 1].price;
  }
  if (prevDir === 'BULL') {
    const ll = swingLows(candles.slice(0, -1), 2);
    return ll.length && lc.c < ll[ll.length - 1].price;
  }
  return false;
}

// ─── Order Block ───────────────────────────────────────────
export function findOB(candles, dir) {
  for (let i = candles.length - 3; i >= Math.max(0, candles.length - 20); i--) {
    const isOpp = dir === 'BULL' ? candles[i].c < candles[i].o : candles[i].c > candles[i].o;
    if (!isOpp) continue;
    const after = candles.slice(i + 1, i + 4);
    if (!after.length) continue;
    const disp = Math.abs(after[after.length - 1].c - candles[i].c);
    const a = atr(candles.slice(Math.max(0, i - 10), i + 1)) || candles[i].c * 0.005;
    if (disp > a * 1.5) {
      return { high: candles[i].h, low: candles[i].l, mid: (candles[i].h + candles[i].l) / 2 };
    }
  }
  return null;
}

// ─── Score ─────────────────────────────────────────────────
export function calcScore({ trendAlign, session, displacement, rr, volume, structure, ob }) {
  let s = 0;
  if (trendAlign) s += 25;
  if (session) s += 20;
  if (displacement) s += 15;
  if (rr >= 4) s += 20; else if (rr >= 3) s += 15; else if (rr >= 2) s += 10; else if (rr >= 1.5) s += 5;
  if (volume) s += 10;
  if (structure) s += 5;
  if (ob) s += 5;
  return Math.min(s, 100);
}

// ─── Price Format ──────────────────────────────────────────
export function fmt(p) {
  if (!p || isNaN(p)) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.001) return p.toFixed(6);
  return p.toFixed(8);
}
