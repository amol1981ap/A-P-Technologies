# Control Centre: Revised Phase Plan (Stage 2)
*Based on the AI Systems Blueprint (BOA-2026-APT-01 Rev A) and the first master plan.*

> **Scope update (12 Nov 2026):** Control Centre v1 covers **GFRP rebars only** (manufacturing + trading).
> CFRP repair will be built later as a **separate system**. Phase 5 (CFRP Education Engine) and the CFRP job card move out of this plan.
> GFRP profiles are also out of v1. Product filters are now by **diameter and surface** (ribbed / sand-coated), not by product line.

---

## 1. What the blueprint tells us (and what changes)

| Fact from blueprint | Effect on the plan |
|---|---|
| **3 people:** Amol (owner), 1 despatch person, 1 applicator | The first plan was sized for a factory with departments. Control Centre must be sized for **one owner and two field staff**, and grow later. |
| **Trading business** (my first brief said manufacturing + trading) | Production lines, shift logs and batch QC move to a **later, optional module**. Stock, supplier purchase and delivery come in now. |
| **3 product lines, not 1:** GFRP rebar (NHAI/infra, RCC trimix flooring, warehouses) · GFRP profiles (polyhouse/greenhouse farmers) · CFRP repair (societies, trusts, schools, bridges) | Every lead, quote, order and report is tagged by product line. CFRP is a different business, sold through education and site work, and needs its own pipeline. |
| **2 leads / 10 quotes / 1 order a month, ~₹5 L order, 10–15 day cycle, 5% repeat** | The **biggest constraint is demand, not paperwork.** Saving hours on 1 invoice a month is small. Doubling real leads doubles the business. |
| Amol does every quote, price, follow-up, despatch instruction, reminder and GST task | The owner's phone is the main screen. The two staff get very simple task screens. |
| **Guardrails:** only Amol sets prices, rate card, discounts; every payment reminder is approved by him; nothing files GST or pays vendors automatically | These are built into the system as hard rules, not settings. |
| Languages: English, Marathi, Hindi | Customer messages are drafted in the customer's language. |

### The numbers need settling first
The blueprint itself flags this: 2 leads cannot produce 10 quotes, and "0 out of 100 quotes" does not match 1 order from 10. Control Centre will produce the **true numbers automatically** within 4–6 weeks of use. Until then, every saving estimate is a guess.

---

## 2. Review of the blueprint

### What is right and we keep
1. **The quote skill is the first build.** It's easy, used every week, and everything downstream reads from the quote.
2. **One shared record (F-00)** under every system.
3. **Owner approval on money:** price, discount, reminders, GST and vendor payments.
4. **CFRP sold through education:** explainer, readiness form, drip, pipeline.
5. Despatch moves on a **slip/photo, not a phone call.**
6. The evening Munshi report and the 9 AM morning brief.

### What I would change
| # | Gap in the blueprint | Revision |
|---|---|---|
| 1 | It is **15 separate pieces** (skills, micro-apps, agents, boards). Three people would live across many tools and chats. | Build them as **one app, Control Centre**, with one database, one login and one home screen. The "systems" become features inside it. |
| 2 | **Demand comes too late.** Lead Scout is pushed past week 12, yet 2 leads a month is the real ceiling. | Bring the **Demand Engine forward to Phase 3**: Lead Scout (lite), Steel→GFRP savings calculator on the website, ad-source tracking, consultant/contractor prospect list. |
| 3 | The shared record is described as a sheet or row. | Use a **proper database** (Supabase/Postgres) from day one. A sheet will break once AI, WhatsApp and three users write to it. |
| 4 | **No stock or purchase side.** As a trader, A P Technologies buys from manufacturers. | Add a **simple stock and supplier PO** module: stock by diameter/length, supplier rates, landed cost, **margin per order**. |
| 5 | **Team accountability is thin.** The despatch person and applicator only receive slips. | Give each of them a **job card**: task, due date, done with photo proof, site expenses. Owner sees what's pending without calling. |
| 6 | **CFRP job execution is missing** (materials, site checklist, before/after photos, completion sign-off). | Add a **CFRP job card** for the applicator, which also feeds the case-study library and the feedback form. |
| 7 | **Infra/NHAI selling** (consultant approval, contractor follow-up, tenders) is only touched by Lead Scout. | Add **influencers** (consultants, PMCs, engineers) to leads/projects, and a light tender list. |
| 8 | **Invoicing and GST are hand-built.** | Keep the invoice in the CA's accounting software (Tally/Vyapar/Zoho) or make sure ours is GST-compliant. Control Centre drafts and syncs, and the CA confirms the format. |
| 9 | The **12-month column is blank.** | The roadmap now runs to month 12 and includes team growth and native app store release. |
| 10 | WhatsApp, Meta and Instagram integrations are assumed. | Plan for the **WhatsApp Business API** (paid per conversation) and Meta Lead Ads API access from Phase 1. |

