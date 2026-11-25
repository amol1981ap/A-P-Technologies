# GFRP rebar sales funnel

Built around what already exists: the website (`website/`), the lead inbox, quotes, follow-up nudges and the Funnel view in the app. This document defines each stage, what the customer sees, what your team does, and the one number to watch.

**Who buys:** B2B only. Contractors, developers, consultants, government departments and dealers. Decisions take 10–15 days after a quote (already built into the app's follow-up cycle), and the specifier (consultant or authority engineer) often matters more than the buyer.

---

## Funnel at a glance

| # | Stage | Customer's question | Our asset | App status | Watch |
|---|---|---|---|---|---|
| 1 | Awareness | "Is there something better than steel here?" | Posts, ads, IndiaMART listing, referrals, site visits to consultants | `source` + `utm_campaign` on the lead | Enquiries per source |
| 2 | Interest | "Does this suit my project?" | Website: applications, steel-vs-GFRP calculator, FAQ | Website | Calculator use → enquiry rate |
| 3 | Enquiry | "Who do I talk to?" | Enquiry form + WhatsApp | Lead `new` | Enquiries / month |
| 4 | Qualify | "Is this lead real and sized right?" | 3-question call/WhatsApp, lead score | Lead `contacted`, hot/warm/cold score | % contacted in 1 day |
| 5 | Proof | "Will my engineer accept it?" | Test certificates, datasheet, reference project, design support | Attach to the lead | Proof sent per quote |
| 6 | Quote | "What does it cost delivered?" | PDF quotation from the app | Lead `quoted` | Quote within 24 h of qualifying |
| 7 | Follow-up | "I need to convince others / compare." | Day 3 / 7 / 12 nudges | Built in (`followups.ts`) | Follow-ups done on time |
| 8 | Order | "OK, how do we proceed?" | Order, advance terms, production slot | Lead `won` → order | Quote → order % |
| 9 | Repeat & refer | "Can I reorder / recommend you?" | Delivery proof, test certs with invoice, check-in | Orders, parties | Repeat customers |

---

## 1. Awareness: where leads come from

Pick two channels first, not nine. Recommended order for a Kolhapur-based manufacturer selling across India:

1. **Consultants and authority engineers.** Specification is the real gatekeeper. Visit or message 10 structural consultants and PWD / NHAI / municipal engineers a month with the datasheet and test certificate. One approved specification can feed many orders.
2. **Contractors on drainage, STP, culvert and coastal jobs.** Direct WhatsApp outreach, plus a referral ask after every delivery.
3. **IndiaMART / B2B listing.** Already a lead source in the app. Keep one listing per surface (ribbed, sand-coated).
4. **Instagram / Facebook / LinkedIn.** Short project-led content (below). Use `?utm_source=instagram&utm_campaign=...` on every link so the app's Funnel view shows which post produced which lead. The website already stores these.

**Content that works for this product** (each ends with the website or WhatsApp link):
- "Rust cracked this drain cover. Here is why" – corrosion in sewage, drains, coastal belt.
- "10 tonnes of steel vs the same length in GFRP" – use the calculator result as the visual.
- "Why GFRP bars are bent in the factory, not on site" – answers the commonest objection and shows expertise.
- Delivery and site-placement photos or short videos.
- A one-page "What to tell your structural engineer" explainer.

## 2. Interest: the website

Already in place and correct for this stage: hero, why GFRP, applications, sizes table, calculator, comparison, FAQ.

Changes worth making next (small, in this order):
1. **Add a second conversion option** beside "Get a quote": "Ask a question on WhatsApp" (pre-filled message). Many site engineers will not fill a form.
2. **Add "Request test certificates and datasheet"** as a low-commitment offer. It captures phone numbers from consultants who are not ready for a quote. Needs your real datasheet PDF first.
3. **One reference project** (photo, location, quantity, application) once you have permission. Nothing sells this product like a named job.
4. **Application sub-pages** (drainage, sewage/STP, highway, coastal) so ad links land on the page that matches the click. The same enquiry form, different headline.

Do not publish strength, life-span or code-compliance numbers that your test reports do not show.

## 3. Enquiry: capture

The form asks name, phone, role, project type, location, quantity and message, then saves to the lead inbox and opens WhatsApp. Keep it; the only rule is to keep it short. Phone is the one required field that matters.

**Service level:** every new enquiry gets a first reply within 2 working hours and no enquiry waits more than a day. The Funnel view already flags enquiries waiting over a day. This is the biggest early leak.

First-reply WhatsApp template:

> Hello {name}, thank you for your enquiry about GFRP rebars. To give you the right quotation, could you confirm: (1) the diameters and approximate quantity or drawings, (2) project type and site location, (3) the delivery timeline? I can also send our test certificates and a technical comparison. — A P Technologies

## 4. Qualify: score before you spend time

Ask these three, by call or WhatsApp:

1. **Is there a live project and when does concrete go in?** (Under 60 days = hot.)
2. **Who specifies the reinforcement?** Contractor alone, or consultant / authority approval needed? If approval is needed, go to Proof before Quote.
3. **Rough quantity and location.** Sets freight and whether it is worth a custom quote.

Treat as **hot**: live project, quantity known, decision-maker on the call. **Warm**: project planned, specification not settled. **Cold**: researching, no project. The app's lead score already uses this idea; update the lead after the call so the Funnel view stays honest.

## 5. Proof: remove the objection

The real objection is not price, it is "will it be approved?". Send before the quote when approval is needed:

- Test certificates and, if available, third-party lab reports.
- The datasheet (sizes, weights, properties from your own tests).
- The weight-and-size table, plus the reminder that bar size and spacing are designed by the structural engineer to FRP design codes.
- Offer a short call with their consultant.

> Hello {name}, attaching our test certificates and technical data for GFRP rebars. Happy to speak to your consultant directly about design and approval. — A P Technologies

## 6. Quote

Use the quotation PDF from the app, within 24 hours of qualifying, with delivered price, validity, lead time, test-certificate commitment and payment terms. Send it on WhatsApp with a one-line summary, then mark the lead quoted so the 3 / 7 / 12-day follow-up clock starts.

Quote message:

> Hello {name}, please find quotation {number} for {quantity} of {surface} GFRP rebar, delivered to {location}. Valid until {date}, lead time {days} days. Test certificates come with every supply. I'm available if you'd like to go through it with your engineer. — A P Technologies

## 7. Follow-up (already automated as nudges)

The app prompts day 3, day 7 and day 12 after a quote is sent, and turns the quote red past day 15. Keep to the cycle:

- **Day 3:** confirm receipt, offer certificates.
- **Day 7:** offer to revise specification or quantity.
- **Day 12:** state validity and ask for a yes/no.
- **After 15 days:** call once, then mark lost with a reason, or park as warm and re-contact in 60 days.

Add a call between day 7 and day 12 for any quote over your usual size. Decision-makers answer calls more than messages.

## 8. Order

Close with a simple next step: confirm sizes and bending schedule, advance or payment terms, and a production and dispatch date. Create the order in the app so production, despatch and invoicing follow from it. Ask for the site contact and delivery address in the same message.

## 9. Repeat and refer

- Dispatch photo and test certificate with every delivery.
- Check-in 7 days after delivery: "How was placement? Anything we can improve?"
- Ask for a referral and, with permission, a site photo for the website.
- Re-contact past customers when you launch a new size or surface.

---

## What to measure (all visible in the app's Funnel and Growth views)

| Metric | Healthy early target | If it is low |
|---|---|---|
| Enquiries contacted within 1 day | 90%+ | Add an owner for first reply; turn on notifications |
| Contacted → quoted | 50%+ | Qualification is too loose, or quoting is slow |
| Quoted → ordered | 15–25% for a new product | Proof and follow-up are the usual fix, not price |
| Follow-ups done on schedule | 90%+ | Check the due list in Leads daily |
| Cost per lead by source | Compare, then move spend | Cut the source with leads but no quotes |

These targets are starting guesses for a new B2B product. Replace them with your own numbers after 60–90 days of data.

## 30-day launch plan

**Week 1:** Confirm go-live checklist items. Collect datasheet and test certificates into one folder. Save the four WhatsApp templates (first reply, proof, quote, follow-up). Add `utm_` links to every profile and listing.
**Week 2:** Add the WhatsApp-question button and certificate-request offer to the site. Send datasheet to 20 consultants and engineers.
**Week 3:** Publish three content pieces (corrosion, calculator, factory bending). Contact 30 contractors on live drainage, STP or culvert jobs.
**Week 4:** Review the Funnel view. Find the biggest drop-off and fix that one stage only. Ask each new buyer for a referral.

## What I need from you to finish the website pieces

- The datasheet PDF and test certificates (for the certificate-request offer).
- One reference project with photos and permission to publish.
- Whether you want separate pages per application (drainage, sewage, highway, coastal) for ads.

---

## Built on the website (live once the branch is published)

| Stage | What is now on the site |
|---|---|
| Awareness → landing | `?use=drainage`, `sewage`, `highway`, `coastal`, `flooring` changes the headline, intro and preselected project type. Use these links in ads and posts, with `utm_source` and `utm_campaign`. Example: `/?use=drainage&utm_source=instagram&utm_campaign=drain-nov` |
| Trust | Strip under the hero (made in Kolhapur, test certificate with supply, GST registered, delivery across India) and a site-photo section |
| Interest | Calculator result carries into the quote form |
| Low-commitment capture | Data sheet is gated by name, phone and role. It lands in the lead inbox with the note "Requested the data sheet" and downloads straight away |
| Question | "Ask on WhatsApp" button (pre-filled, mentions the project type) in the hero and a sticky bar on phones |
| Enquiry | Quote form, then a thank-you panel that says what happens next |

The data sheet link is gated on the page, but the PDF file itself is a public URL.

**Deploy note:** `supabase/functions/public-enquiry` now merges a repeat enquiry from the same phone within a day into the existing lead (before, it was dropped). Deploy that function so a data sheet request followed by a quote request keeps the quote details.

**Next stage: a person.** The funnel only works if every data-sheet and quote lead gets a call within two working hours. Use the first-reply, proof, quote and follow-up messages above.
