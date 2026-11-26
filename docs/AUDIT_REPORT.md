# Audit before deployment (all phases)

## Checked
- **Security (real logins for all 4 roles + anonymous):** sales cannot see rates, invoices, payments, purchases or spend; despatch and factory cannot see any prices; nobody can promote their own role; anonymous visitors see nothing. Advisor: no issues.
- **Business rules:** unpriced quote cannot be sent; payments cannot exceed balance or be zero/negative; paid invoice cannot be cancelled; issued invoice is frozen; PO cannot be received without a supplier bill number; despatch delivered flips the order to Delivered.
- **Maths:** GST split (CGST+SGST / IGST), rounding to the rupee, amount in words, financial-year numbering, margin.
- **Screens:** every screen for every role loads with no errors; first-day experience on an empty system.

## Fixed in this audit
1. Sales could change GST % on lines (only the rate was locked). Now owner-only in the database.
2. Any team member could edit orders. Now owner and sales only.
3. One despatch could be invoiced twice. Now blocked.
4. Nobody could change their own password (owner forgetting it meant lock-out). Added More › Change password.
5. Flash of "Waiting for access" right after sign-in; bad network at start looked like "no access". Fixed with a spinner and a clear "could not reach the server" message.
6. Today list showed only 8 items with no way to see the rest (a 9th overdue payment was invisible). Added "Show all".
7. Dates used UTC, wrong between midnight and 5:30 am (production date, prospects due). Now local date.
8. Order creation from a quote left an empty order behind if saving lines failed. Now rolled back.
9. Shared PDFs had random file names; CA sheet was pasted text. Now named (Q-0001.pdf) and a real CSV file.
10. iOS keyboard could cover fields; "One Rupees" wording.
11. Day-one help: "Get set up" checklist on the owner's Today; one-tap "add standard sizes" for products.

## Known limits (not changed)
- No push notifications: reminders and "Needs you" show only when the app is opened.
- Stock may go negative if usage is entered above stock; releasing more than stock only warns.
- If an order has the same product on two lines at different rates, the invoice uses the first rate.
- Public website form: same phone within a day is merged; no other spam limit.
- Dates assume India time.

## Pricing changed to per kg (owner decision after the audit)
- Rate is ₹ per kg (₹150/kg onwards), GST 18% additional, HSN 70193900 (defaults on every new product).
- Production, stock and despatch stay in metres. Kg on a quote, order or invoice = metres × weight per metre.
- Each product has a weight per metre (typical estimate: 2,100 kg/m³ × cross-section, e.g. 0.2375 kg/m for 12 mm). The owner corrects it per product in More › Products & rates.
- Each quote, order and invoice line stores the weight at the time, so changing a product's weight never changes an old document. Sales cannot override it.
- Quotation and invoice PDFs show weight, ₹/kg, amount and GST; the GFRP-vs-steel table uses the product's weight.
- Billing uses nominal weight, not a weighed figure. If bars are weighed at despatch, an "actual weight" entry can be added.

## Weights and bent-up bars
- Weight per metre: owner's table is the plain (ribbed) bar: 8 mm 0.105, 10 mm 0.158, 12 mm 0.23, 16 mm 0.41, 18 mm 0.506, 20 mm 0.625, 22 mm 0.756, 24 mm 0.900 kg/m. Sand-coated adds 0.010 kg/m (12 mm sand-coated = 0.24).
- Bent-up bars are separate products (shape: straight / bent-up), starting at ₹180/kg versus ₹150/kg straight, GST 18%. Weight per metre is the same as the straight bar of that surface. Batch numbers end in B (261121-12SB).
- Quick start adds a size set in one tap with those starting rates; the owner can change any rate or weight.

## Website documents and logo (from the owner's brochure and presentation)
- Logo: AP crest taken from the brochure. Website logo and favicon, and all app icons (icon, Android adaptive, monochrome, splash) now use it. High-resolution copy: docs/assets-ap-logo-1024.png.
- Website Documents section shows four published government documents exactly as issued: MoRTH circular dated 30 August 2022 (File No. RW/NH-34049/01/2020-S&R (P&B)pt.), IRC:137-2022 Table 3.1, IS 18256:2023 (BIS, October 2023), Karnataka PWD SR 2023-24 Vol. 3 item 9.3.
- Not shown, needs the owner: A P Technologies' own test reports, any BIS licence number, Udyam/GST certificates, and permission to name customer projects.
