import { fetchKlines } from './api';
import {
  ema, atr, trend, swingLows, swingHighs, medBody,
  findFVG, detectBOS, detectCHoCH, findOB, calcScore,
} from './indicators';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Sessions (WAT = UTC+1) ────────────────────────────────
export function watHM() {
  const w = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  return w.getHours() * 60 + w.getMinutes();
}
export function isLondon() { const t = watHM(); return t >= 540 && t < 720; }
export function isNY() { const t = watHM(); return t >= 850 && t < 990; }
export function inSession() { return isLondon() || isNY(); }
export function sessionName() { return isLondon() ? 'London' : isNY() ? 'New York' : 'Off-Session'; }
export function watTime() {
  const w = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  return `${String(w.getHours()).padStart(2, '0')}:${String(w.getMinutes()).padStart(2, '0')} WAT`;
}

// ─── Position Size ─────────────────────────────────────────
export function calcPS(entry, sl, balance, risk) {
  const bal = parseFloat(balance) || 0;
  const rsk = parseFloat(risk) || 1;
  const ra = bal * (rsk / 100);
  const pu = Math.abs(entry - sl);
  return ra && pu ? (ra / pu).toFixed(4) : null;
}

// ─── S1 — HTF Clean Entry (runs anytime) ──────────────────
export async function s1(sym, settings) {
  if (!settings.s1) return null;
  try {
    const [k4h, kd, k15] = await Promise.all([
      fetchKlines(sym, '4h', 50),
      fetchKlines(sym, '1d', 30),
      fetchKlines(sym, '15m', 60),
    ]);
    if (!k4h?.length || !kd?.length || !k15?.length) return null;
    const ht = trend(kd), mt = trend(k4h);
    if (ht === 'SIDE' || ht !== mt) return null;
    const dir = ht;
    const sL = swingLows(k4h, 3), sH = swingHighs(k4h, 3);
    const cur = k4h[k4h.length - 1].c, a = atr(k4h) || cur * 0.01;
    let nz = false;
    if (dir === 'BULL' && sL.length && Math.abs(cur - sL[sL.length - 1].price) < a * 2) nz = true;
    if (dir === 'BEAR' && sH.length && Math.abs(cur - sH[sH.length - 1].price) < a * 2) nz = true;
    if (!nz) return null;
    const lc = k15[k15.length - 1], a15 = atr(k15) || cur * 0.005;
    const sb = detectBOS(k15, dir);
    if (!sb) return null;
    const rec = k15.slice(-8);
    let sw = false;
    if (dir === 'BULL') { const lo = Math.min(...rec.slice(0, -2).map(c => c.l)); if (rec.find(c => c.l < lo && c.c > lo)) sw = true; }
    else { const hi = Math.max(...rec.slice(0, -2).map(c => c.h)); if (rec.find(c => c.h > hi && c.c < hi)) sw = true; }
    let entry, sl, tp, rr = 3;
    if (dir === 'BULL') { const z = sL[sL.length - 1].price; entry = z + a15 * .3; sl = z - a15 * .8; tp = entry + (entry - sl) * rr; }
    else { const z = sH[sH.length - 1].price; entry = z - a15 * .3; sl = z + a15 * .8; tp = entry - (sl - entry) * rr; }
    const sc = calcScore({ trendAlign: true, session: inSession(), displacement: sw, rr, volume: lc.v > k15.slice(-20).reduce((a, c) => a + c.v, 0) / 20, structure: sb });
    if (sc < settings.minScore) return null;
    return { sym, dir, stratId: 's-htf', stratName: 'HTF Clean Entry', tf: '15m', entry, sl, tp, rr, score: sc, session: sessionName(), desc: `HTF ${ht} on Daily+4H. Price at ${dir === 'BULL' ? 'demand' : 'supply'} zone.${sw ? ' Liquidity sweep + BOS on 15M.' : ' BOS on 15M confirmed.'}` };
  } catch (e) { return null; }
}

