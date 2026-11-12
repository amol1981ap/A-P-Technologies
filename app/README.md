# Control Centre app

One codebase builds the **Android app (APK / Play Store)**, the **iPhone app (TestFlight / App Store)** and the **web app** (browser on laptop or PC, installable).

- Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · Expo Router · React Compiler on
- Design: Style D tokens in `src/constants/theme.ts` (spec in `../docs/DESIGN_SYSTEM.md`)
- Scope v1: GFRP rebars only

## Structure
```
src/app/            screens (one file = one screen): index (Today), leads, orders, factory, money
src/components/     ui.tsx (Card, Button, Chip, Meter…), app-tabs (native tabs) / app-tabs.web (web bar)
src/constants/      theme.ts (colours, fonts, spacing), tabs.ts
src/data/sample.ts  sample data, replaced by the database in Phase 0
eas.json            build profiles: development, preview (APK), production (Play/App Store)
```

## Run
```bash
npm install
npm run web        # in a browser
npm start          # scan the QR code with the Expo Go app on a phone
```

## Checks
```bash
npm run typecheck
npm run lint
npm run export:web   # production web build into dist/
```

## Getting app files
Builds run in Expo's cloud (EAS). No Android Studio or Mac is needed. One-time setup: a free Expo account, then `npx eas-cli@latest login`.

| You want | Command | Output | Time |
|---|---|---|---|
| Android file to install directly | `npm run build:apk` | `.apk` download link | ~10–20 min |
| Play Store upload | `npm run build:android` | `.aab` | ~15–25 min |
| iPhone (TestFlight / App Store) | `npm run build:ios` | `.ipa` | ~15–25 min, needs Apple Developer account (USD 99/yr) |
| Laptop / PC | `npm run export:web`, then host `dist/` | web app | ~1 min |

Small fixes can reach installed phones without a new build using `npx eas-cli@latest update`.

iPhones do not allow installing an app file directly. They use TestFlight or the App Store.

## Before store release
- Replace the placeholder Expo icon and splash image in `assets/images/` with the A P Technologies logo.
- Bundle ID / package: `in.aptechnologies.controlcentre`. Change it before the first store upload if you prefer another one.
