# Phase 2: Orders, despatch, factory (first slice)

## What it does
- **Order from an accepted quote (owner only).** On the accepted quote the owner enters the customer's PO number, delivery address and due date. Creating the order confirms the PO matches the quote. Lines and approved rates are copied across.
- **Orders tab:** five-stage strip (New → In production → Ready → Dispatched → Delivered), order cards with metres ordered and sent, value (owner and sales only), and a "past due date" flag. The owner moves an order between New, In production and Ready. Dispatched and Delivered happen automatically from despatches.
- **Release despatch (owner):** metres per line, a batch number pre-filled from the latest production batch, a warning when stock is short (release is still allowed), and a despatch person to deliver. Partial despatches are supported.
- **Despatch slip (despatch person):** customer, delivery address with Call, WhatsApp and Map buttons, the load with batch numbers, vehicle number, **photo of the signed challan**, Mark loaded, Mark delivered. Delivery is blocked until the vehicle number and photo are in. The despatch person never sees prices.
- **Order becomes Delivered automatically** when every despatch is delivered and the full ordered quantity has gone out.
- **Factory tab:** today's production, month total, scrap %, **finished stock per diameter and surface** (produced minus despatched, with a reorder tick), raw material stock with days left, and Receive material.
- **Daily production entry:** diameter and surface, good and scrap metres, resin and roving used. The **batch number is automatic**: date + diameter + surface (for example 261114-12S). Resin and roving are deducted from raw material stock.
- **Today screens are live for every role:** the despatch person sees slips to deliver, the factory sees whether production is entered and what is running low, and the owner also sees Release despatch, Low stock and raw-material alerts.
- Products have a **reorder level** (More › Products & rates).

## Tested against the real database (then test data deleted)
Factory enters production → owner opens the order, sees "9,000 m in stock / short by 4,000 m", releases a despatch with batch 261114-12S → despatch person signs in by mobile number, sees the slip, is blocked without a photo, marks loaded, uploads the photo, marks delivered → order turns Delivered, 12 mm stock = 9,000 − 8,000 = 1,000 m, resin 600 → 400 kg, roving 3,000 → 2,300 kg. The despatch person cannot see rates; the factory person has no Leads or Money tabs. Security advisor: no issues.

## Fixed during testing
- The release form picked no despatch person and no batch because lists loaded after the form appeared. Defaults are now worked out at display time.
- Back from a deep screen returned to the Today tab. Each section now starts from its own list.

## Not in this slice (Phase 2b)
- Supplier purchase orders and supplier rates, and **margin per order** (needs landed cost).
- **Test certificate per despatch** (needs your certificate format and test values).
- Staff task list with due dates and photo proof.
- Stock can go negative when a despatch is released ahead of production; it is shown, not blocked.
- Stage "In production" and "Ready" are set by the owner by hand.
