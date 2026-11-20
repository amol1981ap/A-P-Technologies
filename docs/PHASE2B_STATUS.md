# Phase 2b — Purchasing, margin, test certificates, tasks

**Done and tested against the live database** (test data removed afterwards).

## What it does
- **Purchase orders** (owner, More › Factory): place a PO to a supplier (PO-0001…), receive goods only once the supplier bill number is entered; receipt adds stock automatically; bill is then frozen.
- **Material cost**: weighted-average rate per raw material, from received POs.
- **Margin per order** (owner only): sale value minus estimated material cost minus "Other cost per metre" (More › Company details). Hardener/sand are not counted unless included in that overhead figure.
- **Batch tests + test certificate**: factory records tensile strength, glass content etc. per batch; despatch screen shares a PDF certificate for every batch on the load (says plainly if a batch has no test).
- **Tasks with photo proof**: owner assigns; assignee can only mark done and attach a photo; overdue tasks show on the owner's Today.
- **GST sheet** now shows input GST from received POs, net GST payable or credit to carry forward, and a purchase register in the CSV.

## Checked
PO receive blocked without bill no; CGST/SGST maths; stock and average cost; margin (sale ₹2,04,000, cost ₹1,07,120, margin 47%); task photo flow; certificate; factory user cannot see POs/Money/Leads. Security advisor: no issues.

## Still open (yours)
- Reconnect GitHub (pushes return 403) — all work is committed locally.
- Set `SETUP_CODE` secret and build first APK (PHASE0_NEXT_STEPS.md).
- Fill More › Company details (phone, bank, terms, other cost per metre).
- Delete leftover test photos in Storage buckets `delivery-proofs` and `task-proofs`.
- CA to confirm HSN, GST rates, invoice format, and that input credit is claimable.
