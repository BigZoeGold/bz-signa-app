import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Share, Clipboard, Animated,
} from 'react-native';
import { C, STRAT_COLORS, STRAT_TAG_BG } from '../constants';
import { fmt } from '../utils/indicators';

export default function AlertsScreen({ alerts, settings, onDismiss, onClearAll, onSendTG }) {
  const visible = alerts.filter(a => !a.dismissed);

  if (!visible.length) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📡</Text>
        <Text style={s.emptyTitle}>Scanner Active</Text>
        <Text style={s.emptySub}>
          6 strategies running on {settings?.watchedPairsCount || 9} pairs.{'\n'}
          Signals fire on confirmed setups.{'\n\n'}
          Min score: <Text style={{ color: C.accent2 }}>{settings?.minScore || 50}</Text>/100
        </Text>
        <View style={s.scanNote}>
          <View style={[s.scanDot, { backgroundColor: C.bull }]} />
          <Text style={s.scanNoteText}>Live — scanning every 30s</Text>
        </View>
      </View>
    );
  }

  async function copyAlert(a) {
    const text = `${a.sym} — ${a.stratName}\nDir: ${a.dir} | TF: ${a.tf} | Session: ${a.session}\nEntry: ${fmt(a.entry)} | SL: ${fmt(a.sl)} | TP: ${fmt(a.tp)} | R:R 1:${a.rr}\nScore: ${a.score}/100${a.posSize ? '\nSize: ' + a.posSize : ''}\n\n${a.desc}`;
    try {
      await Clipboard.setString(text);
    } catch (e) {
      await Share.share({ message: text });
    }
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 12 }}>
      <TouchableOpacity style={s.clearBtn} onPress={onClearAll}>
        <Text style={s.clearBtnTxt}>Clear All</Text>
      </TouchableOpacity>

      {visible.map(a => {
        const sc = a.score;
        const scColor = sc >= 80 ? C.bull : sc >= 65 ? C.accent2 : C.bear;
        const borderColor = STRAT_COLORS[a.stratId] || C.accent;
        const tagBg = STRAT_TAG_BG[a.stratId] || 'rgba(200,151,42,0.15)';
        const time = new Date(a.ts).toLocaleTimeString('en-NG', {
          timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit',
        });
        return (
          <View key={a.id} style={[s.card, { borderLeftColor: borderColor }]}>
            {/* Top Row */}
            <View style={s.cardTop}>
              <Text style={s.sym}>{a.sym}</Text>
              <View style={s.metaRight}>
                <Text style={s.time}>{time} WAT</Text>
                <View style={s.scoreRow}>
                  <Text style={[s.scoreVal, { color: scColor }]}>{sc}</Text>
                  <View style={s.scoreTrack}>
                    <View style={[s.scoreFill, { width: `${sc}%`, backgroundColor: scColor }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Tags */}
            <View style={s.tags}>
              <View style={[s.tag, { backgroundColor: tagBg }]}>
                <Text style={[s.tagTxt, { color: borderColor }]}>{a.stratName}</Text>
              </View>
              <View style={[s.tag, { backgroundColor: a.dir === 'BULL' ? 'rgba(29,184,122,0.12)' : 'rgba(214,56,81,0.12)' }]}>
                <Text style={[s.tagTxt, { color: a.dir === 'BULL' ? C.bull : C.bear }]}>
                  {a.dir === 'BULL' ? '▲ LONG' : '▼ SHORT'}
                </Text>
              </View>
              <View style={[s.tag, { backgroundColor: C.bg4 }]}>
                <Text style={[s.tagTxt, { color: C.tx2 }]}>{a.tf}</Text>
              </View>
              <View style={[s.tag, { backgroundColor: C.bg4 }]}>
                <Text style={[s.tagTxt, { color: C.tx2 }]}>{a.session}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={s.desc}>{a.desc}</Text>

            {/* Prices */}
            <View style={s.priceGrid}>
              <PriceItem label="Entry" value={fmt(a.entry)} color={C.tx} />
              <PriceItem label="Stop Loss" value={fmt(a.sl)} color={C.bear} />
              <PriceItem label="Take Profit" value={fmt(a.tp)} color={C.bull} />
              <PriceItem label="R:R" value={`1:${a.rr}`} color={C.accent2} />
              {a.posSize && <PriceItem label="Size" value={a.posSize} color="#a484e8" />}
            </View>

            {/* Actions */}
            <View style={s.actions}>
              <TouchableOpacity style={[s.btn, s.btnCopy]} onPress={() => copyAlert(a)}>
                <Text style={[s.btnTxt, { color: C.accent2 }]}>📋 Copy</Text>
              </TouchableOpacity>
              {settings?.tgEnabled && (
                <TouchableOpacity style={[s.btn, s.btnTG]} onPress={() => onSendTG(a)}>
                  <Text style={[s.btnTxt, { color: C.s5 }]}>✈ TG</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.btn, s.btnDismiss]} onPress={() => onDismiss(a.id)}>
                <Text style={[s.btnTxt, { color: C.bear }]}>✕ Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function PriceItem({ label, value, color }) {
  return (
    <View style={{ flex: 1, minWidth: '22%' }}>
      <Text style={{ fontSize: 8, fontWeight: '700', color: C.tx3, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
      <Text style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: '600', color, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  empty: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.tx, marginBottom: 8 },
  emptySub: { fontSize: 13, color: C.tx3, textAlign: 'center', lineHeight: 22 },
  scanNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: C.bg2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: C.bd },
  scanDot: { width: 7, height: 7, borderRadius: 4 },
  scanNoteText: { fontSize: 11, color: C.tx2 },
  clearBtn: { alignSelf: 'flex-end', marginBottom: 8, backgroundColor: 'rgba(214,56,81,0.08)', borderWidth: 1, borderColor: 'rgba(214,56,81,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  clearBtnTxt: { fontSize: 11, fontWeight: '700', color: C.bear },
  card: { backgroundColor: C.bg2, borderRadius: 10, borderWidth: 1, borderColor: C.bd, borderLeftWidth: 3, padding: 12, marginBottom: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  sym: { fontSize: 18, fontWeight: '800', color: C.tx },
  metaRight: { alignItems: 'flex-end', gap: 2 },
  time: { fontFamily: 'monospace', fontSize: 10, color: C.tx3 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreVal: { fontFamily: 'monospace', fontSize: 11, fontWeight: '700' },
  scoreTrack: { width: 44, height: 3, backgroundColor: C.bg4, borderRadius: 2, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginBottom: 7 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagTxt: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  desc: { fontSize: 11, color: C.tx2, lineHeight: 18, marginBottom: 9 },
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.bd, marginBottom: 9 },
  actions: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5, borderWidth: 1 },
  btnTxt: { fontSize: 11, fontWeight: '700' },
  btnCopy: { backgroundColor: 'rgba(200,151,42,0.1)', borderColor: 'rgba(200,151,42,0.3)' },
  btnTG: { backgroundColor: 'rgba(33,150,243,0.1)', borderColor: 'rgba(33,150,243,0.25)' },
  btnDismiss: { backgroundColor: 'rgba(214,56,81,0.08)', borderColor: 'rgba(214,56,81,0.2)' },
});
