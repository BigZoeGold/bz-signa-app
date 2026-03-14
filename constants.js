// ═══════════════════════════════════════
// COLORS
// ═══════════════════════════════════════
export const C = {
  bg: '#0a0a0a',
  bg2: '#111111',
  bg3: '#1a1a1a',
  bg4: '#222222',
  bg5: '#2a2a2a',
  bd: '#2a2a2a',
  bd2: '#333333',
  tx: '#f0ece4',
  tx2: '#a89880',
  tx3: '#5a5040',
  accent: '#c8972a',
  accent2: '#e8b84b',
  bull: '#1db87a',
  bear: '#d63851',
  s1: '#c8972a',
  s2: '#1db87a',
  s3: '#7c5cbf',
  s4: '#e05c3a',
  s5: '#2196f3',
  s6: '#d4a017',
};

// ═══════════════════════════════════════
// FIREBASE CONFIG
// ═══════════════════════════════════════
export const FB_CONFIG = {
  apiKey: 'AIzaSyCjR_gbOPoDbiOIG4gDvnPep7CRVnrZjvk',
  authDomain: 'signal-tracker-884bf.firebaseapp.com',
  projectId: 'signal-tracker-884bf',
  storageBucket: 'signal-tracker-884bf.firebasestorage.app',
  messagingSenderId: '513381967595',
  appId: '1:513381967595:web:c83d7a03c1616f629fc0ae',
};

// ═══════════════════════════════════════
// APP CONFIG
// ═══════════════════════════════════════
export const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'DOGEUSDT', 'PIXELUSDT',
  'PLAYSOUTUSDT', 'FARTCOINUSDT', 'WHITEWHALEUSDT',
  'NAS100USDT', 'XAGUSDTUSDT',
];

export const BYBIT_ONLY = ['NAS100USDT', 'XAGUSDTUSDT', 'XAUUSDT'];

export const BN = 'https://api.binance.com/api/v3';
export const BB = 'https://api.bybit.com/v5';
export const CG = 'https://api.coingecko.com/api/v3';

export const SCAN_INTERVAL_MS = 30000; // 30 seconds
export const COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes

export const BG_TASK = 'BZ_SIGNAL_SCAN';

export const DEFAULT_SETTINGS = {
  minScore: 50,
  s1: true, s2: true, s3: true, s4: true, s5: true, s6: true,
  londonOnly: false, nyOnly: false,
  balance: '',
  risk: 1,
  tgEnabled: false,
  tgToken: '',
  tgChatId: '',
};

export const STRAT_COLORS = {
  's-htf': '#c8972a',
  's-bin': '#1db87a',
  's-liq': '#7c5cbf',
  's-smc': '#e05c3a',
  's-amd': '#2196f3',
  's-snd': '#d4a017',
};

export const STRAT_TAG_BG = {
  's-htf': 'rgba(200,151,42,0.15)',
  's-bin': 'rgba(29,184,122,0.12)',
  's-liq': 'rgba(124,92,191,0.15)',
  's-smc': 'rgba(224,92,58,0.15)',
  's-amd': 'rgba(33,150,243,0.15)',
  's-snd': 'rgba(212,160,23,0.15)',
};
