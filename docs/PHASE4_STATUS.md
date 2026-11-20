# Phase 4: Money (first slice)

## What it does
- **GST tax invoice from a despatch (owner only).** Money tab → To invoice → Invoice. Lines are what was despatched, at the rates on the order. The invoice carries your GSTIN, office and works addresses, the buyer's GSTIN, HSN, PO number, vehicle, e-way bill, amount in words, bank details and payment terms.
- **CGST and SGST inside Maharashtra, IGST for another state.** Worked out from the buyer's GSTIN (or state if there is no GSTIN) and shown for you to confirm or change.
- **Automatic numbering by financial year:** APT/26-27/0001, 0002… The series restarts each April. Numbers never repeat or skip, and are given by the database when the invoice is issued.
- **An issued invoice cannot be edited**, only cancelled (and not once a payment is recorded). Only the e-way bill number and reminder tracking can change. This is enforced in the database.
- **Payments:** amount, date, mode (bank transfer, UPI, cheque, cash) and reference. Part payments are supported. The database refuses a payment above the balance, or on a draft or cancelled invoice. A WhatsApp receipt message is offered after each payment.
- **Bakaya:** total outstanding, overdue, ageing by band (not due, 1–30, 31–60, 61–90, over 90 days late), and who owes you with their oldest days late.
- **Payment reminders you approve:** one comes up 3 days before the due date, and again every 5 days once overdue. The message is shown in full, opens in WhatsApp, and goes only when you tap send. Today shows them in Needs you.
- **Invoice PDF**, shared through the phone's share sheet or printed on a laptop.
- **GST sheet for your CA:** pick a month, see the sales register, tax totals and an HSN summary, and share it as a CSV.

## Tested against the real database (then test data deleted)
Two despatches to a Maharashtra buyer and a Karnataka buyer. The Karnataka invoice got IGST ₹50,400, the Maharashtra invoice CGST ₹25,200 plus SGST ₹25,200, both ₹3,30,400. An overpayment was refused, a part payment recorded, and the balance fell to ₹2,30,400. A backdated invoice showed 20 days late, appeared under Time to remind, and the reminder text was correct. The GST sheet showed ₹5,60,000 taxable, ₹1,00,800 output tax, and the CSV downloaded with the register and HSN summary. Database rules tested directly: number series across financial years, frozen invoices, payment limits. Security advisor: no issues.

## Fixed during testing
The invoice screen counted overdue days from the clock time and showed 21 where the list showed 20. Both now count whole calendar days.

## Needs your CA before first use
- Confirm the **HSN code and GST rate** for GFRP rebar, and that GST is charged as set on each order.
- Confirm the **invoice number format** (APT/26-27/0001).
- Confirm **place of supply** handling for deliveries to a site in another state.
- E-way bill: needed above ₹50,000. The app records the number but does not generate it. Generate it on the government portal.

## Not in this slice
- Credit notes and debit notes. A cancelled invoice keeps its number.
- **Purchase invoices and input tax credit** (supplier bills). The GST sheet shows output tax only.
- E-invoicing (IRN and QR code), needed only above the turnover limit the CA confirms.
- Automatic bank statement matching. Payments are entered by hand.
- Filing returns or paying GST. The app never does either.
