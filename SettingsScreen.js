import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Switch, TextInput,
  TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { C, DEFAULT_SETTINGS } from '../constants';
import { testTelegram } from '../utils/telegram';

export default function SettingsScreen({ settings, onSave, onReset, onSignOut, onForceScan, lastScanTime, user, fbReady }) {
  const [local, setLocal] = useState({ ...settings });
  const [dirty, setDirty] = useState(false);
  const [tgTesting, setTgTesting] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => { setLocal({ ...settings }); setDirty(false); }, [settings]);

  function set(key, val) { setLocal(p => ({ ...p, [key]: val })); setDirty(true); }

  async function handleSave() { await onSave(local); setDirty(false); }

  async function handleTestTG() {
    setTgTesting(true);
    const ok = await testTelegram(local);
    setTgTesting(false);
    Alert.alert(ok ? '✅ Success' : '❌ Failed', ok ? 'Test signal sent to your Telegram bot!' : 'Check your bot token and chat ID.');
  }

  async function handleScan() {
    setScanning(true);
    await onForceScan();
    setScanning(false);
  }

  function handleReset() {
    Alert.alert('Reset All Data', 'This clears all alerts, settings and watched pairs. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: onReset },
    ]);
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: onSignOut },
    ]);
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>

      {/* STRATEGIES */}
      <Section title="🔬 Strategies">
        <StratRow label="◈ HTF Clean Entry" sub="4H/Daily bias · 15M structure · runs anytime" color={C.s1} value={local.s1} onChange={v => set('s1', v)} />
        <StratRow label="◈ Binary Entry" sub="NY session only · EMA filter · FVG entry" color={C.s2} value={local.s2} onChange={v => set('s2', v)} />
        <StratRow label="◈ Liquidity Sweep" sub="London/NY sessions · V-shape reversals" color={C.s3} value={local.s3} onChange={v => set('s3', v)} />
        <StratRow label="◈ SMC Structure & POI" sub="5-phase: BOS/CHoCH → Liquidity → OB/FVG → LTF CHoCH" color={C.s4} value={local.s4} onChange={v => set('s4', v)} />
        <StratRow label="◈ ICT Power of Three" sub="AMD: Asian range → Manipulation → NY distribution" color={C.s5} value={local.s5} onChange={v => set('s5', v)} />
        <StratRow label="◈ Supply & Demand Zone" sub="RBD/DBR explosive zones with retest confirmation" color={C.s6} value={local.s6} onChange={v => set('s6', v)} />
      </Section>

      {/* TELEGRAM */}
      <Section title="📡 Telegram Alerts">
        <Row label="Enable Telegram" sub="Auto-fires on every signal when on">
          <Switch value={local.tgEnabled} onValueChange={v => set('tgEnabled', v)} trackColor={{ true: C.bull, false: C.bg5 }} thumbColor={C.tx} />
        </Row>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Bot Token</Text>
          <TextInput style={s.textInput} value={local.tgToken || ''} onChangeText={v => set('tgToken', v)} placeholder="1234567890:ABCdef..." placeholderTextColor={C.tx3} autoCapitalize="none" autoCorrect={false} />
        </View>
        <View style={s.fieldGroup}>
          <Text style={s.fieldLabel}>Chat ID</Text>
          <TextInput style={s.textInput} value={local.tgChatId || ''} onChangeText={v => set('tgChatId', v)} placeholder="123456789" placeholderTextColor={C.tx3} keyboardType="numeric" />
        </View>
        <Text style={s.helpText}>Get token: <Text style={{ color: C.s5 }}>@BotFather</Text> → /newbot{'\n'}Get chat ID: <Text style={{ color: C.s5 }}>@myidbot</Text> → /getid</Text>
      </Section>

      {/* SIGNAL QUALITY */}
      <Section title="📊 Signal Quality">
        <View style={s.sliderRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowLabel}>Min Signal Score</Text>
            <Text style={s.rowSub}>Lower = more signals · Higher = cleaner setups</Text>
          </View>
          <Text style={[s.sliderVal, { color: C.accent2 }]}>{local.minScore}</Text>
        </View>
        <Slider
          style={{ width: '100%', height: 36 }}
          minimumValue={30} maximumValue={95} step={1}
          value={local.minScore}
          onValueChange={v => set('minScore', Math.round(v))}
          minimumTrackTintColor={C.accent}
          maximumTrackTintColor={C.bg5}
          thumbTintColor={C.accent2}
        />
      </Section>

      {/* RISK */}
      <Section title="💰 Risk Engine">
        <Row label="Account Balance (USDT)" sub="Auto-calculates position size per alert">
          <TextInput style={[s.textInput, { width: 100, textAlign: 'right' }]} value={String(local.balance || '')} onChangeText={v => set('balance', v)} placeholder="500" placeholderTextColor={C.tx3} keyboardType="numeric" />
        </Row>
        <Row label="Risk per Trade %" sub="% of balance risked per signal">
          <TextInput style={[s.textInput, { width: 70, textAlign: 'right' }]} value={String(local.risk || '')} onChangeText={v => set('risk', parseFloat(v) || 1)} placeholder="1" placeholderTextColor={C.tx3} keyboardType="decimal-pad" />
        </Row>
      </Section>

      {/* SESSION FILTERS */}
      <Section title="⏰ Session Filters">
        <Row label="London Only" sub="09:00–12:00 WAT">
          <Switch value={local.londonOnly} onValueChange={v => set('londonOnly', v)} trackColor={{ true: C.bull, false: C.bg5 }} thumbColor={C.tx} />
        </Row>
        <Row label="New York Only" sub="14:10–16:30 WAT">
          <Switch value={local.nyOnly} onValueChange={v => set('nyOnly', v)} trackColor={{ true: C.bull, false: C.bg5 }} thumbColor={C.tx} />
        </Row>
      </Section>

      {/* DEBUG */}
      <Section title="🧪 Debug & Test">
        <Row label="Test Telegram" sub="Sends a fake signal to verify your bot">
          <TouchableOpacity style={[s.btn, s.btnTG]} onPress={handleTestTG} disabled={tgTesting}>
            <Text style={[s.btnTxt, { color: C.s5 }]}>{tgTesting ? '…' : '✈ Send Test'}</Text>
          </TouchableOpacity>
        </Row>
        <Row label="Force Scan Now" sub="Runs all 6 strategies immediately">
          <TouchableOpacity style={[s.btn, s.btnGreen]} onPress={handleScan} disabled={scanning}>
            <Text style={[s.btnTxt, { color: C.bull }]}>{scanning ? 'Scanning…' : '▶ Scan Now'}</Text>
          </TouchableOpacity>
        </Row>
        <View style={s.scanStatus}>
          <View style={[s.scanDot, { backgroundColor: C.bull }]} />
          <Text style={s.scanStatusTxt}>{lastScanTime ? `Last scan: ${lastScanTime}` : 'Not scanned yet'}</Text>
        </View>
      </Section>

      {/* ACCOUNT */}
      <Section title="☁ Account">
        <Row label={user?.name || 'BigZoe'} sub={`${user?.email || 'Local session'} · ${fbReady ? 'Firebase ✓' : 'Local only'}`}>
          <TouchableOpacity style={[s.btn, s.btnRed]} onPress={handleSignOut}>
            <Text style={[s.btnTxt, { color: C.bear }]}>Sign Out</Text>
          </TouchableOpacity>
        </Row>
        <Row label="Reset All Data" sub="Clears alerts, settings, watched pairs">
          <TouchableOpacity style={[s.btn, s.btnRed]} onPress={handleReset}>
            <Text style={[s.btnTxt, { color: C.bear }]}>Reset</Text>
          </TouchableOpacity>
        </Row>
      </Section>

      {/* SAVE */}
      {dirty && (
        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
          <Text style={s.saveBtnTxt}>💾 Save Settings</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, sub, children }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {children}
    </View>
  );
}