// ─── S2 — Binary Entry NY ─────────────────────────────────
export async function s2(sym, settings) {
  if (!settings.s2 || !isNY()) return null;
  try {
    const [k1h, k15] = await Promise.all([fetchKlines(sym, '1h', 35), fetchKlines(sym, '15m', 50)]);
    if (!k1h?.length || !k15?.length) return null;
    const e20 = ema(k1h.map(c => c.c), 20); if (!e20) return null;
    const cur = k1h[k1h.length - 1].c, longOK = cur > e20, shortOK = cur < e20;
    if (!longOK && !shortOK) return null;
    const pre = k15.slice(0, -10), exec = k15.slice(-10); if (pre.length < 5) return null;
    const preHi = Math.max(...pre.map(c => c.h)), preLo = Math.min(...pre.map(c => c.l));
    const a14 = atr(k15) || cur * 0.003, thresh = Math.max(cur * 0.0005, 0.2 * a14);
    const last = exec[exec.length - 1], prev = exec[exec.length - 2];
    let sd = null;
    if (longOK && prev.l < preLo - thresh && last.c > preLo) sd = 'BULL';
    if (shortOK && prev.h > preHi + thresh && last.c < preHi) sd = 'BEAR';
    if (!sd) return null;
    const mb = medBody(k15.slice(-20)), lb = Math.abs(last.c - last.o);
    if (lb < 1.5 * mb) return null;
    if (sd === 'BULL' && last.c <= last.o) return null;
    if (sd === 'BEAR' && last.c >= last.o) return null;
    const fg = findFVG(k15.slice(-6), sd); if (!fg) return null;
    let sl, tp, rr = 3;
    if (sd === 'BULL') { sl = fg.low - a14 * .5; tp = fg.mid + (fg.mid - sl) * rr; }
    else { sl = fg.high + a14 * .5; tp = fg.mid - (sl - fg.mid) * rr; }
    const sc = calcScore({ trendAlign: true, session: true, displacement: true, rr, volume: last.v > k15.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: true, ob: true });
    if (sc < settings.minScore) return null;
    return { sym, dir: sd, stratId: 's-bin', stratName: 'Binary Entry', tf: '15m', entry: fg.mid, sl, tp, rr, score: sc, session: 'New York', desc: `NY session. ${sd === 'BULL' ? 'Swept pre-NY low' : 'Swept pre-NY high'} with displacement + FVG. Entry at 50% FVG midpoint.` };
  } catch (e) { return null; }
}

// ─── S3 — Liquidity Session Sweep ─────────────────────────
export async function s3(sym, settings) {
  if (!settings.s3 || !inSession()) return null;
  try {
    const [k1h, k15] = await Promise.all([fetchKlines(sym, '1h', 50), fetchKlines(sym, '15m', 60)]);
    if (!k1h?.length || !k15?.length) return null;
    const tr = trend(k1h), lc = k15[k15.length - 1], pc = k15[k15.length - 2], a = atr(k15) || lc.c * 0.005;
    const sL = swingLows(k15.slice(-30), 2), sH = swingHighs(k15.slice(-30), 2);
    let sig = null;
    if (tr !== 'BEAR' && sL.length >= 2) {
      const sz = sL[sL.length - 1].price;
      if (pc.l < sz && pc.c > sz && lc.c > pc.h) {
        const sc = calcScore({ trendAlign: tr === 'BULL', session: true, displacement: true, rr: 2.5, volume: pc.v > k15.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: true });
        if (sc >= settings.minScore) sig = { dir: 'BULL', entry: lc.c, sl: pc.l - a * .3, tp: lc.c + (lc.c - (pc.l - a * .3)) * 2.5, rr: 2.5, score: sc, swept: sz };
      }
    }
    if (!sig && tr !== 'BULL' && sH.length >= 2) {
      const sz = sH[sH.length - 1].price;
      if (pc.h > sz && pc.c < sz && lc.c < pc.l) {
        const sc = calcScore({ trendAlign: tr === 'BEAR', session: true, displacement: true, rr: 2.5, volume: pc.v > k15.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: true });
        if (sc >= settings.minScore) sig = { dir: 'BEAR', entry: lc.c, sl: pc.h + a * .3, tp: lc.c - (pc.h + a * .3 - lc.c) * 2.5, rr: 2.5, score: sc, swept: sz };
      }
    }
    if (!sig) return null;
    return { sym, dir: sig.dir, stratId: 's-liq', stratName: 'Liquidity Sweep', tf: '15m', entry: sig.entry, sl: sig.sl, tp: sig.tp, rr: sig.rr, score: sig.score, session: sessionName(), desc: `${sig.dir === 'BULL' ? 'Bullish' : 'Bearish'} V-shape sweep during ${sessionName()}. Structural confirmation on 15M.` };
  } catch (e) { return null; }
}

