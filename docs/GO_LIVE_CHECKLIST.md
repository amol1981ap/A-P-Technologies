# Go-live checklist (do in this order)

Backend: https://supabase.com/dashboard/project/bdghrsdaueqvnvsgtxmy

## Part 1 · Supabase dashboard (about 10 minutes)
1. **Setup code.** Left sidebar > Edge Functions > Secrets (or /functions/secrets). Add new secret: Name `SETUP_CODE`, Value = any code you choose (8+ characters, keep private). Save.
2. **Turn off public sign-up.** Authentication > Sign In / Providers (or /auth/providers) > User Signups > switch off "Allow new users to sign up". Save. (Team members are still added from inside the app: More > Team.)
3. **Minimum password length 8.** Same page > Email > Minimum password length = 8. Save.
4. **Delete leftover test photos.** Storage > bucket `delivery-proofs` > select all files > Delete. Same for `task-proofs`.
5. **Plan.** Settings > Billing (or Organization > Billing). Free projects pause after about a week of no use. Choose Pro before real data goes in. Database > Backups: confirm daily backups are on.

## Part 2 · GitHub (2 minutes)
Reconnect at https://claude.ai/customize/connectors?auth_start=github&auth_start_force=1 so the code can be pushed. Needed to publish the web app and for backup.

## Part 3 · Things to send
- Logo: square PNG, 1024 x 1024, and a version on a transparent background (for the Android icon).
- Any weight corrections (kg per metre) and the product sizes you do not sell.
- Names, mobile numbers and roles of your team (sales, despatch, factory).
- Domain name, if you want one for the website.

## Part 4 · After the app is published
1. Open the app link on your phone. Tap "Business owner? First-time setup".
2. Setup code (Part 1 step 1), name Amol K Patil, your mobile number or email, password (8+ characters). Tap Create owner account.
3. Optional: delete the `SETUP_CODE` secret afterwards.
4. Today > "Get set up":
   - Company details: email, bank name, account number, IFSC, standard quote terms, other cost per metre. Phone and WhatsApp are already saved.
   - Products and rates: tap the four quick-start buttons (straight and bent-up, sand-coated and ribbed). Check each rate and weight. Switch off sizes you do not sell.
   - Team: add each person with mobile number, role and a first password.
5. More > Parties: add customers and suppliers.
6. Factory > Receive material: enter opening resin and roving stock.
7. Create a test lead, quote and order, then delete nothing: real data starts when you start.

## Part 5 · Android APK (you run this on your computer)
1. Install Node.js (LTS).
2. `npm install -g eas-cli`
3. `eas login` (your Expo account)
4. In the `app` folder: `eas init`, then `eas build -p android --profile preview`
5. Open the link EAS prints when the build finishes and install the APK on each phone.

## Part 6 · Your CA confirms
HSN 70193900 and 18% GST, invoice number format APT/26-27/0001, place of supply, input credit on supplier bills.