function StratRow({ label, sub, color, value, onChange }) {
  return (
    <View style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, { color }]}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.bull, false: C.bg5 }} thumbColor={C.tx} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  section: { backgroundColor: C.bg2, borderRadius: 10, borderWidth: 1, borderColor: C.bd, padding: 12, marginBottom: 10 },
  sectionTitle: { fontSize: 9, fontWeight: '700', color: C.tx3, textTransform: 'uppercase', letterSpacing: 0.9, paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: C.bd },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 4 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: C.tx },
  rowSub: { fontSize: 10, color: C.tx3, marginTop: 2, lineHeight: 15 },
  fieldGroup: { paddingVertical: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.tx2, marginBottom: 5 },
  textInput: { backgroundColor: C.bg3, borderWidth: 1, borderColor: C.bd2, borderRadius: 5, padding: 8, fontFamily: 'monospace', fontSize: 12, color: C.tx },
  helpText: { fontSize: 10, color: C.tx3, lineHeight: 18, marginTop: 4 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sliderVal: { fontFamily: 'monospace', fontSize: 16, fontWeight: '700', minWidth: 28, textAlign: 'right' },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5, borderWidth: 1 },
  btnTxt: { fontSize: 11, fontWeight: '700' },
  btnTG: { backgroundColor: 'rgba(33,150,243,0.1)', borderColor: 'rgba(33,150,243,0.25)' },
  btnGreen: { backgroundColor: 'rgba(29,184,122,0.1)', borderColor: 'rgba(29,184,122,0.25)' },
  btnRed: { backgroundColor: 'rgba(214,56,81,0.08)', borderColor: 'rgba(214,56,81,0.2)' },
  scanStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  scanDot: { width: 6, height: 6, borderRadius: 3 },
  scanStatusTxt: { fontSize: 10, color: C.tx3 },
  saveBtn: { backgroundColor: C.accent, borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  saveBtnTxt: { fontSize: 14, fontWeight: '800', color: '#fff' },
});
