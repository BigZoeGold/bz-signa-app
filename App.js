import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StatusBar, AppState, Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { C, DEFAULT_SETTINGS, DEFAULT_PAIRS, BG_TASK, SCAN_INTERVAL_MS } from './src/constants';
import { loadData, saveData, saveAlert, dismissAlert, clearLocal, fbReady } from './src/utils/storage';
import { fetchAllPairs } from './src/utils/api';
import { runFullScan, watTime } from './src/utils/scanner';
import { sendTelegram } from './src/utils/telegram';
import { calcPS } from './src/utils/scanner';

import AlertsScreen from './src/screens/AlertsScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ─── Notifications Setup ───────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ─── Background Task ───────────────────────────────────────
TaskManager.defineTask(BG_TASK, async () => {
  try {
    const w = await AsyncStorage.getItem('bz_w');
    const st = await AsyncStorage.getItem('bz_s');
    const watchedPairs = w ? JSON.parse(w) : DEFAULT_PAIRS;
    const settings = st ? { ...DEFAULT_SETTINGS, ...JSON.parse(st) } : DEFAULT_SETTINGS;
    const cooldowns = {};

    await runFullScan(watchedPairs, settings, async (sig) => {
      const key = sig.sym + '_' + sig.stratId;
      if (cooldowns[key]) return;
      cooldowns[key] = true;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${sig.dir === 'BULL' ? '🟢' : '🔴'} ${sig.sym} — ${sig.stratName}`,
          body: `Entry: ${sig.entry?.toFixed(4)} | Score: ${sig.score}/100`,
          data: { signal: sig },
        },
        trigger: null,
      });
    });
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// ─── Navigation ────────────────────────────────────────────
const Tab = createBottomTabNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg, card: C.bg2, text: C.tx, border: C.bd, primary: C.accent },
};

// ─── Cooldowns store ───────────────────────────────────────
const cooldowns = {};
const COOL_MS = 20 * 60 * 1000;
function isCooled(sym, stratId) {
  const k = sym + '_' + stratId;
  return !cooldowns[k] || Date.now() - cooldowns[k] > COOL_MS;
}
function setCool(sym, stratId) { cooldowns[sym + '_' + stratId] = Date.now(); }

// ─── APP ───────────────────────────────────────────────────
export default function App() {
  const [user] = useState({ name: 'BigZoe', initials: 'BZ' });
  const uid = 'local_user';

  const [alerts, setAlerts] = useState([]);
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [watchedPairs, setWatchedPairs] = useState([...DEFAULT_PAIRS]);
  const [allPairs, setAllPairs] = useState([]);
  const [pairData, setPairData] = useState({});
  const [lastScanTime, setLastScanTime] = useState('');
  const [alertBadge, setAlertBadge] = useState(0);

  const scanInterval = useRef(null);
  const appState = useRef(AppState.currentState);

  // ─── Boot ─────────────────────────────────────────────────
  useEffect(() => {
    boot();
    setupNotifications();
    setupBackground();

    const sub = AppState.addEventListener('change', handleAppState);
    return () => { sub.remove(); clearInterval(scanInterval.current); };
  }, []);

  async function boot() {
    const data = await loadData(uid);
    setWatchedPairs(data.watchedPairs);
    setSettings(data.settings);
    setAlerts(data.alerts);
    updateBadge(data.alerts);
    await refreshPairs();
    startForegroundScan(data.watchedPairs, data.settings);
  }

  // ─── App State ────────────────────────────────────────────
  function handleAppState(nextState) {
    if (appState.current.match(/inactive|background/) && nextState === 'active') {
      refreshPairs();
    }
    appState.current = nextState;
  }

  // ─── Notifications ────────────────────────────────────────
  async function setupNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') console.warn('Notification permission not granted');
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('signals', {
        name: 'Signal Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: C.accent,
      });
    }
  }

  // ─── Background Fetch ─────────────────────────────────────
  async function setupBackground() {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await BackgroundFetch.registerTaskAsync(BG_TASK, {
          minimumInterval: 15 * 60, // 15 min (Android minimum)
          stopOnTerminate: false,
          startOnBoot: true,
        });
      }
    } catch (e) {
      console.warn('Background fetch setup:', e.message);
    }
  }

  // ─── Pairs ────────────────────────────────────────────────
  async function refreshPairs() {
    try {
      const pairs = await fetchAllPairs();
      setAllPairs(pairs);
      const pd = {};
      pairs.forEach(p => { pd[p.symbol] = { price: p.price, change: p.change, source: p.source }; });
      setPairData(pd);
    } catch (e) {}
  }

  // ─── Foreground Scanner ───────────────────────────────────
  function startForegroundScan(pairs, stg) {
    clearInterval(scanInterval.current);
    scan(pairs, stg);
    scanInterval.current = setInterval(() => {
      refreshPairs();
      scan(pairs, stg);
    }, SCAN_INTERVAL_MS);
  }

  async function scan(pairs, stg) {
    await runFullScan(pairs, stg, async (sig) => {
      if (!isCooled(sig.sym, sig.stratId)) return;
      setCool(sig.sym, sig.stratId);
      const ps = calcPS(sig.entry, sig.sl, stg.balance, stg.risk);
      const al = { ...sig, id: 'al_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), ts: Date.now(), posSize: ps, dismissed: false };
      setAlerts(prev => {
        const next = [al, ...prev].slice(0, 100);
        updateBadge(next);
        saveAlert(uid, al, next);
        return next;
      });
      // Push notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${sig.dir === 'BULL' ? '🟢' : '🔴'} ${sig.sym} — ${sig.stratName}`,
          body: `Entry: ${sig.entry?.toFixed(4)} | Score: ${sig.score}/100 | R:R 1:${sig.rr}`,
          data: { id: al.id },
          channelId: 'signals',
        },
        trigger: null,
      });
      // Telegram
      sendTelegram(al, stg);
    });
    setLastScanTime(watTime());
  }

  function updateBadge(alertList) {
    const n = alertList.filter(a => !a.dismissed).length;
    setAlertBadge(n);
    Notifications.setBadgeCountAsync(n);
  }

  // ─── Handlers ─────────────────────────────────────────────
  async function handleDismiss(id) {
    setAlerts(prev => {
      const next = prev.map(a => a.id === id ? { ...a, dismissed: true } : a);
      updateBadge(next);
      return next;
    });
    await dismissAlert(uid, id);
  }

  function handleClearAll() {
    setAlerts([]);
    updateBadge([]);
    setAlertBadge(0);
  }

  async function handleSaveSettings(newStg) {
    setSettings(newStg);
    await saveData(uid, watchedPairs, newStg);
    clearInterval(scanInterval.current);
    startForegroundScan(watchedPairs, newStg);
  }

  async function handleReset() {
    await clearLocal();
    setAlerts([]);
    setSettings({ ...DEFAULT_SETTINGS });
    setWatchedPairs([...DEFAULT_PAIRS]);
    setAlertBadge(0);
  }

  async function handleForceScan() {
    await scan(watchedPairs, settings);
  }

  async function handleSendTG(alert) {
    await sendTelegram(alert, settings);
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <NavigationContainer theme={NavTheme}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarStyle: {
            backgroundColor: C.bg2,
            borderTopColor: C.bd,
            borderTopWidth: 1,
            paddingBottom: 6,
            paddingTop: 4,
            height: 60,
          },
          tabBarActiveTintColor: C.accent2,
          tabBarInactiveTintColor: C.tx3,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
          headerStyle: { backgroundColor: C.bg2, borderBottomColor: C.bd, borderBottomWidth: 1 },
          headerTitleStyle: { color: C.tx, fontWeight: '800', fontSize: 15 },
          headerTintColor: C.accent,
          tabBarIcon: ({ color, size }) => {
            const icons = { Alerts: '🚨', Overview: '📊', Settings: '⚙️' };
            return <Text style={{ fontSize: size - 2 }}>{icons[route.name]}</Text>;
          },
          tabBarBadge: route.name === 'Alerts' && alertBadge > 0 ? alertBadge : undefined,
          tabBarBadgeStyle: { backgroundColor: C.bear, fontSize: 9, minWidth: 16, height: 16 },
        })}
      >
        <Tab.Screen name="Alerts" options={{ title: '🚨 BigZoe Signals', headerTitle: 'BigZoe Signal Tracker' }}>
          {() => (
            <AlertsScreen
              alerts={alerts}
              settings={{ ...settings, watchedPairsCount: watchedPairs.length }}
              onDismiss={handleDismiss}
              onClearAll={handleClearAll}
              onSendTG={handleSendTG}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Overview" options={{ title: 'Overview' }}>
          {() => (
            <OverviewScreen
              alerts={alerts}
              settings={settings}
              allPairs={allPairs}
              watchedPairs={watchedPairs}
              pairData={pairData}
            />
          )}
        </Tab.Screen>

        <Tab.Screen name="Settings" options={{ title: 'Settings' }}>
          {() => (
            <SettingsScreen
              settings={settings}
              onSave={handleSaveSettings}
              onReset={handleReset}
              onSignOut={handleReset}
              onForceScan={handleForceScan}
              lastScanTime={lastScanTime}
              user={user}
              fbReady={fbReady()}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