---

## 3. Revised phases

```
 P0 Foundation ─► P1 Leads + Quotes ─► P2 Order→Despatch + Team ─► P3 Demand Engine ─► P4 Money ─► P5 CFRP Engine ─► P6 AI Employees ─► P7 Scale
   wk 1–2           wk 3–6               wk 6–9                    wk 9–13            wk 12–15     wk 15–19         month 5–6          month 7–12
```

### Phase 0: Foundation (weeks 1–2)
**Goal:** one app, one database, ready to receive real data.
- App shell for Android, iPhone and web, with logins for Amol, the despatch person and the applicator (each sees only their screens)
- Masters: products (rebar / profile / CFRP, with SKUs by diameter and length), **rate card editable only by Amol**, parties (customers, consultants, suppliers), HSN codes
- The shared record: Lead → Quote → Order → Despatch → Invoice → Payment, every row tagged by product line and source
- **Amol provides:** rate card, TMT→GFRP logic, quotation format & terms, code references, HSN codes confirmed by the CA

### Phase 1: Leads + Quotes (weeks 3–6)
*Blueprint F-00, SYS-01, SYS-02 merged*
- **Lead inbox:** every Meta, Instagram, WhatsApp, website and phone enquiry lands in one list. AI scores it hot/warm/cold, tags the product line and drafts a first reply in English, Marathi or Hindi.
- **Quote & Spec builder:** AI drafts the quotation and the one-page TMT vs GFRP comparison and stops at the price line. Amol fills or confirms the price, and a PDF goes out on WhatsApp.
- **Follow-up nudges** on day 3, 7 and 12, each with a one-tap approval. Quotes past day 15 turn red.
- **Owner "Today" screen** on mobile: new leads, quotes waiting for a price, follow-ups due.
- **Done when:** every enquiry of the month is in the app and every quote was drafted by the system.

### Phase 2: Order → Despatch + Team accountability (weeks 6–9)
*Blueprint SYS-03, plus new modules*
- PO matched to quote by Amol, then a **despatch slip** on the despatch person's phone
- Despatch status: PO received → material ready → vehicle booked → delivered (photo of the delivery proof)
- **Applicator job card** for CFRP/site work: checklist, before/after photos, expenses, completion
- **Simple stock and supplier PO:** stock by item, reorder alert, supplier rate, **margin per order**
- **Task list for the two staff:** every task has an owner, a due date and photo proof. Overdue tasks alert Amol.
- **Done when:** a full month of orders moved without a single "despatch details" phone call.

### Phase 3: Demand Engine (weeks 9–13), moved up from the blueprint's week 12+
- **Steel → GFRP savings calculator** on the website and inside the app. Visitors become leads.
- **Lead source tracking:** which ad, post or referral produced quotes and orders, with cost per real lead
- **Lead Scout (lite):** a weekly list of NHAI/PWD awards, warehouse and industrial park projects, polyhouse subsidy beneficiaries and trimix contractors, each with a drafted opening message for Amol's one-tap send
- **Influencer list:** consultants, PMCs, engineers and the projects they influence
- **Product Lead Board** (SYS-04): three columns by product line, showing leads → quotes → orders → despatch
- **Done when:** leads per month are measured by source, and the Scout list is producing calls each week.