// ─── S4 — SMC Structure & POI ─────────────────────────────
export async function s4(sym, settings) {
  if (!settings.s4) return null;
  try {
    const [k4h, k1h, k15] = await Promise.all([fetchKlines(sym, '4h', 60), fetchKlines(sym, '1h', 60), fetchKlines(sym, '15m', 80)]);
    if (!k4h?.length || !k1h?.length || !k15?.length) return null;
    const htfTr = trend(k4h);
    const bos = detectBOS(k4h, 'BULL') || detectBOS(k4h, 'BEAR');
    const choch = detectCHoCH(k4h, htfTr === 'BULL' ? 'BULL' : 'BEAR');
    if (!bos && !choch) return null;
    const dir = htfTr === 'BULL' || (choch && htfTr === 'BEAR') ? 'BULL' : 'BEAR';
    const sw = dir === 'BULL' ? swingLows(k1h.slice(-20), 2) : swingHighs(k1h.slice(-20), 2);
    if (!sw.length) return null;
    const liqLvl = sw[sw.length - 1].price;
    const swept = dir === 'BULL'
      ? k1h.slice(-5).some(c => c.l < liqLvl && c.c > liqLvl)
      : k1h.slice(-5).some(c => c.h > liqLvl && c.c < liqLvl);
    if (!swept) return null;
    const ob = findOB(k1h, dir), fvg = findFVG(k1h.slice(-10), dir);
    if (!ob && !fvg) return null;
    const poi = ob || { low: fvg.low, high: fvg.high, mid: fvg.mid };
    const cur = k1h[k1h.length - 1].c, a1h = atr(k1h) || cur * 0.005;
    if (Math.abs(cur - poi.mid) > a1h * 3) return null;
    const ltfCH = detectCHoCH(k15, dir === 'BULL' ? 'BEAR' : 'BULL');
    if (!ltfCH && trend(k15.slice(-20)) !== dir) return null;
    const a15 = atr(k15) || cur * 0.003;
    let entry, sl, tp, rr = 3;
    if (dir === 'BULL') { entry = cur; sl = (ob ? ob.low : fvg.low) - a15 * .3; tp = entry + (entry - sl) * rr; }
    else { entry = cur; sl = (ob ? ob.high : fvg.high) + a15 * .3; tp = entry - (sl - entry) * rr; }
    const lc15 = k15[k15.length - 1];
    if (dir === 'BULL' && lc15.c < poi.low) return null;
    if (dir === 'BEAR' && lc15.c > poi.high) return null;
    const sc = calcScore({ trendAlign: htfTr === dir, session: inSession(), displacement: swept, rr, volume: lc15.v > k15.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: bos || choch, ob: !!ob });
    if (sc < settings.minScore) return null;
    return { sym, dir, stratId: 's-smc', stratName: 'SMC Structure & POI', tf: '1h/15m', entry, sl, tp, rr, score: sc, session: sessionName(), desc: `${choch ? 'CHoCH' : 'BOS'} on 4H. ${dir === 'BULL' ? 'SSL' : 'BSL'} sweep. ${ob ? 'OB' : 'FVG'} POI confirms.` };
  } catch (e) { return null; }
}

// ─── S5 — ICT Power of Three / AMD ────────────────────────
export async function s5(sym, settings) {
  if (!settings.s5 || !isNY()) return null;
  try {
    const k1h = await fetchKlines(sym, '1h', 48);
    if (!k1h || k1h.length < 12) return null;
    const htfTr = trend(k1h), recent = k1h.slice(-24), asian = recent.slice(0, 8);
    if (asian.length < 4) return null;
    const asHi = Math.max(...asian.map(c => c.h)), asLo = Math.min(...asian.map(c => c.l));
    if (asHi - asLo <= 0) return null;
    const post = recent.slice(8), a = atr(k1h) || asLo * 0.005;
    let mDir = null, mC = null;
    for (const c of post) {
      if (c.l < asLo - a * .3 && c.c > asLo) { mDir = 'BULL'; mC = c; break; }
      if (c.h > asHi + a * .3 && c.c < asHi) { mDir = 'BEAR'; mC = c; break; }
    }
    if (!mDir || !mC) return null;
    if (htfTr !== 'SIDE' && htfTr !== mDir) return null;
    const lc = k1h[k1h.length - 1], mid = (asHi + asLo) / 2;
    if (mDir === 'BULL' && lc.c < mid) return null;
    if (mDir === 'BEAR' && lc.c > mid) return null;
    let entry, sl, tp, rr = 3;
    if (mDir === 'BULL') { entry = lc.c; sl = asLo - a * .5; tp = entry + (entry - sl) * rr; }
    else { entry = lc.c; sl = asHi + a * .5; tp = entry - (sl - entry) * rr; }
    const sc = calcScore({ trendAlign: htfTr === mDir || htfTr === 'SIDE', session: isNY(), displacement: true, rr, volume: lc.v > k1h.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: true });
    if (sc < settings.minScore) return null;
    return { sym, dir: mDir, stratId: 's-amd', stratName: 'ICT Power of Three', tf: '1h', entry, sl, tp, rr, score: sc, session: sessionName(), desc: `AMD Setup. Asian range: ${asLo.toFixed(4)}–${asHi.toFixed(4)}. ${mDir === 'BULL' ? 'False break below' : 'False break above'} confirms NY distribution.` };
  } catch (e) { return null; }
}

