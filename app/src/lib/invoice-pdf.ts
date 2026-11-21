import { formatDate, formatInr, formatNum } from './calc';
import type { CompanySettings, Despatch, Invoice, InvoiceItem, Order, Party } from './database.types';
import { rupeesInWords } from './gst';

const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl = (s: string | null | undefined) => esc(s).replace(/\n/g, '<br>');

export function invoiceHtml(a: { company: CompanySettings; party: Party | null; invoice: Invoice; items: InvoiceItem[]; order: Order | null; despatch: Despatch | null; terms: string | null }) {
  const { company: c, party: p, invoice: v, items, order, despatch } = a;
  const inter = v.is_interstate;
  const cancelled = v.status === 'cancelled';

  const rows = items
    .map((i, n) => {
      const taxCells = inter
        ? `<td class="r">${i.gst_percent}%</td><td class="r">${formatInr(i.igst)}</td>`
        : `<td class="r">${i.gst_percent / 2}%</td><td class="r">${formatInr(i.cgst)}</td><td class="r">${i.gst_percent / 2}%</td><td class="r">${formatInr(i.sgst)}</td>`;
      return `<tr><td>${n + 1}</td><td>${esc(i.description)}</td><td>${esc(i.hsn_code)}</td><td class="r">${formatNum(i.kg, 3)}</td><td class="r">${formatInr(i.rate_per_kg)}</td><td class="r">${formatInr(i.taxable)}</td>${taxCells}</tr>`;
    })
    .join('');
  const taxHead = inter ? '<th class="r">IGST %</th><th class="r">IGST</th>' : '<th class="r">CGST %</th><th class="r">CGST</th><th class="r">SGST %</th><th class="r">SGST</th>';

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1E242B;margin:0;padding:32px;font-size:12px;line-height:1.5;position:relative}
  h1{font-size:22px;margin:0 0 2px} h2{font-size:11px;margin:18px 0 6px;letter-spacing:.06em;text-transform:uppercase;color:#5B636B}
  .top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #1F5C46;padding-bottom:12px}
  .muted{color:#5B636B} .r{text-align:right} .right{text-align:right;white-space:nowrap}
  .two{display:flex;gap:24px} .two>div{flex:1}
  table{width:100%;border-collapse:collapse} th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#5B636B;text-align:left;padding:7px 4px;border-bottom:1px solid #D9D4CB}
  th.r{text-align:right} td{padding:8px 4px;border-bottom:1px solid #EFEDE8;vertical-align:top}
  .sum{width:300px;margin-left:auto;margin-top:10px} .sum td{border:0;padding:3px 4px} .sum .tot td{font-weight:700;font-size:15px;border-top:2px solid #1F5C46;padding-top:7px}
  .box{background:#F6F2EC;border-radius:8px;padding:10px 12px} .note{font-size:10px;color:#5B636B}
  .stamp{position:absolute;top:150px;right:40px;border:3px solid #A4532D;color:#A4532D;font-size:26px;font-weight:700;padding:4px 14px;transform:rotate(-12deg);opacity:.7}
</style></head><body>
  ${cancelled ? '<div class="stamp">CANCELLED</div>' : ''}
  <div class="top">
    <div><h1>${esc(c.name)}</h1>
      ${c.office_address ? `<div class="muted"><strong>Office:</strong> ${esc(c.office_address)}</div>` : ''}
      ${c.works_address ? `<div class="muted"><strong>Works:</strong> ${esc(c.works_address)}</div>` : ''}
      <div class="muted">${[c.phone && `Phone ${esc(c.phone)}`, c.email && esc(c.email)].filter(Boolean).join(' · ')}</div>
      ${c.gstin ? `<div><strong>GSTIN ${esc(c.gstin)}</strong></div>` : ''}</div>
    <div class="right"><div style="font-size:20px;font-weight:700">TAX INVOICE</div>
      <div><strong>${esc(v.number)}</strong></div><div class="muted">Date ${formatDate(v.invoice_date)}</div>
      ${v.due_date ? `<div class="muted">Due ${formatDate(v.due_date)}</div>` : ''}</div>
  </div>

  <div class="two" style="margin-top:12px">
    <div><h2>Bill to</h2><div><strong>${esc(p?.name)}</strong></div>
      <div class="muted">${nl([p?.address, [p?.city, p?.state].filter(Boolean).join(', ')].filter(Boolean).join('\n'))}</div>
      ${p?.gstin ? `<div>GSTIN ${esc(p.gstin)}</div>` : '<div class="muted">GSTIN: unregistered</div>'}</div>
    <div><h2>Delivery</h2>
      ${order?.site_address ? `<div class="muted">${nl(order.site_address)}</div>` : ''}
      ${order?.po_number ? `<div>PO no: ${esc(order.po_number)}</div>` : ''}
      ${despatch?.vehicle_no ? `<div>Vehicle: ${esc(despatch.vehicle_no)}</div>` : ''}
      ${v.eway_bill_no ? `<div>E-way bill: ${esc(v.eway_bill_no)}</div>` : ''}
      ${v.place_of_supply ? `<div class="muted">Place of supply: ${esc(v.place_of_supply)}</div>` : ''}</div>
  </div>

  <h2>Items</h2>
  <table><thead><tr><th>#</th><th>Description</th><th>HSN</th><th class="r">Qty (kg)</th><th class="r">Rate / kg</th><th class="r">Taxable</th>${taxHead}</tr></thead><tbody>${rows}</tbody></table>
  <table class="sum">
    <tr><td>Taxable value</td><td class="r">${formatInr(v.taxable_value)}</td></tr>
    ${inter ? `<tr><td>IGST</td><td class="r">${formatInr(v.igst)}</td></tr>` : `<tr><td>CGST</td><td class="r">${formatInr(v.cgst)}</td></tr><tr><td>SGST</td><td class="r">${formatInr(v.sgst)}</td></tr>`}
    ${v.round_off ? `<tr><td>Round off</td><td class="r">${v.round_off > 0 ? '+' : ''}${v.round_off.toFixed(2)}</td></tr>` : ''}
    <tr class="tot"><td>Total</td><td class="r">${formatInr(v.total)}</td></tr>
  </table>
  <div style="margin-top:8px"><strong>Amount in words:</strong> ${esc(rupeesInWords(v.total))}</div>

  ${c.bank_name || c.bank_account ? `<h2>Bank details</h2><div>${esc(c.bank_name)} · A/c ${esc(c.bank_account)} · IFSC ${esc(c.bank_ifsc)}</div>` : ''}
  ${a.terms ? `<h2>Terms</h2><div class="box">${nl(a.terms)}</div>` : ''}
  <div class="note" style="margin-top:12px">Reverse charge: No. Certified that the particulars given above are true and correct. Please quote the invoice number when paying.</div>
  <div class="right" style="margin-top:28px">For <strong>${esc(c.name)}</strong><br><br><br>Authorised signatory</div>
</body></html>`;
}
