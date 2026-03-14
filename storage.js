import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { FB_CONFIG, DEFAULT_SETTINGS, DEFAULT_PAIRS } from '../constants';

// ─── Firebase Init ─────────────────────────────────────────
let db = null;
try {
  const app = getApps().length === 0 ? initializeApp(FB_CONFIG) : getApps()[0];
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase init failed:', e.message);
}

export const fbReady = () => !!db;

// ─── Firebase Helpers ──────────────────────────────────────
async function fbSet(path, data) {
  if (!db) return;
  try {
    const ref = doc(db, path);
    await setDoc(ref, data, { merge: true });
  } catch (e) {
    console.warn('fbSet error:', e.message);
  }
}

async function fbGet(path) {
  if (!db) return null;
  try {
    const ref = doc(db, path);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    return null;
  }
}

// ─── Load All Data ─────────────────────────────────────────
export async function loadData(uid) {
  let watchedPairs = [...DEFAULT_PAIRS];
  let settings = { ...DEFAULT_SETTINGS };
  let alerts = [];

  // Try local first (fast)
  try {
    const lw = await AsyncStorage.getItem('bz_w');
    const ls = await AsyncStorage.getItem('bz_s');
    const la = await AsyncStorage.getItem('bz_a');
    if (lw) watchedPairs = JSON.parse(lw);
    if (ls) settings = { ...DEFAULT_SETTINGS, ...JSON.parse(ls) };
    if (la) alerts = JSON.parse(la);
  } catch (e) {}

  // Override with Firebase if available
  if (db && uid) {
    try {
      const userData = await fbGet(`users/${uid}`);
      if (userData) {
        if (userData.watchedPairs) watchedPairs = userData.watchedPairs;
        if (userData.settings) settings = { ...DEFAULT_SETTINGS, ...userData.settings };
      }
      const q = query(
        collection(db, `users/${uid}/alerts`),
        orderBy('ts', 'desc'),
        limit(80)
      );
      const snap = await getDocs(q);
      const fbAlerts = [];
      snap.forEach(d => fbAlerts.push(d.data()));
      if (fbAlerts.length) alerts = fbAlerts;
    } catch (e) {
      console.warn('Firebase load error:', e.message);
    }
  }

  return { watchedPairs, settings, alerts };
}

// ─── Save Settings + Pairs ─────────────────────────────────
export async function saveData(uid, watchedPairs, settings) {
  try {
    await AsyncStorage.setItem('bz_w', JSON.stringify(watchedPairs));
    await AsyncStorage.setItem('bz_s', JSON.stringify(settings));
  } catch (e) {}
  if (db && uid) {
    await fbSet(`users/${uid}`, {
      watchedPairs,
      settings,
      updatedAt: Date.now(),
    });
  }
}

// ─── Save Single Alert ─────────────────────────────────────
export async function saveAlert(uid, alert, allAlerts) {
  try {
    await AsyncStorage.setItem('bz_a', JSON.stringify(allAlerts.slice(0, 80)));
  } catch (e) {}
  if (db && uid) {
    try {
      await fbSet(`users/${uid}/alerts/${alert.id}`, alert);
    } catch (e) {}
  }
}

// ─── Dismiss Alert in Firebase ─────────────────────────────
export async function dismissAlert(uid, alertId) {
  if (db && uid) {
    try {
      await fbSet(`users/${uid}/alerts/${alertId}`, { dismissed: true });
    } catch (e) {}
  }
}

// ─── Clear All Local ───────────────────────────────────────
export async function clearLocal() {
  try {
    await AsyncStorage.multiRemove(['bz_w', 'bz_s', 'bz_a', 'bz_u']);
  } catch (e) {}
}
