# Phase 3: Demand engine (first slice)

## What it does
- **Growth view** (Leads tab → Growth). For This month, 90 days or All time:
  - leads, quotes, orders won and order value;
  - a breakdown **by source** (leads, hot, quoted, orders, value), **by campaign**, and **consultants who bring work**;
  - one plain sentence on what the numbers say. It says "too few leads to compare" until there are enough to be fair.
- **Cost per lead and per order (owner only).** The owner enters each month's spend by source. Sales never see spend.
- **Website tracking.** Ad and post links carry `utm_source` and `utm_campaign`. The website remembers them and sends them with the enquiry, so the lead arrives already tagged (for example Instagram / coastal-drains-nov). Unknown tags fall back to "website". The calculator inputs (diameter, tonnes of steel) are added to the lead's notes.
- **Prospects** (Leads tab → Growth → Prospects to contact). People and companies to approach before they enquire. Each has a drafted opener with no price. **Send opener on WhatsApp** opens the message for you to send, marks the prospect Contacted and sets the next action five days out. **Make a lead** turns an interested prospect into a lead. Due prospects show on Today.
- **Consultants.** A lead can record the consultant who specified or recommended GFRP, so Growth shows which consultants bring orders.
- **Steel vs GFRP calculator in the app.** Weight, length and saving for a diameter and steel quantity, with a WhatsApp share that has no price in it. The owner also gets a cost comparison from today's steel price (typed, never saved) and the rate card, clearly marked as indicative.

## Setting up your ad links
Add these to the end of the website address on every ad and post:

`?utm_source=instagram&utm_campaign=coastal-drains-nov`

- `utm_source`: instagram, facebook, whatsapp, indiamart or referral
- `utm_campaign`: any short name for the ad or post

## Tested against the real database (then test data deleted)
Eight leads across four sources, two orders, ₹15,000 spend: Instagram showed 3 leads, 1 order, ₹1,27,500, ₹4,000 per lead and ₹12,000 per order; referral ₹76,500; the consultant showed 2 leads and 2 orders. Sales saw sources but no spend and no cost section in the calculator. Prospect opener has no number or price, marks Contacted, and clears the Due flag. Calculator: 10 t of 12 mm steel is 11,250 m, 2.67 t of GFRP, 7.33 t (73%) saved; steel at ₹55/kg ₹5,50,000 against GFRP at your rate ₹2,86,875. Security advisor: no issues.

## Not in this slice
- **Automatic Lead Scout.** Finding NHAI and PWD awards, tenders and polyhouse subsidy lists every night needs an AI key and agreed data sources. For now the team adds prospects by hand from those lists.
- **Ad changes.** The app never changes ad audiences or budgets. It shows what each source produced so you can decide.
- **Automatic import of Meta lead forms** (needs Meta API access).
- Cost per lead is only as good as the spend you enter.
