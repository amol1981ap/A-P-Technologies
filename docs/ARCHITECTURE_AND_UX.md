# Control Centre — Technology Architecture & UX Principles

## 1. Goal
Build once, run everywhere: **Android (APK / Play Store), iPhone (App Store), web browser, and laptop/PC**, all from **one codebase**, fast, and ready to produce an installable app file whenever it's needed.

## 2. Recommended Stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native) + Expo Router**, TypeScript | One codebase produces native Android, native iOS and a web app. These are real native apps, not wrapped websites. |
| App builds | **EAS Build** | Produces an `.apk` (direct install), `.aab` (Play Store) or `.ipa` (App Store / TestFlight) with one command, usually in 10–20 minutes. |
| Instant updates | **EAS Update (over-the-air)** | Bug fixes and small changes reach every phone without a new store release. |
| Web / laptop | Same app exported to web, installable as a PWA | Works on any PC browser and can be pinned like an app. A Windows/Mac desktop app can be added later with Tauri if needed. |
| Backend | **Supabase**: PostgreSQL, Auth, Storage, Realtime, Edge Functions | A fast, proven database with row-level security for roles, file storage for certificates and photos, and live updates on dashboards. |
| Offline | Local SQLite cache with background sync | The shop floor and site visits often have weak network. Entries save offline and sync later. |
| Data fetching | TanStack Query | Instant screens from the cache, with background refresh. |
| Validation | Zod schemas shared by app and server | The same rules on the phone and in the database. |
| Notifications | Expo push notifications + WhatsApp Business API | Overdue alerts, approvals, daily summary. |
| Accounting | Tally integration (sync, not replacement) | No disruption to GST and statutory books. |

### Code structure (monorepo)
```
control-centre/
  apps/app/            ← Expo app (Android, iOS, web)
  packages/ui/         ← design system: tokens, buttons, cards, lists, forms
  packages/core/       ← types, Zod schemas, business rules (pricing, costing, KPIs)
  supabase/            ← database migrations, security policies, edge functions
```

### What "give me the app file anytime" means in practice
- **Android:** an APK can be built at any time and installed directly on any Android phone. Nothing else is required.
- **iPhone:** Apple doesn't allow direct installs. Distribution goes through **TestFlight** (internal testing) or the App Store, and needs an Apple Developer account (USD 99/year).
- **Play Store:** needs a Google Play Console account (one-time USD 25).
- **PC/laptop:** the web app, installable from the browser.

## 3. UX Principles (Apple-style, minimal)

1. **One screen, one job.** Each screen answers one question: "What do I do today?", "Where is this project?", "How did my shift go?"
2. **The role decides the home screen.** A salesperson opens on *My Day*, the production supervisor on *Shift Log*, the owner on *Cockpit*. Nobody sees modules they don't use.
3. **Calm by default; colour only for meaning.** A white and light-grey base with a single blue for actions. Orange is reserved for overdue or at-risk items, and green for done.
4. **Large, thumb-friendly controls.** Every tap target is at least 44 px. Numbers are entered with numeric keypads and choices are made with big buttons, which keeps typing to a minimum.
5. **Under 60 seconds per entry.** Fields are auto-filled (date, user, line, batch) and drafts save automatically.
6. **Every item shows owner, due date and status** on its own line.
7. **Plain words.** "Close shift", "Log update", "Submit today's report". No jargon or codes.
8. **Typography carries the hierarchy:** big bold titles, quiet grey labels, plenty of white space, no borders where spacing will do.
9. **Mobile layout first, then desktop:** tabs at the bottom on phones, a sidebar on laptops.
10. **Light and dark mode** follow the phone's own setting.

## 4. UI Samples
The interactive canvas holds four sample screens:
1. Owner Cockpit (desktop)
2. Sales — Projects board with approval path (desktop)
3. My Day: tasks and daily report (phone)
4. Shift Log: production entry (phone)
