# BigZoe Signal Tracker — React Native App

## Test Instantly (No Terminal, No PC)

### Option A — Expo Snack (Test on Phone Now)
1. Go to **snack.expo.dev** on your phone browser
2. Delete the default files
3. Create each file listed below and paste the code
4. Install **Expo Go** from Play Store
5. Scan the QR code — app runs immediately on your phone

Files to create in Snack:
- `App.js`
- `src/constants.js`
- `src/utils/storage.js`
- `src/utils/indicators.js`
- `src/utils/api.js`
- `src/utils/scanner.js`
- `src/utils/telegram.js`
- `src/screens/AlertsScreen.js`
- `src/screens/OverviewScreen.js`
- `src/screens/SettingsScreen.js`

### Option B — GitHub + EAS Build (Get APK)
1. Go to **github.com** → New repository → name it `bz-signal-tracker`
2. Upload all these files (drag and drop in browser)
3. Go to **expo.dev** → Create account → New Project → Connect GitHub
4. Run EAS Build → downloads APK directly
5. Install APK on your Android phone

## Features
- 6 SMC/ICT strategies
- Background scanning (every 15 min when app is closed)
- Push notifications on every signal
- Telegram alerts
- Firebase sync
- Bottom tab navigation
- Dark amber/gold theme

## Strategies
1. **HTF Clean Entry** — 4H/Daily bias, 15M structure, runs anytime
2. **Binary Entry** — NY session, EMA filter, FVG entry
3. **Liquidity Sweep** — London/NY V-shape reversals
4. **SMC Structure & POI** — 5-phase: BOS/CHoCH → Liquidity → OB/FVG → LTF CHoCH
5. **ICT Power of Three** — AMD: Asian range → Manipulation → NY distribution
6. **Supply & Demand Zone** — RBD/DBR explosive origin zones

## Background Scanning
- Foreground: scans every 30 seconds while app is open
- Background: scans every 15 minutes via expo-background-fetch (Android minimum)
- Push notifications fire even when app is closed
- Telegram fires on every signal
