# Phase 0: what is done and what you do next

## Done
- Database (Supabase, Mumbai region) with roles, rate card visible only to the owner, parties, and the lead → quote → order → despatch → invoice → payment tables. The security advisor reports no issues.
- Edge functions `setup-owner` (one-time owner account) and `team` (owner adds people, sets roles, resets passwords).
- App: sign-in with mobile number or email, waiting-for-access screen, role-based tabs, and More screens for Products & rates, Parties, Team and Company details.
- Tested end to end against the real database: wrong password rejected, owner sets a rate, despatch person signs in by mobile number and cannot see rates, Team or Money.
- All test data was deleted. The database is empty and ready for your real data.

## You do (about 10 minutes)

### 1. Set the setup code (so the owner account can be created)
Supabase dashboard → project `control-centre` → Edge Functions → Secrets → add `SETUP_CODE` with any code you choose (8+ characters). Keep it private. It is only used once.

### 2. Build the first Android APK yourself
Run on your laptop (needs Node 20+). Your Expo token is never shared.

```bash
cd app
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:apk
```

When the build finishes, Expo shows a download link for the `.apk`. Open it on an Android phone to install.

The public database address and key are in `app/.env`, which is committed, so the build picks them up. Before the first store upload, add them in Expo (Project → Environment variables) as well.

### 3. Create the owner account
Open the app → **First time? Set up the owner account** → enter the setup code, your name, your mobile number and a password.

### 4. Add your business details (More tab)
1. Company details: name, GSTIN, address, bank.
2. Products & rates: each diameter and surface, HSN code, rate per metre, GST %.
3. Team: add your despatch person and applicator with their mobile numbers.
4. Parties: add your main customers and suppliers.

## Still open
- The code is committed locally but not pushed to GitHub, because the push is refused. Reconnect GitHub at https://claude.ai/connect-github.
- Replace the placeholder Expo icon and splash image with your logo before any store release.
- Confirm HSN codes and GST rates with your CA.
