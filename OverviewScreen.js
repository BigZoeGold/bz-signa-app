import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { C } from '../constants';
import { fmt } from '../utils/indicators';
import { isLondon, isNY } from '../utils/scanner';

export default function OverviewScreen({ alerts, settings, allPairs, watchedPairs, pairData }) {
  const active = alerts.filter(a => !a.dismissed);
  const bull = active.filter(a => a.dir === 'BULL');
  const avgSc = active.length ? Math.round(active.reduce((s, a) => s + a.score, 0) / active.length) : 0;
  const lon = isLondon(), ny = isNY();
  const activeStrats = ['s1', 's2', 's3', 's4', 's5', 's6'].filter(k => settings[k]).length;

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 12 }}>
      {/* Stats Grid */}
      <View style={s.grid}>
        <StatCard label="Active Alerts" value={active.length} sub={`${bull.length} long · ${active.length - bull.length} short`} />
        <StatCard label="Avg Score" value={avgSc || '—'} sub={`Min: ${settings.minScore}`} valueColor={avgSc >= 50 ? C.bull : C.accent2} />
        <StatCard label="Watching" value={watchedPairs.length} sub={`of ${allPairs.length} total`} />
        <StatCard
          label="Session"
          value={lon ? '🇬🇧 London' : ny ? '🇺🇸 NY' : '⏸ Closed'}
          sub={lon ? '09:00–12:00 WAT' : ny ? '14:10–16:30 WAT' : 'Next: London 09:00'}
          valueStyle={{ fontSize: 13 }}
        />
        <StatCard label="Strategies" value={`${activeStrats}/6`} sub="active" />
        <StatCard
          label="Telegram"
          value={settings.tgEnabled ? '🟢 On' : '⭕ Off'}
          sub={settings.tgEnabled ? 'Sending alerts' : 'Configure in settings'}
          valueStyle={{ fontSize: 13 }}
        />
      </View>

      {/* Watched Pairs */}
      <Text style={s.sectionTitle}>📌 Watched Pairs</Text>
      {watchedPairs.map(sym => {
        const pd = pairData[sym] || {};
        const price = pd.price || allPairs.find(p => p.symbol === sym)?.price || 0;
        const chg = pd.change || 0;
        const als = active.filter(a => a.sym === sym);
        return (
          <View key={sym} style={s.pairRow}>
            <View>
              <Text style={s.pairSym}>{sym.replace('USDT', '')} <Text style={{ fontSize: 9, color: C.tx3 }}>USDT</Text></Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 3 }}>
              <Text style={[s.pairPrice, { color: chg >= 0 ? C.bull : C.bear }]}>
                {fmt(price)} <Text style={{ fontSize: 9 }}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</Text>
              </Text>
              <View style={{ flexDirection: 'row', gap: 3, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {als.length === 0 && <Text style={{ fontSize: 9, color: C.tx3 }}>Scanning…</Text>}
                {als.some(a => a.stratId === 's-htf') && <StratBadge label="HTF" color="#c8972a" bg="rgba(200,151,42,0.15)" />}
                {als.some(a => a.stratId === 's-bin') && <StratBadge label="BIN" color="#1db87a" bg="rgba(29,184,122,0.12)" />}
                {als.some(a => a.stratId === 's-liq') && <StratBadge label="LIQ" color="#a484e8" bg="rgba(124,92,191,0.15)" />}
                {als.some(a => a.stratId === 's-smc') && <StratBadge label="SMC" color="#e05c3a" bg="rgba(224,92,58,0.15)" />}
                {als.some(a => a.stratId === 's-amd') && <StratBadge label="AMD" color="#2196f3" bg="rgba(33,150,243,0.15)" />}
                {als.some(a => a.stratId === 's-snd') && <StratBadge label="S&D" color="#d4a017" bg="rgba(212,160,23,0.15)" />}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function StatCard({ label, value, sub, valueColor, valueStyle }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statVal, { color: valueColor || C.tx }, valueStyle]}>{value}</Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

function StratBadge({ label, color, bg }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 3 }}>
      <Text style={{ fontSize: 8, fontWeight: '700', color, textTransform: 'uppercase' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  statCard: { backgroundColor: C.bg2, borderRadius: 10, borderWidth: 1, borderColor: C.bd, padding: 11, width: '47%', flexGrow: 1 },
  statLabel: { fontSize: 9, fontWeight: '700', color: C.tx3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  statVal: { fontFamily: 'monospace', fontSize: 20, fontWeight: '600' },
  statSub: { fontSize: 9, color: C.tx3, marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: '700', color: C.tx3, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 8 },
  pairRow: { backgroundColor: C.bg2, borderRadius: 8, borderWidth: 1, borderColor: C.bd, padding: 10, marginBottom: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pairSym: { fontSize: 13, fontWeight: '800', color: C.tx },
  pairPrice: { fontFamily: 'monospace', fontSize: 11, fontWeight: '600' },
});