// ─── S6 — Supply & Demand RBD/DBR ─────────────────────────
export async function s6(sym, settings) {
  if (!settings.s6) return null;
  try {
    const [k4h, k1h] = await Promise.all([fetchKlines(sym, '4h', 60), fetchKlines(sym, '1h', 80)]);
    if (!k4h?.length || !k1h?.length) return null;
    const a4h = atr(k4h) || k4h[k4h.length - 1].c * 0.01;
    const a1h = atr(k1h) || k1h[k1h.length - 1].c * 0.005;
    let zone = null, dir = null;
    for (let i = 10; i < k4h.length - 2; i++) {
      const body = Math.abs(k4h[i].c - k4h[i].o);
      if (body < 2 * a4h) continue;
      const isBull = k4h[i].c > k4h[i].o;
      let bS = -1, bE = i - 1;
      for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
        if (Math.abs(k4h[j].c - k4h[j].o) < a4h * .7) bS = j; else break;
      }
      if (bS < 0) continue;
      const bc = k4h.slice(bS, bE + 1); if (!bc.length) continue;
      const zH = Math.max(...bc.map(c => c.h)), zL = Math.min(...bc.map(c => c.l));
      const after = k4h.slice(i + 1);
      const unt = isBull ? after.every(c => c.l > zL) : after.every(c => c.h < zH);
      if (!unt) continue;
      zone = { high: zH, low: zL, mid: (zH + zL) / 2 }; dir = isBull ? 'BULL' : 'BEAR'; break;
    }
    if (!zone) return null;
    const cur = k1h[k1h.length - 1].c;
    const near = dir === 'BULL' ? cur >= zone.low - a1h && cur <= zone.high + a1h : cur <= zone.high + a1h && cur >= zone.low - a1h;
    if (!near) return null;
    const lc = k1h[k1h.length - 1], pc = k1h[k1h.length - 2];
    const body = Math.abs(lc.c - lc.o), range = lc.h - lc.l;
    const isPinBar = range > 0 && body / range < 0.4;
    const isEngulf = body > Math.abs(pc.c - pc.o) * 1.5;
    const isConf = (dir === 'BULL' ? lc.c > lc.o : lc.c < lc.o) && (isPinBar || isEngulf);
    if (!isConf) return null;
    let entry, sl, tp, rr = 3;
    if (dir === 'BULL') { entry = lc.c; sl = zone.low - a1h * .4; tp = entry + (entry - sl) * rr; }
    else { entry = lc.c; sl = zone.high + a1h * .4; tp = entry - (sl - entry) * rr; }
    const sc = calcScore({ trendAlign: true, session: inSession(), displacement: isEngulf, rr, volume: lc.v > k1h.slice(-10).reduce((a, c) => a + c.v, 0) / 10, structure: true, ob: true });
    if (sc < settings.minScore) return null;
    return { sym, dir, stratId: 's-snd', stratName: 'Supply & Demand Zone', tf: '4h/1h', entry, sl, tp, rr, score: sc, session: sessionName(), desc: `${dir === 'BULL' ? 'Demand (RBR)' : 'Supply (DBD)'} zone. ${isPinBar ? 'Pin bar' : 'Engulfing candle'} on retest.` };
  } catch (e) { return null; }
}

// ─── Run All Strategies ────────────────────────────────────
export async function runStrategies(sym, settings) {
  const results = await Promise.allSettled([
    s1(sym, settings),
    s2(sym, settings),
    s3(sym, settings),
    s4(sym, settings),
    s5(sym, settings),
    s6(sym, settings),
  ]);
  return results
    .filter(r => r.status === 'fulfilled' && r.value)
    .map(r => r.value);
}

// ─── Full Scan ─────────────────────────────────────────────
export async function runFullScan(watchedPairs, settings, onSignal) {
  for (const sym of watchedPairs) {
    const signals = await runStrategies(sym, settings);
    for (const sig of signals) {
      if (onSignal) onSignal(sig);
    }
    await sleep(400);
  }
}