### Phase 4: Money (weeks 12–15)
*Blueprint SYS-05, SYS-06, Munshi skill*
- Invoice drafted from the despatch note at the quoted price. Amol taps issue (or it syncs to the CA's software).
- **Bakaya ledger** with age bands, part payments and receipts
- **Payment reminder flow:** 3 days before due and when overdue. Drafted in Amol's tone, sent only after his tap.
- Vendor bills photographed for input credit. **Monthly GST working sheet** in the CA's layout.
- **Done when:** every despatch has an invoice, every open invoice shows its days outstanding, and the CA stops calling for data.

### Phase 5: CFRP Education Engine (weeks 15–19)
*Blueprint SYS-07, SYS-08, CFRP Pipeline Board*
- **CFRP Repair Explainer** written once in plain words, by building type
- **Readiness form** with photos: AI grades each case as ready for visit, needs audit first, or educate and wait
- **Education drip** with no price in it: explainers, before/after cases, and a booking slot from Amol's calendar
- **CFRP pipeline board:** enquiry → educated → presentation → site visit → proposal → order → work → feedback
- **Done when:** a month passes with every CFRP enquiry educated and graded without Amol picking up the phone.

### Phase 6: AI Employees (months 5–6)
*Blueprint "scoping call" agents*
- **Morning brief (9 AM)** and **Munshi evening report:** cash in, bakaya, GST status, items needing sign-off
- **Repair Counsellor:** answers CFRP questions at any hour within the price band Amol has fixed
- **Lead Scout (full):** nightly research, plus ad audience suggestions for Amol's approval
- Android and iOS apps released to the Play Store and App Store

### Phase 7: Scale (months 7–12)
- **Team module** as people are hired: roles, KRAs, scorecards, daily report (from the first plan)
- Dealer/channel management for rebar and profiles
- **Manufacturing module** (production plan, shift log, batch QC, test certificates) if and when A P Technologies starts manufacturing
- Business review dashboard: monthly P&L by product line, pipeline and cash forecast

---

## 4. Guardrails built into the system
| AI does alone | AI drafts, Amol taps | Never automated |
|---|---|---|
| Capture and score leads, first reply using the fixed rate card only, find prospects, education drip without prices, reminders to staff | Every quotation price, follow-ups carrying a price, payment reminders, invoices, ad audience and budget changes, CFRP proposals | Changing a price, rate card or discount · filing GST · paying vendors · final CFRP scope after a site visit |

---

## 5. Decisions recorded (12 Nov 2026) and their effect

| Answer | Change to the plan |
|---|---|
| **Trading and manufacturing** | Manufacturing is planned, not optional. **Phase 2 adds Manufacturing Lite:** raw material stock (roving, resin, sand), a daily production entry (metres by diameter, scrap), a batch number on every bundle, and a test certificate on every despatch. Full production planning and costing per metre come in Phase 7. |
| **Start-up, up to ₹5 L a month** | Keep every screen minimal. The Demand Engine (Phase 3) matters most for growth. Run costs stay near zero until volume grows. |
| **No accounting software** | Control Centre itself issues the **GST tax invoice** in Phase 4: numbering, GSTIN, HSN, CGST/SGST/IGST, e-way bill data. It also produces the monthly GSTR-1/3B working sheet for the CA, who confirms the format. |
| **Own WhatsApp number, no automation** | Phases 1–5 use **"tap to send"**: the app prepares the message and PDF and opens WhatsApp on Amol's phone with it filled in. There's no API cost, and every message is sent by Amol. The WhatsApp Business API is considered in Phase 6, on a separate number. |
| **No website. Build one for GFRP rebars.** | **Done in Phase 0:** `website/`, a one-page site with a steel-vs-GFRP weight calculator and a WhatsApp enquiry form. In Phase 1 the form also writes into the Control Centre lead inbox. |

## 6. Open items from Amol
- WhatsApp number, address and GSTIN for the website (`website/config.js` and footer)
- Domain name (e.g. aptechnologies.in) for hosting the site
- Diameters and standard lengths actually offered (currently 8–24 mm, 6 m / 12 m)
- Rate card, TMT→GFRP logic, quotation format
- Product photos and test certificate (to add to the site)

## 7. Decisions needed from Amol (answered above)
1. **Trading only, or manufacturing too?** This decides whether the manufacturing module is planned or optional.
2. **Correct numbers:** leads, quotes and orders per month, and revenue split by product line.
3. **Accounting software** used by the CA (Tally / Vyapar / Zoho / none).
4. **WhatsApp:** a separate business number for the API, or the current one?
5. The **rate card, TMT→GFRP logic, quote format** and the **CFRP indicative price band**, all written down once.
6. Is a **website** already live (for the calculator and lead capture)?
