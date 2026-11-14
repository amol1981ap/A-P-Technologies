# Phase 1: Leads and Quotes

## What it does
- **Lead inbox** (Leads tab → Leads): every enquiry in one list, scored Hot / Warm / Cold by rules (buyer type + project + place + quantity; students and researchers go Cold). Filters: Open, Hot, Warm, Cold, Closed.
- **Website enquiries land here automatically.** The website form posts to the `public-enquiry` function, which scores the lead, ignores duplicates (same phone within a day) and bots, then also opens WhatsApp for the visitor.
- **Add or edit a lead** from phone calls, Instagram, WhatsApp, walk-ins. Call and WhatsApp buttons on every lead.
- **Quote builder** (Leads tab → Quotes, or Create quote from a lead):
  1. Salesperson or owner adds items (diameter + surface + metres).
  2. **Only the owner can enter the rate and GST.** The rate card pre-fills each line. The database refuses a rate from anyone else.
  3. A quote cannot be sent until every line has a rate and GST (enforced in the database).
  4. Send quote creates a PDF (items, totals, weight comparison against steel, terms, bank details) and opens the share sheet. On a laptop it opens the print dialog.
- **Follow-ups:** day 3, 7 and 12 after sending. Each nudge opens WhatsApp with a prepared message that contains no price. The message is sent only when you tap send. Past day 15 the quote is flagged.
- **Outcome:** Customer accepted marks the lead Won; Not taken needs a reason and marks it Lost.
- **Today screen** is now live: quotes out with customers, new leads, open quotes, follow-ups due, and a Needs you list (add your rate, send quote, follow up, new or hot lead).

## Tested against the real database (then all test data deleted)
- Sales signs in, sees the website lead (Hot), creates a quote, adds items, sees "Waiting for owner's rate", cannot send, cannot see rate fields.
- Owner signs in, sees "Add your rate", rates pre-filled from the rate card, totals correct (₹2,80,000 + 18% GST = ₹3,30,400), sends the quote.
- Backdated send date: Today shows "Follow up · day 3"; the follow-up opens WhatsApp and is marked done; Customer accepted closes the quote.
- Database rules: sales cannot send an empty or unpriced quote, cannot set a rate or GST, and sees no rate card rows.
- Security advisor: no issues.

## Limits to know
- Lead scoring uses rules, not AI. Smarter scoring and first replies need an AI key and come later.
- Quote numbers are Q-0001, Q-0002… (one series, not per financial year).
- Taxes on a quote show GST as one line. The CGST / SGST / IGST split arrives with invoices in Phase 4.
- To quote an existing customer, add a lead for them first.
- The weight comparison uses d²/162 for steel and about 2,100 kg/m³ for GFRP. It is labelled indicative. Replace the GFRP density with your tested value when you have the certificate.
